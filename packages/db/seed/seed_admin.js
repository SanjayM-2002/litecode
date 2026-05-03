// Seed an ADMIN user + AdminProfile with all permissions.
// Run from packages/db: `node seed/seed_admin.js`
//
// Reads packages/db/.env for DATABASE_URL.
// Optional env overrides: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME

const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const cuid = require('cuid');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PERMISSIONS = [
  'CREATE_PROBLEM',
  'EDIT_PROBLEM',
  'MANAGE_USERS',
  'CREATE_CONTEST',
  'MANAGE_TEMPLATES',
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required (set it in packages/db/.env)');
  }

  const email = 'litecode-admin@yopmail.com';
  const password = 'Password123!';
  const name = 'Litecode Admin';

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'ADMIN', now(), now())
       ON CONFLICT (email) DO UPDATE
         SET role = 'ADMIN',
             password = EXCLUDED.password,
             name = EXCLUDED.name,
             "updatedAt" = now()
       RETURNING id`,
      [cuid(), email, passwordHash, name],
    );
    const userId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO "AdminProfile" (id, "userId", permissions, "createdAt", "updatedAt")
       VALUES ($1, $2, $3::"Permission"[], now(), now())
       ON CONFLICT ("userId") DO UPDATE
         SET permissions = EXCLUDED.permissions, "updatedAt" = now()`,
      [cuid(), userId, PERMISSIONS],
    );

    await client.query('COMMIT');

    console.log(`Admin seeded:`);
    console.log(`  email:       ${email}`);
    console.log(`  password:    ${password}`);
    console.log(`  userId:      ${userId}`);
    console.log(`  permissions: ${PERMISSIONS.join(', ')}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
