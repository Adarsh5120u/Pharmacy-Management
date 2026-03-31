const pool = require('../../db');

const PURCHASE_ORDER_STATUSES = ['pending', 'approved', 'received', 'cancelled'];
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
let purchaseQuantityColumnReady = false;
let purchaseQuantityColumnPromise = null;

async function ensurePurchaseQuantityColumn(client = pool) {
  if (purchaseQuantityColumnReady) {
    return true;
  }

  if (!purchaseQuantityColumnPromise) {
    purchaseQuantityColumnPromise = (async () => {
      const checkResult = await client.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'medicine_batch'
           AND column_name = 'purchase_quantity'
         LIMIT 1`
      );

      if (checkResult.rows.length === 0) {
        await client.query('ALTER TABLE MEDICINE_BATCH ADD COLUMN IF NOT EXISTS purchase_quantity INT');
      }

      await client.query(
        'UPDATE MEDICINE_BATCH SET purchase_quantity = quantity_available WHERE purchase_quantity IS NULL'
      );

      purchaseQuantityColumnReady = true;
      return true;
    })().finally(() => {
      purchaseQuantityColumnPromise = null;
    });
  }

  return purchaseQuantityColumnPromise;
}

async function listPurchaseOrders() {
  const result = await pool.query(`
      SELECT 
        po.purchase_order_id as id,
        'PO' || po.purchase_order_id::text as "poNumber",
        po.order_date as "orderDate",
        s.supplier_id as "supplierId",
        s.supplier_name as "supplierName",
        po.status,
        COUNT(poi.item_id) as "itemCount",
        COALESCE(SUM(poi.quantity * poi.unit_price), 0) as "totalAmount"
      FROM PURCHASE_ORDER po
      JOIN SUPPLIER s ON po.supplier_id = s.supplier_id
      LEFT JOIN PURCHASE_ORDER_ITEM poi ON po.purchase_order_id = poi.purchase_order_id
      GROUP BY po.purchase_order_id, s.supplier_id, s.supplier_name
      ORDER BY po.order_date DESC
    `);
  return result.rows;
}

async function getPurchaseOrderById(id) {
  await ensurePurchaseQuantityColumn();

  const orderResult = await pool.query(
    `
    SELECT
      po.purchase_order_id as id,
      'PO' || po.purchase_order_id::text as "poNumber",
      po.order_date as "orderDate",
      s.supplier_id as "supplierId",
      s.supplier_name as "supplierName",
      po.status,
      rb."receivedAt"
    FROM PURCHASE_ORDER po
    JOIN SUPPLIER s ON po.supplier_id = s.supplier_id
    LEFT JOIN LATERAL (
      SELECT MAX(mb.created_at) as "receivedAt"
      FROM PURCHASE_ORDER_ITEM poi
      JOIN MEDICINE_BATCH mb
        ON mb.medicine_id = poi.medicine_id
       AND mb.batch_number LIKE ('PO-' || po.purchase_order_id::text || '-M-' || poi.medicine_id::text || '-%')
      WHERE poi.purchase_order_id = po.purchase_order_id
    ) rb ON true
    WHERE po.purchase_order_id = $1
    `,
    [id]
  );

  if (orderResult.rows.length === 0) return null;

  const itemsResult = await pool.query(
    `
    SELECT
      poi.item_id as id,
      poi.medicine_id as "medicineId",
      m.name as "medicineName",
      poi.quantity,
      poi.unit_price as "unitPrice",
      (poi.quantity * poi.unit_price) as "lineTotal",
      rb."receivedQuantity",
      rb."expiryDate",
      rb."batchNumber",
      rb."receivedAt"
    FROM PURCHASE_ORDER_ITEM poi
    JOIN MEDICINE m ON poi.medicine_id = m.medicine_id
    LEFT JOIN LATERAL (
      SELECT
        mb.batch_number as "batchNumber",
        mb.expiry_date as "expiryDate",
        COALESCE(mb.purchase_quantity, NULLIF(mb.quantity_available, 0), poi.quantity) as "receivedQuantity",
        mb.created_at as "receivedAt"
      FROM MEDICINE_BATCH mb
      WHERE mb.medicine_id = poi.medicine_id
        AND mb.batch_number LIKE ('PO-' || poi.purchase_order_id::text || '-M-' || poi.medicine_id::text || '-%')
      ORDER BY mb.created_at DESC, mb.batch_id DESC
      LIMIT 1
    ) rb ON true
    WHERE poi.purchase_order_id = $1
    ORDER BY poi.item_id ASC
    `,
    [id]
  );

  return {
    ...orderResult.rows[0],
    items: itemsResult.rows,
  };
}

async function createPurchaseOrder({ supplierId, items, orderDate, status }) {
  const client = await pool.connect();
  try {
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : 'pending';
    const finalStatus = PURCHASE_ORDER_STATUSES.includes(normalizedStatus) ? normalizedStatus : 'pending';
    const finalOrderDate = orderDate || null;

    if (finalStatus === 'received') {
      const err = new Error('Create purchase orders as pending/approved, then mark as received with received quantity and expiry details');
      err.statusCode = 400;
      throw err;
    }

    await client.query('BEGIN');
    const poResult = await client.query(
      `INSERT INTO PURCHASE_ORDER (supplier_id, order_date, status)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3)
       RETURNING *`,
      [supplierId, finalOrderDate, finalStatus]
    );

    const poId = poResult.rows[0].purchase_order_id;

    for (const item of items) {
      await client.query(
        `INSERT INTO PURCHASE_ORDER_ITEM (purchase_order_id, medicine_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [poId, item.medicineId, item.quantity, item.unitPrice]
      );
    }

    await client.query('COMMIT');
    return { purchase_order_id: poId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updatePurchaseOrderStatus(id, { status, receivedItems }) {
  const client = await pool.connect();
  try {
    await ensurePurchaseQuantityColumn(client);

    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';

    if (!PURCHASE_ORDER_STATUSES.includes(normalizedStatus)) {
      const err = new Error('Invalid purchase order status');
      err.statusCode = 400;
      throw err;
    }

    await client.query('BEGIN');

    const existingResult = await client.query(
      'SELECT * FROM PURCHASE_ORDER WHERE purchase_order_id = $1 FOR UPDATE',
      [id]
    );

    if (existingResult.rows.length === 0) {
      const err = new Error('Purchase order not found');
      err.statusCode = 404;
      throw err;
    }

    const currentStatus = (existingResult.rows[0].status || '').toLowerCase();
    const currentStatusIndex = PURCHASE_ORDER_STATUSES.indexOf(currentStatus);
    const nextStatusIndex = PURCHASE_ORDER_STATUSES.indexOf(normalizedStatus);

    if (currentStatus === 'received' && normalizedStatus !== 'received') {
      const err = new Error('Status cannot be changed after it is marked as "received"');
      err.statusCode = 400;
      throw err;
    }

    if (currentStatusIndex !== -1 && nextStatusIndex < currentStatusIndex) {
      const err = new Error(`Status cannot move backward from "${currentStatus}" to "${normalizedStatus}"`);
      err.statusCode = 400;
      throw err;
    }

    if (normalizedStatus === 'received' && currentStatus !== 'received') {
      if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
        const err = new Error('Received items with quantity and expiry date are required');
        err.statusCode = 400;
        throw err;
      }

      const poItemsResult = await client.query(
        `SELECT item_id, medicine_id, quantity, unit_price
         FROM PURCHASE_ORDER_ITEM
         WHERE purchase_order_id = $1`,
        [id]
      );

      const receivedItemsMap = new Map(
        receivedItems
          .filter((item) => item && item.itemId !== undefined && item.itemId !== null)
          .map((item) => [Number(item.itemId), item])
      );

      for (const item of poItemsResult.rows) {
        const receivedItem = receivedItemsMap.get(Number(item.item_id));
        if (!receivedItem) {
          const err = new Error(`Missing received details for purchase order item ${item.item_id}`);
          err.statusCode = 400;
          throw err;
        }

        const quantityReceived = Number(
          receivedItem.quantityReceived ?? receivedItem.receivedQuantity ?? 0
        );
        const orderedQuantity = Number(item.quantity) || 0;
        const expiryDate = String(receivedItem.expiryDate || '').trim();

        if (!Number.isInteger(quantityReceived) || quantityReceived <= 0) {
          const err = new Error(`Invalid received quantity for purchase order item ${item.item_id}`);
          err.statusCode = 400;
          throw err;
        }

        if (quantityReceived > orderedQuantity) {
          const err = new Error(`Received quantity cannot exceed ordered quantity for item ${item.item_id}`);
          err.statusCode = 400;
          throw err;
        }

        if (!ISO_DATE_PATTERN.test(expiryDate)) {
          const err = new Error(`Expiry date is required for purchase order item ${item.item_id}`);
          err.statusCode = 400;
          throw err;
        }
      }

      const result = await client.query(
        'UPDATE PURCHASE_ORDER SET status = $1 WHERE purchase_order_id = $2 RETURNING *',
        [normalizedStatus, id]
      );

      for (const item of poItemsResult.rows) {
        const receivedItem = receivedItemsMap.get(Number(item.item_id));
        const quantityReceived = Number(receivedItem.quantityReceived ?? receivedItem.receivedQuantity);
        const expiryDate = String(receivedItem.expiryDate).trim();

        const generatedBatchNumber = `PO-${id}-M-${item.medicine_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const purchasePrice = Number(item.unit_price) || 0;
        const sellingPrice = purchasePrice;

        await client.query(
          `INSERT INTO MEDICINE_BATCH
            (medicine_id, batch_number, expiry_date, purchase_price, selling_price, purchase_quantity, quantity_available)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [item.medicine_id, generatedBatchNumber, expiryDate, purchasePrice, sellingPrice, quantityReceived, quantityReceived]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    }

    const result = await client.query(
      'UPDATE PURCHASE_ORDER SET status = $1 WHERE purchase_order_id = $2 RETURNING *',
      [normalizedStatus, id]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
};
