// backend/src/controllers/expenseController.js
import { isSupabaseConfigured, supabase } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

// --- BE-1: REFERENCE DATA API ---
export const getCategories = async (req, res) => {
  if (!isSupabaseConfigured) {
    return res.status(500).json({ error: 'Supabase is not configured.' });
  }

  try {
    const { data, error } = await supabase.from('expense_categories').select('id, name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch expense categories.' });
  }
};

// --- BE-4: CREATE EXPENSE REQUEST API ---
export const createExpense = async (req, res) => {
  if (!isSupabaseConfigured) {
    return res.status(500).json({ error: 'Supabase is not configured.' });
  }

  const { startDate, endDate, parsedLineItems, isDraft, employeeId, category, categoryId } = req.body;
  const files = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files || {}).flat();

  try {
    const normalizedEmployeeId = Number(employeeId);
    if (!Number.isInteger(normalizedEmployeeId) || normalizedEmployeeId <= 0) {
      return res.status(400).json({ error: 'employeeId is required and must be a valid number.' });
    }

    let normalizedCategoryId = Number(categoryId);
    if (!Number.isInteger(normalizedCategoryId) || normalizedCategoryId <= 0) {
      const categoryName = typeof category === 'string' ? category.trim() : '';

      if (!categoryName) {
        return res.status(400).json({ error: 'category is required.' });
      }

      const { data: categoryRow, error: categoryError } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (categoryError || !categoryRow) {
        return res.status(400).json({ error: `Unknown expense category: ${categoryName}` });
      }

      normalizedCategoryId = categoryRow.id;
    }

    // Determine initial status based on the "Save as Draft" button
    const status = isDraft === 'true' ? 'Draft' : 'Pending Manager';

    // 1. Insert the main Expense Request
    const { data: requestData, error: requestError } = await supabase
      .from('expense_requests')
      .insert([{
        employee_id: normalizedEmployeeId,
        category_id: normalizedCategoryId,
        start_date: startDate,
        end_date: endDate,
        status: status
      }])
      .select('id')
      .single();

    if (requestError) throw requestError;
    const requestId = requestData.id;

    // 2. Insert Line Items
    const formattedLineItems = parsedLineItems.map(item => ({
      expense_request_id: requestId,
      expense_date: item.date,
      item_service_name: item.name,
      amount: item.amount,
      purpose_note: item.note
    }));

    const { error: lineItemsError } = await supabase
      .from('expense_line_items')
      .insert(formattedLineItems);

    if (lineItemsError) throw lineItemsError;

    // 3. Upload Files to Storage & Save to Attachments Table
    const uploadWarnings = [];

    if (files && files.length > 0) {
      const attachmentInserts = [];

      for (const file of files) {
        const fileName = `${requestId}/${uuidv4()}-${file.originalname}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, file.buffer, {
              contentType: file.mimetype
            });

          if (uploadError) {
            uploadWarnings.push(`Skipped ${file.originalname}: ${uploadError.message}`);
            continue;
          }

          attachmentInserts.push({
            expense_request_id: requestId,
            file_name: file.originalname,
            file_url: fileName,
            file_size_bytes: file.size
          });
        } catch (uploadError) {
          uploadWarnings.push(`Skipped ${file.originalname}: ${uploadError.message}`);
        }
      }

      if (attachmentInserts.length > 0) {
        const { error: attachError } = await supabase.from('attachments').insert(attachmentInserts);
        if (attachError) throw attachError;
      }
    }

    return res.status(201).json({
      message: 'Expense request created successfully',
      id: requestId,
      warnings: uploadWarnings
    });

  } catch (error) {
    console.error("Error creating expense:", error);
    return res.status(500).json({ error: "Failed to create expense request." });
  }
};