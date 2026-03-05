const pool = require('../../db');

async function listPrescriptions() {
  const result = await pool.query(`
      SELECT 
        p.prescription_id as id,
        'RX' || p.prescription_id::text as "prescriptionId",
        p.patient_id as "patientId",
        p.patient_name as "patientName",
        p.doctor_id as "doctorId",
        p.doctor_name as "doctorName",
        p.prescription_date as "date",
        p.status,
        COUNT(pi.item_id) as "itemCount"
      FROM PRESCRIPTION p
      LEFT JOIN PRESCRIPTION_ITEM pi ON p.prescription_id = pi.prescription_id
      GROUP BY p.prescription_id
      ORDER BY p.prescription_date DESC
    `);
  return result.rows;
}

async function getPrescriptionById(id) {
  const presResult = await pool.query(
    'SELECT * FROM PRESCRIPTION WHERE prescription_id = $1',
    [id]
  );
  if (presResult.rows.length === 0) return null;

  const items = await pool.query(
    `SELECT pi.*, m.name as "medicineName"
     FROM PRESCRIPTION_ITEM pi
     JOIN MEDICINE m ON pi.medicine_id = m.medicine_id
     WHERE pi.prescription_id = $1`,
    [id]
  );

  return {
    ...presResult.rows[0],
    items: items.rows,
  };
}

async function createPrescription({ patientId, patientName, doctorId, doctorName, items }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const presResult = await client.query(
      `INSERT INTO PRESCRIPTION (patient_id, patient_name, doctor_id, doctor_name, prescription_date, status)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, 'pending')
       RETURNING *`,
      [patientId, patientName, doctorId, doctorName]
    );

    const presId = presResult.rows[0].prescription_id;

    for (const item of items) {
      await client.query(
        `INSERT INTO PRESCRIPTION_ITEM (prescription_id, medicine_id, dosage, duration_days)
         VALUES ($1, $2, $3, $4)`,
        [presId, item.medicineId, item.dosage, item.durationDays]
      );
    }

    await client.query('COMMIT');
    return { prescription_id: presId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updatePrescriptionStatus(id, status) {
  const result = await pool.query(
    'UPDATE PRESCRIPTION SET status = $1 WHERE prescription_id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0] || null;
}

module.exports = {
  listPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescriptionStatus,
};
