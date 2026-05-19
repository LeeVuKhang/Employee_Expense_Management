// backend/src/index.js
import express from 'express';
import cors from 'cors';
import { uploadProofs, validateExpenseData } from './middleware/expenseMiddleware.js';
import { getCategories, createExpense } from './controllers/expenseController.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); // For parsing application/json

// --- EXPENSE ROUTES ---
// BE-1
app.get('/api/expense-categories', getCategories);

// BE-2, BE-3, and BE-4 combined
// Notice how Multer runs first to grab the files, then our validation, then the controller
app.post(
  '/api/expenses', 
  uploadProofs.fields([
    { name: 'proofs', maxCount: 3 },
    { name: 'attachments', maxCount: 3 }
  ]),
  validateExpenseData, 
  createExpense
);

// Global Error Handler for Multer (e.g. if they upload 4 files)
app.use((err, req, res, next) => {
  if (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend is running securely on port ${PORT}`);
});