const inventoryService = require('./inventory.service');
const { sendServerError } = require('../../utils/errorResponse');

async function listInventory(req, res) {
  try {
    const data = await inventoryService.listInventory();
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching inventory:');
  }
}

async function addBatch(req, res) {
  try {
    const { medicineId, quantity } = req.body;
    if (!medicineId || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, error: 'Medicine ID and valid quantity are required' });
    }
    const data = await inventoryService.addBatch(req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Medicine not found' });
    return res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    return sendServerError(res, err, 'Error adding batch:');
  }
}

async function updateBatchStock(req, res) {
  try {
    const data = await inventoryService.updateBatchStock(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Batch not found' });
    return res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error updating batch:');
  }
}

async function updateBatch(req, res) {
  try {
    const data = await inventoryService.updateBatch(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Batch not found' });
    return res.json({ success: true, data });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    return sendServerError(res, err, 'Error updating batch details:');
  }
}

async function deleteBatch(req, res) {
  try {
    const data = await inventoryService.deleteBatch(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Batch not found' });
    return res.json({ success: true, data });
  } catch (err) {
    if (err?.statusCode || err?.code === '23503') {
      return res.status(err.statusCode || 409).json({
        success: false,
        error: err.message || 'Cannot delete this batch because it is already used in sales records.',
      });
    }
    return sendServerError(res, err, 'Error deleting batch:');
  }
}

module.exports = {
  listInventory,
  addBatch,
  updateBatchStock,
  updateBatch,
  deleteBatch,
};
