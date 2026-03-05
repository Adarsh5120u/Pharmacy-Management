const suppliersService = require('./suppliers.service');
const { sendServerError } = require('../../utils/errorResponse');

async function listSuppliers(req, res) {
  try {
    const data = await suppliersService.listSuppliers();
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching suppliers:');
  }
}

async function getSupplier(req, res) {
  try {
    const data = await suppliersService.getSupplierById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Supplier not found' });
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching supplier:');
  }
}

async function createSupplier(req, res) {
  try {
    const { supplierName } = req.body;
    if (!supplierName) {
      return res.status(400).json({ success: false, error: 'Supplier name is required' });
    }
    const data = await suppliersService.createSupplier(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error creating supplier:');
  }
}

async function updateSupplier(req, res) {
  try {
    const data = await suppliersService.updateSupplier(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Supplier not found' });
    return res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error updating supplier:');
  }
}

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
};
