const pool = require('../../db');
const { ensureMedicineStatusColumn, getMedicineStatusSql } = require('../medicines/medicineStatus');

let purchaseQuantityColumnExists = null;

async function hasPurchaseQuantityColumn() {
  if (purchaseQuantityColumnExists !== null) return purchaseQuantityColumnExists;
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'medicine_batch'
         AND column_name = 'purchase_quantity'
     ) as exists`
  );
  purchaseQuantityColumnExists = Boolean(result.rows[0]?.exists);
  return purchaseQuantityColumnExists;
}

async function listInventory() {
  await ensureMedicineStatusColumn();
  const hasPurchaseQty = await hasPurchaseQuantityColumn();
  const purchaseQtySelect = hasPurchaseQty
    ? 'COALESCE(mb.purchase_quantity, mb.quantity_available)'
    : 'mb.quantity_available';

  const result = await pool.query(
    `
    SELECT 
      mb.batch_id as "id",
      mb.medicine_id as "medicineId",
      m.name as "medicineName",
      m.manufacturer as "manufacturer",
      mb.batch_number as "batchNumber",
      ${purchaseQtySelect} as "purchaseQuantity",
      mb.quantity_available as "quantity",
      COALESCE(mb.reorder_level, 100) as "reorderLevel",
      mb.expiry_date as "expiryDate",
      m.unit_price as "unitPrice",
      COALESCE(mb.location, 'Shelf A') as "location",
      (
        SELECT COUNT(*)
        FROM PHARMACY_SALE_ITEM psi
        WHERE psi.batch_id = mb.batch_id
      ) as "salesReferences"
    FROM MEDICINE_BATCH mb
    JOIN MEDICINE m ON mb.medicine_id = m.medicine_id
    WHERE ${getMedicineStatusSql('m')} = 'active'
    ORDER BY m.name ASC
  `
  );

  return result.rows;
}

async function addBatch({ medicineId, expiryDate, quantity, location, reorderLevel }) {
  await ensureMedicineStatusColumn();
  const medicineCheck = await pool.query(
    `SELECT unit_price, ${getMedicineStatusSql()} as status
     FROM MEDICINE
     WHERE medicine_id = $1`,
    [medicineId]
  );
  if (medicineCheck.rows.length === 0) return null;
  if (medicineCheck.rows[0].status !== 'active') {
    const err = new Error('Inactive medicine cannot be added to inventory.');
    err.statusCode = 400;
    throw err;
  }

  const unitPrice = Number(medicineCheck.rows[0].unit_price || 0);
  const normalizedLocation =
    typeof location === 'string' && location.trim().length > 0 ? location.trim() : 'Shelf A';
  const parsedReorderLevel = Number(reorderLevel);
  const normalizedReorderLevel =
    Number.isFinite(parsedReorderLevel) && parsedReorderLevel >= 0 ? parsedReorderLevel : 100;

  const hasPurchaseQty = await hasPurchaseQuantityColumn();
  const insertQuery = hasPurchaseQty
    ? `WITH next_batch AS (
         SELECT nextval(pg_get_serial_sequence('medicine_batch', 'batch_id')) AS batch_id
       )
       INSERT INTO MEDICINE_BATCH
        (batch_id, medicine_id, batch_number, expiry_date, purchase_price, selling_price, location, reorder_level, purchase_quantity, quantity_available)
       SELECT
        next_batch.batch_id,
        $1,
        'BT-' || next_batch.batch_id::text,
        $2,
        $3,
        $3,
        $4,
        $5,
        $6,
        $6
       FROM next_batch
       RETURNING *`
    : `WITH next_batch AS (
         SELECT nextval(pg_get_serial_sequence('medicine_batch', 'batch_id')) AS batch_id
       )
       INSERT INTO MEDICINE_BATCH
        (batch_id, medicine_id, batch_number, expiry_date, purchase_price, selling_price, location, reorder_level, quantity_available)
       SELECT
        next_batch.batch_id,
        $1,
        'BT-' || next_batch.batch_id::text,
        $2,
        $3,
        $3,
        $4,
        $5,
        $6
       FROM next_batch
       RETURNING *`;

  const result = await pool.query(insertQuery, [
    medicineId,
    expiryDate || null,
    unitPrice,
    normalizedLocation,
    normalizedReorderLevel,
    Number(quantity),
  ]);
  return result.rows[0];
}

async function updateBatchStock(id, { quantity, operation }) {
  const current = await pool.query('SELECT quantity_available FROM MEDICINE_BATCH WHERE batch_id = $1', [id]);
  if (current.rows.length === 0) return null;

  let newQuantity = current.rows[0].quantity_available;
  if (operation === 'add') {
    newQuantity += quantity;
  } else if (operation === 'subtract') {
    newQuantity = Math.max(0, newQuantity - quantity);
  } else if (operation === 'set') {
    newQuantity = quantity;
  }

  const result = await pool.query(
    'UPDATE MEDICINE_BATCH SET quantity_available = $1 WHERE batch_id = $2 RETURNING *',
    [newQuantity, id]
  );

  return result.rows[0];
}

async function updateBatch(id, { expiryDate, quantity, location, reorderLevel }) {
  const existing = await pool.query('SELECT * FROM MEDICINE_BATCH WHERE batch_id = $1', [id]);
  if (existing.rows.length === 0) return null;

  const hasPurchaseQty = await hasPurchaseQuantityColumn();
  const parsedQuantity = Number(quantity);
  const parsedReorderLevel = Number(reorderLevel);
  const maxPurchaseQuantity = hasPurchaseQty
    ? Number(existing.rows[0].purchase_quantity ?? existing.rows[0].quantity_available ?? 0)
    : Number(existing.rows[0].quantity_available ?? 0);

  const normalizedQuantity = Number.isFinite(parsedQuantity) && parsedQuantity >= 0
    ? parsedQuantity
    : existing.rows[0].quantity_available;
  const normalizedReorderLevel = Number.isFinite(parsedReorderLevel) && parsedReorderLevel >= 0
    ? parsedReorderLevel
    : (existing.rows[0].reorder_level ?? 100);
  const normalizedLocation =
    typeof location === 'string' && location.trim().length > 0
      ? location.trim()
      : (existing.rows[0].location || 'Shelf A');
  const normalizedExpiryDate = expiryDate || null;

  if (normalizedQuantity > maxPurchaseQuantity) {
    const err = new Error(`Quantity cannot exceed purchased quantity (${maxPurchaseQuantity}).`);
    err.statusCode = 400;
    throw err;
  }

  const result = await pool.query(
    `UPDATE MEDICINE_BATCH
     SET expiry_date = $1,
         quantity_available = $2,
         location = $3,
         reorder_level = $4
     WHERE batch_id = $5
     RETURNING *`,
    [normalizedExpiryDate, normalizedQuantity, normalizedLocation, normalizedReorderLevel, id]
  );
  return result.rows[0];
}

async function deleteBatch(id) {
  const usageCheck = await pool.query(
    'SELECT COUNT(*)::int as ref_count FROM PHARMACY_SALE_ITEM WHERE batch_id = $1',
    [id]
  );
  const refCount = Number(usageCheck.rows[0]?.ref_count || 0);
  if (refCount > 0) {
    const err = new Error('Cannot delete this batch because it is already used in sales records.');
    err.statusCode = 409;
    throw err;
  }

  const result = await pool.query('DELETE FROM MEDICINE_BATCH WHERE batch_id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = {
  listInventory,
  addBatch,
  updateBatchStock,
  updateBatch,
  deleteBatch,
};
