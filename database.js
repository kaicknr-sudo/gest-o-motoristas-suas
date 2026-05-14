const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://postgres.jvgrkhkitozuuqkmzsfx:Kaick2012190@aws-1-sa-east-1.pooler.supabase.com:6543/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;