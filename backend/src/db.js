const { Pool } = require('pg');
require('dotenv').config();

// Assuming Supabase standard connection string format based on project ID and password.
// Provide a fallback if a full database URL is given.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgres://postgres.rkqexwmuiqtznlyqqvxz:${process.env.Password}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`,
});

module.exports = pool;