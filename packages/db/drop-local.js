const postgres = require('postgres');
const sql = postgres('postgresql://qwikmailer:qwikmailer_secret@localhost:5432/qwikmailer');
async function run() {
  await sql`DROP SCHEMA public CASCADE;`;
  await sql`CREATE SCHEMA public;`;
  console.log("Schema dropped");
  process.exit(0);
}
run();
