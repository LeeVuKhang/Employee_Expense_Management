// backend/src/middlewares/expenseMiddleware.js
import multer from 'multer';

// --- BE-2: FILE UPLOAD MIDDLEWARE ---
// Store files in memory temporarily so we can upload them directly to Supabase Storage
const storage = multer.memoryStorage();

export const uploadProofs = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 3 // Max 3 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'));
    }
  }
}); // NOTE: Make sure your React app uses formData.append('proofs', file)

// --- BE-3: SERVER-SIDE VALIDATION ---
export const validateExpenseData = (req, res, next) => {
  try {
    // When using FormData, text fields come in as strings. We need to parse them.
    const { startDate, endDate, lineItems } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    // 1. Date logic validation
    if (start > end) return res.status(400).json({ error: "End date cannot be before start date" });
    if (start > now || end > now) return res.status(400).json({ error: "Future dates are not allowed" });

    // 2. Parse Line Items array
    const parsedItems = typeof lineItems === 'string' ? JSON.parse(lineItems) : lineItems;
    if (!parsedItems || parsedItems.length === 0) {
      return res.status(400).json({ error: "At least one expense line item is required" });
    }

    // 3. Line Items deep validation
    for (const item of parsedItems) {
      if (item.amount <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });
      if (new Date(item.date) > now) return res.status(400).json({ error: "Line item date cannot be in the future" });
    }

    // Attach parsed items back to request so the controller can use them easily
    req.body.parsedLineItems = parsedItems;
    next();
  } catch (error) {
    return res.status(400).json({ error: "Invalid form data format" });
  }
};