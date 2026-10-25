const fs = require('fs');
const path = require('path');
const db = require('../config/database');

function initializeDatabase() {
  try {
    const schemaFile = db.type === 'postgres' ? 'schema-postgresql.sql' : 'schema-sqlite.sql';
    const schemaPath = path.join(__dirname, schemaFile);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    if (db.type === 'sqlite') {
      db.exec(sql);
    } else {
      // PostgreSQL
      db.rawPool.query(sql);
    }
    console.log(`[Database] Initialized successfully using ${db.type} schema.`);
  } catch (err) {
    console.error('[Database] Initialization error:', err);
    throw err;
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };

