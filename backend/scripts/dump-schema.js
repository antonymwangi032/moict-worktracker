import pg from 'pg';
import 'dotenv/config';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// Get all CREATE statements for tables
const { rows: tables } = await c.query(`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`);

console.log('BEGIN;');
console.log('DROP SCHEMA public CASCADE;');
console.log('CREATE SCHEMA public;');
console.log('');

// For each table, get its DDL via pg_dump-like reconstruction
for (const { tablename } of tables) {
    // Get columns
    const { rows: cols } = await c.query(`
    SELECT
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default,
      udt_name
    FROM information_schema.columns
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position
  `, [tablename]);

    const colDefs = cols.map(col => {
        let type = col.data_type;
        if (col.character_maximum_length) type = `varchar(${col.character_maximum_length})`;
        if (col.data_type === 'ARRAY') type = `${col.udt_name.replace(/^_/, '')}[]`;
        if (col.data_type === 'USER-DEFINED') type = col.udt_name;
        if (col.udt_name === 'int4') type = 'integer';
        if (col.udt_name === 'int8') type = 'bigint';
        if (col.udt_name === 'bool') type = 'boolean';
        if (col.udt_name === 'text') type = 'text';
        if (col.udt_name === 'timestamptz') type = 'timestamptz';
        if (col.udt_name === 'timestamp') type = 'timestamp';
        if (col.udt_name === 'jsonb') type = 'jsonb';
        if (col.udt_name === 'json') type = 'json';
        if (col.udt_name === 'uuid') type = 'uuid';

        const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
        const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        return `  "${col.column_name}" ${type}${def}${nullable}`;
    });

    // Get primary key
    const { rows: pk } = await c.query(`
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass AND i.indisprimary
  `, [tablename]);

    console.log(`CREATE TABLE IF NOT EXISTS "${tablename}" (`);
    console.log(colDefs.join(',\n'));
    if (pk.length > 0) {
        console.log(`  , PRIMARY KEY (${pk.map(p => `"${p.attname}"`).join(', ')})`);
    }
    console.log(');');
    console.log('');
}

// Sequences
const { rows: seqs } = await c.query(`
  SELECT sequence_name FROM information_schema.sequences
  WHERE sequence_schema = 'public'
`);
for (const { sequence_name } of seqs) {
    console.log(`CREATE SEQUENCE IF NOT EXISTS "${sequence_name}";`);
}

console.log('COMMIT;');

await c.end();