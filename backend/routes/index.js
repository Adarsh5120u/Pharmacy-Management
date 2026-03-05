const express = require('express');

const router = express.Router();

router.use('/medicines', require('../modules/medicines/medicines.routes'));
router.use('/inventory', require('../modules/inventory/inventory.routes'));
router.use('/suppliers', require('../modules/suppliers/suppliers.routes'));
router.use('/purchase-orders', require('../modules/purchaseOrders/purchaseOrders.routes'));
router.use('/prescriptions', require('../modules/prescriptions/prescriptions.routes'));
router.use('/sales', require('../modules/sales/sales.routes'));
router.use('/dashboard', require('../modules/dashboard/dashboard.routes'));

module.exports = router;
