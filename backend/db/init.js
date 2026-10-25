const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function initializeDatabase() {
  const schemaFile =
    db.type === 'postgres' ? 'schema-postgresql.sql' : 'schema-sqlite.sql';

  const schemaPath = path.join(__dirname, schemaFile);
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    if (db.type === 'sqlite') {
      db.exec(sql);
    } else {
      await db.rawPool.query(sql);
    }

    console.log(`[Database] Initialized successfully using ${db.type} schema.`);
  } catch (err) {
    console.error('[Database] Initialization error:', err);
    throw err;
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('[Database] Initialization completed.');
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = { initializeDatabase };