const express = require('express');
const controller = require('./purchaseOrders.controller');

const router = express.Router();

router.get('/', controller.listPurchaseOrders);
router.get('/:id', controller.getPurchaseOrder);
router.post('/', controller.createPurchaseOrder);
router.patch('/:id/status', controller.updatePurchaseOrderStatus);

module.exports = router;
