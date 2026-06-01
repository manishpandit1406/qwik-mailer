const postgres = require('postgres');
const sql = postgres("postgresql://postgres:admin123@localhost:5432/qwikmailer");
async function run() {
  const events = await sql`SELECT metadata FROM email_events WHERE event_type = 'failed' LIMIT 1`;
  console.log(events);
  process.exit(0);
}
run();
