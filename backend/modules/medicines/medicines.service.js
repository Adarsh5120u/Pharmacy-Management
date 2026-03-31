const pool = require('../../db');
const { ensureMedicineStatusColumn, normalizeMedicineStatus } = require('./medicineStatus');

function mapMedicineRow(row) {
  return {
    id: row.medicine_id,
    medicineCode: row.medicine_code,
    name: row.name,
    category: row.category,
    manufacturer: row.manufacturer,
    dosageForm: row.dosage_form,
    strength: row.strength,
    prescriptionRequired: row.prescription_required,
    createdAt: row.created_at,
    genericName: row.generic_name || row.name,
    form: row.dosage_form,
    price: Number(row.unit_price || 0),
    status: normalizeMedicineStatus(row.status),
  };
}

async function listMedicines(search) {
  await ensureMedicineStatusColumn();
  let query = 'SELECT * FROM MEDICINE ORDER BY name ASC';
  const params = [];

  if (search) {
    query = `SELECT * FROM MEDICINE 
             WHERE name ILIKE $1 OR generic_name ILIKE $1 OR medicine_code ILIKE $1 OR manufacturer ILIKE $1
             ORDER BY name ASC`;
    params.push(`%${search}%`);
  }

  const result = await pool.query(query, params);
  return result.rows.map(mapMedicineRow);
}

async function getMedicineById(id) {
  await ensureMedicineStatusColumn();
  const result = await pool.query('SELECT * FROM MEDICINE WHERE medicine_id = $1', [id]);
  if (result.rows.length === 0) return null;
  return mapMedicineRow(result.rows[0]);
}

async function createMedicine(payload) {
  await ensureMedicineStatusColumn();
  const {
    name,
    genericName,
    category,
    manufacturer,
    dosageForm,
    strength,
    prescriptionRequired,
    medicineCode,
    price,
    status,
  } = payload;
  const parsedPrice = Number(price);
  const unitPrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;
  const normalizedGenericName =
    typeof genericName === 'string' && genericName.trim().length > 0 ? genericName.trim() : name;
  const normalizedStatus = normalizeMedicineStatus(status);

  const result = await pool.query(
    `INSERT INTO MEDICINE (medicine_code, name, generic_name, category, manufacturer, dosage_form, strength, unit_price, prescription_required, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      medicineCode,
      name,
      normalizedGenericName,
      category,
      manufacturer,
      dosageForm,
      strength,
      unitPrice,
      prescriptionRequired !== false,
      normalizedStatus,
    ]
  );

  return mapMedicineRow(result.rows[0]);
}

async function updateMedicine(id, payload) {
  await ensureMedicineStatusColumn();
  const {
    name,
    genericName,
    category,
    manufacturer,
    dosageForm,
    strength,
    prescriptionRequired,
    price,
    status,
  } = payload;
  let parsedPrice = null;
  if (price !== undefined) {
    parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice)) {
      const error = new Error('Invalid price');
      error.statusCode = 400;
      throw error;
    }
  }
  const normalizedStatus = status !== undefined ? normalizeMedicineStatus(status) : null;

  const result = await pool.query(
    `UPDATE MEDICINE 
     SET name = COALESCE($1, name),
         generic_name = COALESCE($2, generic_name),
         category = COALESCE($3, category),
         manufacturer = COALESCE($4, manufacturer),
         dosage_form = COALESCE($5, dosage_form),
         strength = COALESCE($6, strength),
         unit_price = COALESCE($7, unit_price),
         prescription_required = COALESCE($8, prescription_required),
         status = COALESCE($9, status)
     WHERE medicine_id = $10
     RETURNING *`,
    [name, genericName, category, manufacturer, dosageForm, strength, parsedPrice, prescriptionRequired, normalizedStatus, id]
  );
  if (result.rows.length === 0) return null;
  return mapMedicineRow(result.rows[0]);
}

async function deleteMedicine(id) {
  await ensureMedicineStatusColumn();
  const result = await pool.query('DELETE FROM MEDICINE WHERE medicine_id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = {
  listMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
};
