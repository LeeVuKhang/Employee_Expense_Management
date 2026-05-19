const pool = require('../db');

class ExpenseModel {
  static async getExpenseById(id) {
    const result = await pool.query('SELECT * FROM expense_requests WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async updateExpense(id, { category_id, start_date, end_date }) {
    const updateQuery = `
      UPDATE expense_requests
      SET 
        category_id = COALESCE($1, category_id), 
        start_date = COALESCE($2, start_date), 
        end_date = COALESCE($3, end_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [category_id, start_date, end_date, id]);
    return result.rows[0];
  }

  static async cancelExpense(id) {
    const cancelQuery = `
      UPDATE expense_requests
      SET 
        status = 'Cancelled',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(cancelQuery, [id]);
    return result.rows[0];
  }

  static async getAttachments(expenseRequestId) {
    const query = `
      SELECT id, file_name, file_url, file_size_bytes, uploaded_at
      FROM attachments
      WHERE expense_request_id = $1
      ORDER BY uploaded_at DESC;
    `;
    const result = await pool.query(query, [expenseRequestId]);
    return result.rows;
  }

  static async getAttachmentById(attachmentId) {
    const query = `
      SELECT id, expense_request_id, file_name, file_url, file_size_bytes, uploaded_at
      FROM attachments
      WHERE id = $1;
    `;
    const result = await pool.query(query, [attachmentId]);
    return result.rows[0];
  }

  static async getExpenseDetailById(id) {
    const query = `
      SELECT 
        er.id,
        er.employee_id,
        er.category_id,
        ec.name as category_name,
        er.start_date,
        er.end_date,
        er.total_amount,
        er.status,
        er.is_locked,
        er.rejection_reason,
        er.current_processor_id,
        er.created_at,
        er.updated_at
      FROM expense_requests er
      LEFT JOIN expense_categories ec ON er.category_id = ec.id
      WHERE er.id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getLineItems(expenseRequestId) {
    const query = `
      SELECT 
        id,
        expense_date as date,
        item_service_name as item_name,
        amount,
        purpose_note as purpose
      FROM expense_line_items
      WHERE expense_request_id = $1
      ORDER BY expense_date ASC;
    `;
    const result = await pool.query(query, [expenseRequestId]);
    return result.rows;
  }

  static async getRequestHistory(expenseRequestId) {
    const query = `
      SELECT 
        rh.id,
        rh.action_taken as action,
        rh.comments,
        rh.created_at as timestamp,
        u.full_name as actor_name,
        u.role as actor_role
      FROM request_history rh
      LEFT JOIN users u ON rh.actor_id = u.id
      WHERE rh.expense_request_id = $1
      ORDER BY rh.created_at DESC;
    `;
    const result = await pool.query(query, [expenseRequestId]);
    return result.rows;
  }

  static async getFullExpenseDetail(id) {
    const expense = await this.getExpenseDetailById(id);
    if (!expense) return null;

    const [lineItems, history, attachments] = await Promise.all([
      this.getLineItems(id),
      this.getRequestHistory(id),
      this.getAttachments(id)
    ]);

    return {
      ...expense,
      line_items: lineItems,
      history,
      attachments
    };
  }
}

module.exports = ExpenseModel;
