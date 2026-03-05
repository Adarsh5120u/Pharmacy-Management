const purchaseOrdersService = require('./purchaseOrders.service');
const { sendServerError } = require('../../utils/errorResponse');

async function listPurchaseOrders(req, res) {
  try {
    const data = await purchaseOrdersService.listPurchaseOrders();
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching purchase orders:');
  }
}

async function getPurchaseOrder(req, res) {
  try {
    const data = await purchaseOrdersService.getPurchaseOrderById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Purchase order not found' });
    return res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching purchase order details:');
  }
}

async function createPurchaseOrder(req, res) {
  try {
    const { supplierId, items } = req.body;
    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Supplier ID and items required' });
    }
    const data = await purchaseOrdersService.createPurchaseOrder(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    return sendServerError(res, err, 'Error creating purchase order:');
  }
}

async function updatePurchaseOrderStatus(req, res) {
  try {
    const data = await purchaseOrdersService.updatePurchaseOrderStatus(req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    return sendServerError(res, err, 'Error updating PO:');
  }
}

module.exports = {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
};
