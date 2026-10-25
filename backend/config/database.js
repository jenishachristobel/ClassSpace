const path = require('path');
const fs = require('fs');
const env = require('./env');

let dbClient = null;

if (env.DB_CLIENT === 'postgres') {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  dbClient = {
    type: 'postgres',
    rawPool: pool,
    async query(sql, params = []) {
      // Convert ? to $1, $2, etc. for PostgreSQL compatibility
      let index = 1;
      const pgSql = sql.replace(/\?/g, () => `$${index++}`);
      const res = await pool.query(pgSql, params);
      return res.rows;
    },
    async get(sql, params = []) {
      const rows = await this.query(sql, params);
      return rows[0] || null;
    },
    async run(sql, params = []) {
      let index = 1;
      const pgSql = sql.replace(/\?/g, () => `$${index++}`);
      const res = await pool.query(pgSql, params);
      return { changes: res.rowCount, lastInsertRowid: res.rows[0]?.id || null };
    },
    async exec(sql) {
      return pool.query(sql);
    },
    async transaction(callback) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const txWrapper = {
          async query(sql, params = []) {
            let index = 1;
            const pgSql = sql.replace(/\?/g, () => `$${index++}`);
            const res = await client.query(pgSql, params);
            return res.rows;
          },
          async get(sql, params = []) {
            const rows = await this.query(sql, params);
            return rows[0] || null;
          },
          async run(sql, params = []) {
            let index = 1;
            const pgSql = sql.replace(/\?/g, () => `$${index++}`);
            const res = await client.query(pgSql, params);
            return { changes: res.rowCount, lastInsertRowid: res.rows[0]?.id || null };
          }
        };
        const result = await callback(txWrapper);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  };
} else {
  // SQLite with better-sqlite3 (Zero config, perfect for academic demo on any OS)
  const Database = require('better-sqlite3');
  const dbDir = path.dirname(path.resolve(__dirname, '..', env.DB_PATH));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(path.resolve(__dirname, '..', env.DB_PATH));
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  dbClient = {
    type: 'sqlite',
    rawDb: sqlite,
    query(sql, params = []) {
      const stmt = sqlite.prepare(sql);
      return stmt.all(params);
    },
    get(sql, params = []) {
      const stmt = sqlite.prepare(sql);
      return stmt.get(params) || null;
    },
    run(sql, params = []) {
      const stmt = sqlite.prepare(sql);
      const info = stmt.run(params);
      return {
        changes: info.changes,
        lastInsertRowid: Number(info.lastInsertRowid)
      };
    },
    exec(sql) {
      return sqlite.exec(sql);
    },
    transaction(callback) {
      const tx = sqlite.transaction(callback);
      return tx(this);
    }
  };
}

module.exports = dbClient;

