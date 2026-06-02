const postgres = require("postgres");
const sql = postgres("postgresql://postgres@localhost:5432/qwikmailer");

async function run() {
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'emails';
  `;
  console.log(columns);
  process.exit(0);
}
run();
