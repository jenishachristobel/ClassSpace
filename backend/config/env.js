require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'classspace_super_secret_jwt_key_2024_secure_and_reliable',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  PLAGIARISM_SECRET: process.env.PLAGIARISM_SECRET || 'classspace_plagiarism_hmac_secret_key_9988',
  PLAGIARISM_CHECKER_URL: process.env.VITE_PLAGIARISM_APP_URL || process.env.PLAGIARISM_CHECKER_URL || 'http://localhost:5001/verify-plagiarism',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DB_CLIENT: process.env.DB_CLIENT || 'sqlite',
  DB_PATH: process.env.DB_PATH || './data/classspace.db',
  DATABASE_URL: process.env.DATABASE_URL || '',
  INSTITUTIONAL_DOMAIN: (process.env.INSTITUTIONAL_DOMAIN || 'karunya.edu.in').toLowerCase(),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || ''
};
