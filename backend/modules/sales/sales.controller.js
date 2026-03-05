const salesService = require('./sales.service');
const { sendServerError } = require('../../utils/errorResponse');

async function listSales(req, res) {
  try {
    const includeAll = String(req.query.all || '').toLowerCase() === 'true';
    const data = await salesService.getSalesList({ includeAll });
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching sales:');
  }
}

async function getSaleById(req, res) {
  try {
    const data = await salesService.getSaleDetailsById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching sale:');
  }
}

async function createSale(req, res) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items required' });
    }

    for (const item of items) {
      if (!item.medicineId || !item.batchId || !Number.isFinite(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Each item must include medicineId, batchId, and positive quantity',
        });
      }
    }

    const data = await salesService.createSale(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    return sendServerError(res, err, 'Error processing sale:');
  }
}

module.exports = {
  listSales,
  getSaleById,
  createSale,
};
