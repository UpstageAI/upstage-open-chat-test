// Credit goes to Anthropic Claude Sonnet 3.5 for helping write this script!
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const fs = require('fs').promises;
// Configuration
const SQLITE_DB_PATH = 'webui.db'; // Change this to be the path to your sqlite db
const PG_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
};
// Helper function to convert SQLite types to PostgreSQL types
function sqliteToPgType(sqliteType) {
switch (sqliteType.toUpperCase()) {
case 'INTEGER': return 'INTEGER';
case 'REAL': return 'DOUBLE PRECISION';
case 'TEXT': return 'TEXT';
case 'BLOB': return 'BYTEA';
default: return 'TEXT';
}
}
// Helper function to handle reserved keywords
function getSafeIdentifier(identifier) {
const reservedKeywords = ['user', 'group', 'order', 'table', 'select', 'where', 'from', 'index', 'constraint'];
return reservedKeywords.includes(identifier.toLowerCase()) ? `"${identifier}"` : identifier;
}
async function migrate() {
// Connect to SQLite database
const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH);
// Connect to PostgreSQL database
const pgClient = new Client(PG_CONFIG);
await pgClient.connect();
try {
// Get list of tables from SQLite
const tables = await new Promise((resolve, reject) => {
sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
if (err) reject(err);
else resolve(rows);
});
});
for (const table of tables) {
const tableName = table.name;
// Skip "migratehistory" and "alembic_version" tables
if (tableName === "migratehistory" || tableName === "alembic_version") {
console.log(`Skipping table: ${tableName}`);
continue;
}
const safeTableName = getSafeIdentifier(tableName);
console.log(`Checking table: ${tableName}`);
// Check if table exists in PostgreSQL and has any rows
const result = await pgClient.query(`SELECT COUNT(*) FROM ${safeTableName}`);
const rowCount = parseInt(result.rows[0].count, 10);
if (rowCount > 0) {
console.log(`Skipping table: ${tableName} because it has ${rowCount} existing rows`);
continue;
}
console.log(`Migrating table: ${tableName}`);
// Get table schema from PostgreSQL to determine column types
const pgSchema = await pgClient.query(
`SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = $1`,
[safeTableName]
);
const pgColumnTypes = {};
pgSchema.rows.forEach(col => {
pgColumnTypes[col.column_name] = col.data_type;
});
// Get table schema from SQLite
const schema = await new Promise((resolve, reject) => {
sqliteDb.all(`PRAGMA table_info(\`${tableName}\`)`, (err, rows) => {
if (err) reject(err);
else resolve(rows);
});
});
// Create table in PostgreSQL if it doesn't exist
const columns = schema.map(col => `${getSafeIdentifier(col.name)} ${sqliteToPgType(col.type)}`).join(', ');
await pgClient.query(`CREATE TABLE IF NOT EXISTS ${safeTableName} (${columns})`);
// Get data from SQLite
const rows = await new Promise((resolve, reject) => {
sqliteDb.all(`SELECT * FROM \`${tableName}\``, (err, rows) => {
if (err) reject(err);
else resolve(rows);
});
});
// Insert data into PostgreSQL
for (const row of rows) {
const columns = Object.keys(row).map(getSafeIdentifier).join(', ');
const values = Object.entries(row).map(([key, value]) => {
const columnType = pgColumnTypes[key]; // Get the type of the column in PostgreSQL
// Handle boolean conversion for PostgreSQL
if (columnType === 'boolean') {
return value === 1 ? 'true' : 'false'; // Explicitly convert 1 to 'true' and 0 to 'false'
}
if (value === null) return 'NULL'; // Handle NULL values
return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value; // Handle string escaping
}).join(', ');
// Insert data into PostgreSQL
await pgClient.query(`INSERT INTO ${safeTableName} (${columns}) VALUES (${values})`);
}
console.log(`Migrated ${rows.length} rows from ${tableName}`);
}
console.log("Migration completed successfully!");
} catch (error) {
console.error("Error during migration:", error);
} finally {
// Close database connections
sqliteDb.close();
await pgClient.end();
}
}
migrate();