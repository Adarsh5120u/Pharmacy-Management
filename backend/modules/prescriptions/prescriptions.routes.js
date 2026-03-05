const express = require('express');
const controller = require('./prescriptions.controller');

const router = express.Router();

router.get('/', controller.listPrescriptions);
router.get('/:id', controller.getPrescription);
router.post('/', controller.createPrescription);
router.patch('/:id/status', controller.updatePrescriptionStatus);

module.exports = router;
