const pool = require('../../db');
const {
  ensureSaleReturnColumns,
  getActiveSaleAmountSql,
  getNonReturnedSaleCondition,
} = require('../sales/saleReturnColumns');

async function getDashboardStats() {
  await ensureSaleReturnColumns();
  const medicines = await pool.query('SELECT COUNT(*) as count FROM MEDICINE');
  const lowStock = await pool.query(`
      SELECT COUNT(*) as count FROM MEDICINE_BATCH
      WHERE quantity_available < COALESCE(reorder_level, 100)
    `);
  const expiringResult = await pool.query(`
      SELECT COUNT(*) as count FROM MEDICINE_BATCH
      WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      AND expiry_date > CURRENT_DATE
    `);
  const expiredResult = await pool.query(`
      SELECT COUNT(*) as count FROM MEDICINE_BATCH
      WHERE expiry_date <= CURRENT_DATE
    `);
  const todayResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE ${getNonReturnedSaleCondition()}) as count,
        COALESCE(SUM(${getActiveSaleAmountSql()}), 0) as total
      FROM PHARMACY_SALE
      WHERE DATE(sale_date) = CURRENT_DATE
    `);
  const prescriptions = await pool.query(
    "SELECT COUNT(*) as count FROM PRESCRIPTION WHERE status = 'pending'"
  );
  const inventoryValue = await pool.query(`
      SELECT COALESCE(SUM(quantity_available * selling_price), 0) as value
      FROM MEDICINE_BATCH
    `);

  return {
    totalMedicines: parseInt(medicines.rows[0].count, 10),
    lowStockItems: parseInt(lowStock.rows[0].count, 10),
    expiringMedicines: parseInt(expiringResult.rows[0].count, 10),
    expiredItems: parseInt(expiredResult.rows[0].count, 10),
    dailySales: parseFloat(todayResult.rows[0].total),
    todaySalesCount: parseInt(todayResult.rows[0].count, 10),
    pendingPrescriptions: parseInt(prescriptions.rows[0].count, 10),
    totalInventoryValue: parseFloat(inventoryValue.rows[0].value),
  };
}

async function getSalesAnalytics() {
  await ensureSaleReturnColumns();
  const trendResult = await pool.query(`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
          date_trunc('month', CURRENT_DATE),
          INTERVAL '1 month'
        ) AS month_start
      )
      SELECT
        to_char(m.month_start, 'Mon') as month,
        COALESCE(SUM(s.total_amount), 0) as sales
      FROM months m
      LEFT JOIN PHARMACY_SALE s
        ON date_trunc('month', s.sale_date) = m.month_start
       AND ${getNonReturnedSaleCondition('s')}
      GROUP BY m.month_start
      ORDER BY m.month_start ASC
    `);

  const categoryResult = await pool.query(`
      SELECT
        COALESCE(NULLIF(m.category, ''), 'Others') as name,
        COALESCE(SUM(si.quantity * si.price), 0) as value
      FROM PHARMACY_SALE_ITEM si
      JOIN PHARMACY_SALE s ON si.sale_id = s.sale_id
      JOIN MEDICINE m ON si.medicine_id = m.medicine_id
      WHERE ${getNonReturnedSaleCondition('s')}
      GROUP BY COALESCE(NULLIF(m.category, ''), 'Others')
      ORDER BY value DESC
      LIMIT 6
    `);

  return {
    salesTrend: trendResult.rows.map((row) => ({
      month: row.month,
      sales: Number(row.sales || 0),
    })),
    salesByCategory: categoryResult.rows.map((row) => ({
      name: row.name,
      value: Number(row.value || 0),
    })),
  };
}

module.exports = {
  getDashboardStats,
  getSalesAnalytics,
};
