import 'dotenv/config';
import { q, pool } from '../src/config/db.js';
import { hash } from '../src/utils/hash.js';

const PRIMARY = {
  name: 'MoICT Admin',
  email: 'info.csmwangi@gmail.com',
  phone: '+254715767638',
  role: 'admin',
  isPrimary: true
};

const plainPassword = process.argv[2] || 'Admin@1234';

async function main() {
  const existing = await q('SELECT 1 FROM users WHERE LOWER(email)=LOWER($1)', [PRIMARY.email]);
  if (existing.rowCount) {
    console.log(`ℹ️  Primary admin already exists: ${PRIMARY.email}`);
  } else {
    const password_hash = await hash(plainPassword);
    await q(
      `INSERT INTO users (name, email, phone, role, password_hash, is_primary)
       VALUES ($1,$2,$3,$4,$5,TRUE)`,
      [PRIMARY.name, PRIMARY.email, PRIMARY.phone, PRIMARY.role, password_hash]
    );
    console.log(`✅ Primary admin created`);
    console.log(`   email:    ${PRIMARY.email}`);
    console.log(`   password: ${plainPassword}`);
  }
  await pool.end();
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});