const express = require('express');
const router = express.Router();
const { checkOwnership } = require('../middleware/authMiddleware');
const { updateExpense, cancelExpense, getAttachments, getAttachmentById, getExpenseDetail } = require('../controllers/expenseController');

// Get expense detail by ID (with all nested data: line items, history, attachments)
router.get('/:id', checkOwnership, getExpenseDetail);

// [BE-2] Update Request API
router.put('/:id', checkOwnership, updateExpense);

// [BE-3] Cancel Request API
router.patch('/:id/cancel', checkOwnership, cancelExpense);

// Get attachments for an expense request
router.get('/:id/attachments', checkOwnership, getAttachments);

// Get a specific attachment
router.get('/attachments/:attachmentId', getAttachmentById);

module.exports = router;
