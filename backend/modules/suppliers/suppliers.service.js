const pool = require('../../db');

async function listSuppliers() {
  const result = await pool.query('SELECT * FROM SUPPLIER ORDER BY supplier_name ASC');
  return result.rows;
}

async function getSupplierById(id) {
  const result = await pool.query('SELECT * FROM SUPPLIER WHERE supplier_id = $1', [id]);
  return result.rows[0] || null;
}

async function createSupplier({ supplierName, contactPerson, phone, email }) {
  const result = await pool.query(
    `INSERT INTO SUPPLIER (supplier_name, contact_person, phone, email)
     VALUES ($1, $2, $3, $4)
     RETURNING supplier_id as id, supplier_name as name, contact_person as "contactPerson", phone, email`,
    [supplierName, contactPerson, phone, email]
  );
  return result.rows[0];
}

async function updateSupplier(id, { supplierName, contactPerson, phone, email }) {
  const result = await pool.query(
    `UPDATE SUPPLIER 
     SET supplier_name = COALESCE($1, supplier_name),
         contact_person = COALESCE($2, contact_person),
         phone = COALESCE($3, phone),
         email = COALESCE($4, email)
     WHERE supplier_id = $5
     RETURNING supplier_id as id, supplier_name as name`,
    [supplierName, contactPerson, phone, email, id]
  );
  return result.rows[0] || null;
}

module.exports = {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
};
