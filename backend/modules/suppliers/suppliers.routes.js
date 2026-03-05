const express = require('express');
const controller = require('./suppliers.controller');

const router = express.Router();

router.get('/', controller.listSuppliers);
router.get('/:id', controller.getSupplier);
router.post('/', controller.createSupplier);
router.put('/:id', controller.updateSupplier);

module.exports = router;
