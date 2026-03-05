const express = require('express');
const controller = require('./inventory.controller');

const router = express.Router();

router.get('/', controller.listInventory);
router.post('/', controller.addBatch);
router.patch('/:id', controller.updateBatchStock);
router.put('/:id', controller.updateBatch);
router.delete('/:id', controller.deleteBatch);

module.exports = router;
