const express = require('express');
const controller = require('./medicines.controller');

const router = express.Router();

router.get('/', controller.listMedicines);
router.get('/:id', controller.getMedicine);
router.post('/', controller.createMedicine);
router.put('/:id', controller.updateMedicine);
router.delete('/:id', controller.deleteMedicine);

module.exports = router;
