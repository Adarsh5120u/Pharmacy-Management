const pool = require('../../db');
const { ensureMedicineStatusColumn, getMedicineStatusSql } = require('../medicines/medicineStatus');
const {
  ensureSaleReturnColumns,
  getActiveSaleAmountSql,
  getSaleReturnStatusSql,
} = require('./saleReturnColumns');

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
  await ensureSaleReturnColumns();
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
        ${getActiveSaleAmountSql('s')} as total,
        COALESCE(s.total_amount, 0) as "originalTotal",
        ${customerNameSelect} as "customerName",
        s.payment_method as "paymentMethod",
        COUNT(si.item_id) as items,
        ${getSaleReturnStatusSql('s')} as "isReturned",
        s.returned_at as "returnedAt"
      FROM PHARMACY_SALE s
      LEFT JOIN PHARMACY_SALE_ITEM si ON s.sale_id = si.sale_id
      GROUP BY s.sale_id
      ORDER BY s.sale_date DESC
      ${limitClause}
    `);

  return result.rows;
}

async function getSaleDetailsById(id) {
  await ensureSaleReturnColumns();
  const supportsCustomerName = await hasCustomerNameColumn();
  const sale = await pool.query(
    supportsCustomerName
      ? `SELECT sale_id, prescription_id, sale_date, total_amount, payment_method,
             COALESCE(NULLIF(TRIM(customer_name), ''), 'Walk-in Customer') as customer_name,
             ${getSaleReturnStatusSql()} as is_returned,
             returned_at
           FROM PHARMACY_SALE
           WHERE sale_id = $1`
      : `SELECT sale_id, prescription_id, sale_date, total_amount, payment_method,
             'Walk-in Customer' as customer_name,
             ${getSaleReturnStatusSql()} as is_returned,
             returned_at
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
  await ensureMedicineStatusColumn();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const supportsCustomerName = await hasCustomerNameColumn(client);
    const normalizedCustomerName = String(customerName || '').trim() || 'Walk-in Customer';
    const uniqueMedicineIds = [...new Set(items.map((item) => Number(item.medicineId)).filter(Number.isFinite))];

    if (uniqueMedicineIds.length > 0) {
      const medicineResult = await client.query(
        `SELECT medicine_id, name, ${getMedicineStatusSql()} as status
         FROM MEDICINE
         WHERE medicine_id = ANY($1::int[])`,
        [uniqueMedicineIds]
      );
      const medicineMap = new Map(medicineResult.rows.map((row) => [Number(row.medicine_id), row]));
      const missingMedicineId = uniqueMedicineIds.find((medicineId) => !medicineMap.has(medicineId));

      if (missingMedicineId !== undefined) {
        const err = new Error(`Medicine ${missingMedicineId} was not found.`);
        err.statusCode = 400;
        throw err;
      }

      const inactiveMedicine = uniqueMedicineIds
        .map((medicineId) => medicineMap.get(medicineId))
        .find((medicine) => medicine?.status !== 'active');

      if (inactiveMedicine) {
        const err = new Error(`${inactiveMedicine.name} is inactive and cannot be sold.`);
        err.statusCode = 400;
        throw err;
      }
    }

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

async function returnSale(id) {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await ensureSaleReturnColumns(client);
    await client.query('BEGIN');
    transactionStarted = true;

    const saleResult = await client.query(
      `SELECT sale_id, total_amount, ${getSaleReturnStatusSql()} as is_returned, returned_at
       FROM PHARMACY_SALE
       WHERE sale_id = $1
       FOR UPDATE`,
      [id]
    );

    if (saleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return null;
    }

    const sale = saleResult.rows[0];

    if (sale.is_returned) {
      await client.query('COMMIT');
      transactionStarted = false;
      return {
        sale_id: sale.sale_id,
        total_amount: Number(sale.total_amount || 0),
        is_returned: true,
        returned_at: sale.returned_at,
        already_returned: true,
      };
    }

    const itemsResult = await client.query(
      `SELECT item_id, medicine_id, batch_id, quantity
       FROM PHARMACY_SALE_ITEM
       WHERE sale_id = $1`,
      [id]
    );

    for (const item of itemsResult.rows) {
      const restoredStock = await client.query(
        `UPDATE MEDICINE_BATCH
         SET quantity_available = quantity_available + $1
         WHERE batch_id = $2
           AND medicine_id = $3
         RETURNING batch_id`,
        [item.quantity, item.batch_id, item.medicine_id]
      );

      if (restoredStock.rows.length === 0) {
        const restoreError = new Error(
          `Unable to restore stock for sale ${id}. Batch ${item.batch_id} was not found for medicine ${item.medicine_id}.`
        );
        restoreError.statusCode = 400;
        throw restoreError;
      }
    }

    const updatedSale = await client.query(
      `UPDATE PHARMACY_SALE
       SET is_returned = TRUE,
           returned_at = CURRENT_TIMESTAMP
       WHERE sale_id = $1
       RETURNING sale_id, total_amount, ${getSaleReturnStatusSql()} as is_returned, returned_at`,
      [id]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    return {
      sale_id: updatedSale.rows[0].sale_id,
      total_amount: Number(updatedSale.rows[0].total_amount || 0),
      is_returned: updatedSale.rows[0].is_returned,
      returned_at: updatedSale.rows[0].returned_at,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getSalesList,
  getSaleDetailsById,
  createSale,
  returnSale,
};
