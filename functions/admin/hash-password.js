'use strict';
// Prints a password hash for ADMIN_PASSWORD_HASH and a random ADMIN_TOKEN_SECRET.
// Usage: node functions/admin/hash-password.js            (prompts)
//        node functions/admin/hash-password.js 'password'
const crypto = require('node:crypto');
const readline = require('node:readline');
const { hashPassword } = require('./auth');

function done(pw) {
  if (!pw || pw.length < 10) {
    console.error('Use a password of at least 10 characters.');
    process.exit(1);
  }
  console.log(`ADMIN_PASSWORD_HASH=${hashPassword(pw)}`);
  console.log(`ADMIN_TOKEN_SECRET=${crypto.randomBytes(32).toString('hex')}`);
}

if (process.argv[2]) done(process.argv[2]);
else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Admin password: ', (pw) => {
    rl.close();
    done(pw.trim());
  });
}
