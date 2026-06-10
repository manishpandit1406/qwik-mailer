const postgres = require('postgres');
const sql = postgres('postgresql://postgres:admin123@localhost:5432/qwikmailer');
async function run() {
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  for (let t of tables) {
    await sql.unsafe(`DROP TABLE IF EXISTS "${t.tablename}" CASCADE`);
  }
  try { await sql.unsafe(`DROP TYPE IF EXISTS "email_validation_status" CASCADE`); } catch(e){}
  try { await sql.unsafe(`DROP TYPE IF EXISTS "email_status" CASCADE`); } catch(e){}
  console.log("Tables dropped");
  process.exit(0);
}
run();
