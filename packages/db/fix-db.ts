import postgres from "postgres";
const sql = postgres("postgresql://postgres:postgres@localhost:5432/qwikmailer");
async function run() {
  try {
    await sql`ALTER TABLE "users" ADD COLUMN "company_address" text;`;
    await sql`ALTER TABLE "users" ADD COLUMN "company_address_2" text;`;
    await sql`ALTER TABLE "users" ADD COLUMN "city" varchar(100);`;
    await sql`ALTER TABLE "users" ADD COLUMN "state" varchar(100);`;
    await sql`ALTER TABLE "users" ADD COLUMN "zip_code" varchar(20);`;
    await sql`ALTER TABLE "users" ADD COLUMN "country" varchar(100);`;
    console.log("Added columns successfully!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await sql.end();
  }
}
run();
