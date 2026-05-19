const ExpenseModel = require('../models/ExpenseModel');
const S3Service = require('../services/S3Service');

const updateExpense = async (req, res) => {
  const expenseId = req.params.id;
  const { status } = req.expense;

  if (status !== 'Draft' && status !== 'Pending Manager') {
    return res.status(400).json({ error: 'Bad Request: Can only update if status is Draft or Pending Manager' });
  }

  const { category_id, start_date, end_date } = req.body; 

  try {
    const updatedExpense = await ExpenseModel.updateExpense(expenseId, { category_id, start_date, end_date });
    return res.status(200).json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return res.status(500).json({ error: 'Internal server error while updating' });
  }
};

const cancelExpense = async (req, res) => {
  const expenseId = req.params.id;
  const { status } = req.expense;

  if (status !== 'Draft' && status !== 'Pending Manager') {
    return res.status(400).json({ error: 'Bad Request: Can only cancel if status is Draft or Pending Manager' });
  }

  try {
    const cancelledExpense = await ExpenseModel.cancelExpense(expenseId);
    return res.status(200).json(cancelledExpense);
  } catch (error) {
    console.error('Error cancelling expense:', error);
    return res.status(500).json({ error: 'Internal server error while cancelling' });
  }
};

const getAttachments = async (req, res) => {
  const expenseId = req.params.id;

  try {
    const attachments = await ExpenseModel.getAttachments(expenseId);
    
    // Enrich attachments with presigned URLs from S3
    const enrichedAttachments = await Promise.all(
      attachments.map(async (attachment) => {
        try {
          const presignedUrl = await S3Service.getPresignedUrl(attachment.file_name);
          return {
            ...attachment,
            presignedUrl
          };
        } catch (error) {
          console.error(`Error getting presigned URL for ${attachment.file_name}:`, error);
          return attachment;
        }
      })
    );

    return res.status(200).json(enrichedAttachments);
  } catch (error) {
    console.error('Error retrieving attachments:', error);
    return res.status(500).json({ error: 'Internal server error while retrieving attachments' });
  }
};

const getAttachmentById = async (req, res) => {
  const { attachmentId } = req.params;

  try {
    const attachment = await ExpenseModel.getAttachmentById(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Get presigned URL from S3
    const presignedUrl = await S3Service.getPresignedUrl(attachment.file_name);

    return res.status(200).json({
      ...attachment,
      presignedUrl
    });
  } catch (error) {
    console.error('Error retrieving attachment:', error);
    return res.status(500).json({ error: 'Internal server error while retrieving attachment' });
  }
};

const getExpenseDetail = async (req, res) => {
  const expenseId = req.params.id;

  try {
    const expense = await ExpenseModel.getFullExpenseDetail(expenseId);
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense request not found' });
    }

    // Enrich attachments with presigned URLs
    if (expense.attachments && expense.attachments.length > 0) {
      expense.attachments = await Promise.all(
        expense.attachments.map(async (attachment) => {
          try {
            const presignedUrl = await S3Service.getPresignedUrl(attachment.file_name);
            return {
              ...attachment,
              presignedUrl
            };
          } catch (error) {
            console.error(`Error getting presigned URL for ${attachment.file_name}:`, error);
            return attachment;
          }
        })
      );
    }

    return res.status(200).json(expense);
  } catch (error) {
    console.error('Error retrieving expense detail:', error);
    return res.status(500).json({ error: 'Internal server error while retrieving expense' });
  }
};

module.exports = {
  updateExpense,
  cancelExpense,
  getAttachments,
  getAttachmentById,
  getExpenseDetail
};
