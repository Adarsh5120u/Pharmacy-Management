const dashboardService = require('./dashboard.service');
const { sendServerError } = require('../../utils/errorResponse');

async function getStats(req, res) {
  try {
    const data = await dashboardService.getDashboardStats();
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching dashboard stats:');
  }
}

async function getSalesAnalytics(req, res) {
  try {
    const data = await dashboardService.getSalesAnalytics();
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching dashboard analytics:');
  }
}

module.exports = {
  getStats,
  getSalesAnalytics,
};
