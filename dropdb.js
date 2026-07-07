require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');
const sql = fs.readFileSync('./prisma/migration.sql', 'utf8');

const acc = { list: [], buffer: '' };
sql.split(/\r?\n/).forEach((line) => {
  // Skip pure comment lines
  if (line.trim().startsWith('--')) return;
  acc.buffer += (acc.buffer ? '\n' : '') + line;
  const trimmed = acc.buffer.trim();
  if (trimmed.endsWith(';')) {
    acc.list.push(trimmed);
    acc.buffer = '';
  }
});
if (acc.buffer.trim()) acc.list.push(acc.buffer.trim());

const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(async () => {
    for (let i = 0; i < acc.list.length; i++) {
      const stmt = acc.list[i];
      try {
        await c.query(stmt);
      } catch (e) {
        console.error(`STMT ${i} FAILED (${stmt.slice(0, 80)}...):`, e.message);
        throw e;
      }
    }
    const r = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    console.log('TABLES:', JSON.stringify(r.rows.map(x => x.tablename)));
    await c.end();
  })
  .catch((e) => {
    console.error('ERR', e.message);
    c.end();
  });
