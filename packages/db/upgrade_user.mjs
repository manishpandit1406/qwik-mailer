import postgres from 'postgres';
const sql = postgres("postgresql://postgres:admin123@localhost:5432/qwikmailer");
async function upgrade() {
  try {
    const users = await sql`UPDATE users SET plan = 'enterprise', monthly_email_count = 0 RETURNING email, plan`;
    console.log("Success! Upgraded users:", users);
  } catch(err) {
    console.error(err);
  }
  process.exit(0);
}
upgrade();
