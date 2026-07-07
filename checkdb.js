require('dotenv').config();
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.query("SELECT tablename FROM pg_tables WHERE schemaname='public'"))
  .then((r) => {
    console.log('TABLES:', JSON.stringify(r.rows));
    return c.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'");
  })
  .then((r) => {
    console.log('INDEXES:', JSON.stringify(r.rows));
    c.end();
  })
  .catch((e) => {
    console.error('ERR', e.message);
    c.end();
  });
