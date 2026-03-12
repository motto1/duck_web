import argon2 from "argon2";

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

console.log(await argon2.hash(password));
