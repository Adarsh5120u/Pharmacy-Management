const express = require('express');
const controller = require('./dashboard.controller');

const router = express.Router();

router.get('/stats', controller.getStats);
router.get('/sales-analytics', controller.getSalesAnalytics);

module.exports = router;
