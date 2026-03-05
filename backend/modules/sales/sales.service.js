const pool = require('../../db');

let customerNameColumnExists = null;

async function hasCustomerNameColumn(client = pool) {
  if (customerNameColumnExists !== null) {
    return customerNameColumnExists;
  }

  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'pharmacy_sale'
       AND column_name = 'customer_name'
     LIMIT 1`
  );

  customerNameColumnExists = result.rows.length > 0;
  return customerNameColumnExists;
}

async function getSalesList({ includeAll = false } = {}) {
  const limitClause = includeAll ? '' : 'LIMIT 50';
  const supportsCustomerName = await hasCustomerNameColumn();
  const customerNameSelect = supportsCustomerName
    ? `COALESCE(NULLIF(TRIM(s.customer_name), ''), 'Walk-in Customer')`
    : `'Walk-in Customer'`;

  const result = await pool.query(`
      SELECT 
        s.sale_id as id,
        'INV-' || s.sale_id::text as "invoiceId",
        s.sale_date as "date",
        s.total_amount as total,
        ${customerNameSelect} as "customerName",
        s.payment_method as "paymentMethod",
        COUNT(si.item_id) as items
      FROM PHARMACY_SALE s
      LEFT JOIN PHARMACY_SALE_ITEM si ON s.sale_id = si.sale_id
      GROUP BY s.sale_id
      ORDER BY s.sale_date DESC
      ${limitClause}
    `);

  return result.rows;
}

async function getSaleDetailsById(id) {
  const supportsCustomerName = await hasCustomerNameColumn();
  const sale = await pool.query(
    supportsCustomerName
      ? `SELECT sale_id, prescription_id, sale_date, total_amount, payment_method,
             COALESCE(NULLIF(TRIM(customer_name), ''), 'Walk-in Customer') as customer_name
           FROM PHARMACY_SALE
           WHERE sale_id = $1`
      : `SELECT sale_id, prescription_id, sale_date, total_amount, payment_method,
             'Walk-in Customer' as customer_name
           FROM PHARMACY_SALE
           WHERE sale_id = $1`,
    [id]
  );

  if (sale.rows.length === 0) {
    return null;
  }

  const items = await pool.query(
    `SELECT si.*, m.name as "medicineName", mb.batch_number
     FROM PHARMACY_SALE_ITEM si
     JOIN MEDICINE m ON si.medicine_id = m.medicine_id
     LEFT JOIN MEDICINE_BATCH mb ON si.batch_id = mb.batch_id
     WHERE si.sale_id = $1`,
    [id]
  );

  return {
    ...sale.rows[0],
    items: items.rows,
  };
}

async function createSale({
  prescriptionId,
  items,
  paymentMethod,
  totalAmount,
  customerName,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const supportsCustomerName = await hasCustomerNameColumn(client);
    const normalizedCustomerName = String(customerName || '').trim() || 'Walk-in Customer';

    const saleResult = supportsCustomerName
      ? await client.query(
          `INSERT INTO PHARMACY_SALE (prescription_id, sale_date, payment_method, total_amount, customer_name)
           VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4)
           RETURNING *`,
          [prescriptionId, paymentMethod, totalAmount, normalizedCustomerName]
        )
      : await client.query(
          `INSERT INTO PHARMACY_SALE (prescription_id, sale_date, payment_method, total_amount)
           VALUES ($1, CURRENT_TIMESTAMP, $2, $3)
           RETURNING *`,
          [prescriptionId, paymentMethod, totalAmount]
        );

    const saleId = saleResult.rows[0].sale_id;

    for (const item of items) {
      await client.query(
        `INSERT INTO PHARMACY_SALE_ITEM (sale_id, medicine_id, batch_id, quantity, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [saleId, item.medicineId, item.batchId, item.quantity, item.price]
      );

      const stockUpdate = await client.query(
        `UPDATE MEDICINE_BATCH
         SET quantity_available = quantity_available - $1
         WHERE batch_id = $2
           AND medicine_id = $3
           AND quantity_available >= $1
         RETURNING batch_id`,
        [item.quantity, item.batchId, item.medicineId]
      );

      if (stockUpdate.rows.length === 0) {
        const stockError = new Error(`Insufficient stock or invalid batch for medicine ${item.medicineId}`);
        stockError.statusCode = 400;
        throw stockError;
      }
    }

    if (prescriptionId) {
      await client.query(
        'UPDATE PRESCRIPTION SET status = $1 WHERE prescription_id = $2',
        ['fulfilled', prescriptionId]
      );
    }

    await client.query('COMMIT');
    return { sale_id: saleId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getSalesList,
  getSaleDetailsById,
  createSale,
};
