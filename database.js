const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "@db.jvgrkhkitozuuqkmzsfx.supabase.co:5432/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
