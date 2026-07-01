#!/usr/bin/env node

const crypto = require('crypto');

const password = process.argv[2];

if (!password) {
  console.log('\nUsage: node scripts/hash-password.js <your-password>\n');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(password).digest('hex');
console.log(`\nPassword: ${password}`);
console.log(`SHA-256 Hash: ${hash}\n`);
console.log('Copy the SHA-256 Hash above and paste it into "data/presentations.json" for the desired entry.\n');
