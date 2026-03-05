const prescriptionsService = require('./prescriptions.service');
const { sendServerError } = require('../../utils/errorResponse');

async function listPrescriptions(req, res) {
  try {
    const data = await prescriptionsService.listPrescriptions();
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching prescriptions:');
  }
}

async function getPrescription(req, res) {
  try {
    const data = await prescriptionsService.getPrescriptionById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Prescription not found' });
    res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error fetching prescription:');
  }
}

async function createPrescription(req, res) {
  try {
    const { patientId, doctorId, items } = req.body;
    if (!patientId || !doctorId || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Patient, doctor, and items required' });
    }
    const data = await prescriptionsService.createPrescription(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error creating prescription:');
  }
}

async function updatePrescriptionStatus(req, res) {
  try {
    const data = await prescriptionsService.updatePrescriptionStatus(req.params.id, req.body.status);
    if (!data) return res.status(404).json({ success: false, error: 'Prescription not found' });
    return res.json({ success: true, data });
  } catch (err) {
    return sendServerError(res, err, 'Error updating prescription:');
  }
}

module.exports = {
  listPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescriptionStatus,
};
