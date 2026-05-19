const pool = require('../db');

const checkOwnership = async (req, res, next) => {
  const expenseId = req.params.id;
  const employeeId = req.header('x-employee-id'); // Simulating auth header

  if (!employeeId) {
    return res.status(401).json({ error: 'Unauthorized: missing x-employee-id header' });
  }

  try {
    const result = await pool.query('SELECT employee_id, status FROM expense_requests WHERE id = $1', [expenseId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense request not found' });
    }

    if (result.rows[0].employee_id !== employeeId) {
      return res.status(403).json({ error: 'Forbidden: you do not own this request' });
    }

    req.expense = result.rows[0]; 
    next();
  } catch (error) {
    console.error('Error in checkOwnership:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  checkOwnership
};
