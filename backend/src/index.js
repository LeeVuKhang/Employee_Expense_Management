const express = require('express');
require('dotenv').config();

const expenseRoutes = require('./routes/expenseRoutes');

const app = express();
app.use(express.json());

// Routes
app.use('/api/expenses', expenseRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
