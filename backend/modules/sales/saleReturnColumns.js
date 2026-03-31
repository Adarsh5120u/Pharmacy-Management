const pool = require('../../db');

let saleReturnColumnsReady = false;
let saleReturnColumnsPromise = null;

function getSaleReturnStatusSql(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `COALESCE(${prefix}is_returned, FALSE)`;
}

function getActiveSaleAmountSql(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `CASE WHEN ${getSaleReturnStatusSql(alias)} THEN 0 ELSE COALESCE(${prefix}total_amount, 0) END`;
}

function getNonReturnedSaleCondition(alias = '') {
  return `${getSaleReturnStatusSql(alias)} = FALSE`;
}

async function ensureSaleReturnColumns(client = pool) {
  if (saleReturnColumnsReady) {
    return true;
  }

  if (!saleReturnColumnsPromise) {
    saleReturnColumnsPromise = (async () => {
      const checkResult = await client.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'pharmacy_sale'
           AND column_name = ANY($1::text[])`,
        [['is_returned', 'returned_at']]
      );

      const existingColumns = new Set(
        checkResult.rows.map((row) => String(row.column_name || '').toLowerCase())
      );

      if (!existingColumns.has('is_returned')) {
        await client.query(
          'ALTER TABLE PHARMACY_SALE ADD COLUMN IF NOT EXISTS is_returned BOOLEAN DEFAULT FALSE'
        );
      }

      if (!existingColumns.has('returned_at')) {
        await client.query(
          'ALTER TABLE PHARMACY_SALE ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP'
        );
      }

      await client.query('UPDATE PHARMACY_SALE SET is_returned = FALSE WHERE is_returned IS NULL');

      saleReturnColumnsReady = true;
      return true;
    })().finally(() => {
      saleReturnColumnsPromise = null;
    });
  }

  return saleReturnColumnsPromise;
}

module.exports = {
  ensureSaleReturnColumns,
  getSaleReturnStatusSql,
  getActiveSaleAmountSql,
  getNonReturnedSaleCondition,
};
