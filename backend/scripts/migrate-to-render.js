import pg from 'pg';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOCAL_URL = process.env.DATABASE_URL;
const REMOTE_URL = process.argv[2];

if (!REMOTE_URL) {
    console.error('Usage: node scripts/migrate-to-render.js "postgresql://..."');
    process.exit(1);
}

const TABLES = [
    'users',
    'works',
    'documents',
    'document_shares',
    'doc_responses',
    'comments',
    'notifications',
    'password_resets'
];

const local = new pg.Client({ connectionString: LOCAL_URL });
const remote = new pg.Client({
    connectionString: REMOTE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    await local.connect();
    console.log('✅ Connected to LOCAL DB');
    await remote.connect();
    console.log('✅ Connected to RENDER DB');

    // 1. Drop & recreate schema on remote using the fresh dump
    console.log('⏳ Wiping remote schema...');
    await remote.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
    console.log('✅ Remote schema cleared');

    const schemaPath = path.join(process.env.HOME, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    try {
        await remote.query(schema);
        console.log('✅ Schema applied to Render');
    } catch (e) {
        console.error('❌ Schema error:', e.message);
        throw e;
    }

    // 2. Copy each table
    for (const table of TABLES) {
        try {
            const { rows, fields } = await local.query(`SELECT * FROM ${table}`);
            if (rows.length === 0) {
                console.log(`  ${table}: 0 rows (skip)`);
                continue;
            }

            await remote.query(`DELETE FROM ${table}`);

            const cols = fields.map(f => f.name);
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            const colList = cols.map(c => `"${c}"`).join(', ');

            for (const row of rows) {
                const values = cols.map(c => row[c]);
                await remote.query(
                    `INSERT INTO ${table} (${colList}) VALUES (${placeholders})`,
                    values
                );
            }
            console.log(`  ${table}: ${rows.length} rows ✓`);
        } catch (e) {
            console.error(`  ${table}: FAILED — ${e.message}`);
        }
    }

    // 3. Reset ID sequences
    for (const table of TABLES) {
        try {
            await remote.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${table}), 1),
          true
        )
      `);
        } catch { /* skip tables without id/sequence */ }
    }

    console.log('\n🎉 Migration complete');
    await local.end();
    await remote.end();
}

main().catch(e => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
});