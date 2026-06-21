require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const file = process.argv[2] || '003_salon_masters.sql';
const sqlPath = path.join(__dirname, '../db/migrations', file);

async function main() {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`Running migration: ${file}`);
  await db.query(sql);
  console.log('Migration OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
