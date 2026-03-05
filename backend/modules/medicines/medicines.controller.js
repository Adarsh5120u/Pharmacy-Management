const medicinesService = require('./medicines.service');
const { sendServerError } = require('../../utils/errorResponse');

async function listMedicines(req, res) {
  try {
    const data = await medicinesService.listMedicines(req.query.search);
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching medicines:');
  }
}

async function getMedicine(req, res) {
  try {
    const data = await medicinesService.getMedicineById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Medicine not found' });
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching medicine:');
  }
}

async function createMedicine(req, res) {
  try {
    const { name, medicineCode } = req.body;
    if (!name || !medicineCode) {
      return res.status(400).json({ success: false, error: 'Name and medicine code are required' });
    }
    const data = await medicinesService.createMedicine(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error creating medicine:');
  }
}

async function updateMedicine(req, res) {
  try {
    const data = await medicinesService.updateMedicine(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Medicine not found' });
    return res.json({ success: true, data });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    return sendServerError(res, err, 'Error updating medicine:');
  }
}

async function deleteMedicine(req, res) {
  try {
    const data = await medicinesService.deleteMedicine(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Medicine not found' });
    return res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error deleting medicine:');
  }
}

module.exports = {
  listMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine,
};
