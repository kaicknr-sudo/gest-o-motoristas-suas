const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
 postgresql://postgres:Kaicknr$@db.jvgrkhkitozuuqkmzsfx.supabase.co:5432/postgres
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
