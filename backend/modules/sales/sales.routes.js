const express = require('express');
const controller = require('./sales.controller');

const router = express.Router();

router.get('/', controller.listSales);
router.get('/:id', controller.getSaleById);
router.post('/', controller.createSale);
router.patch('/:id/return', controller.returnSale);

module.exports = router;
