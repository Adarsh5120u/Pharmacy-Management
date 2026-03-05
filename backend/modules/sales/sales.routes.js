const express = require('express');
const controller = require('./sales.controller');

const router = express.Router();

router.get('/', controller.listSales);
router.get('/:id', controller.getSaleById);
router.post('/', controller.createSale);

module.exports = router;
