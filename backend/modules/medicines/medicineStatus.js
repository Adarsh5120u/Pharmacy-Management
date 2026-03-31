const pool = require('../../db');

let medicineStatusColumnReady = false;
let medicineStatusColumnPromise = null;

function normalizeMedicineStatus(status) {
  return String(status || '').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

function getMedicineStatusSql(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `COALESCE(NULLIF(LOWER(TRIM(${prefix}status)), ''), 'active')`;
}

async function ensureMedicineStatusColumn(client = pool) {
  if (medicineStatusColumnReady) {
    return true;
  }

  if (!medicineStatusColumnPromise) {
    medicineStatusColumnPromise = (async () => {
      const checkResult = await client.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'medicine'
           AND column_name = 'status'
         LIMIT 1`
      );

      if (checkResult.rows.length === 0) {
        await client.query("ALTER TABLE MEDICINE ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'");
      }

      await client.query("UPDATE MEDICINE SET status = 'active' WHERE status IS NULL OR TRIM(status) = ''");
      medicineStatusColumnReady = true;
      return true;
    })().finally(() => {
      medicineStatusColumnPromise = null;
    });
  }

  return medicineStatusColumnPromise;
}

module.exports = {
  ensureMedicineStatusColumn,
  normalizeMedicineStatus,
  getMedicineStatusSql,
};
