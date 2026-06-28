const postgres = require('postgres');
const bcrypt = require('bcryptjs');

async function main() {
  const newHash = bcrypt.hashSync('Admin@123!', 10);
  
  // Update Local DB
  const sqlLocal = postgres("postgresql://qwikmailer:qwikmailer_secret@localhost:5432/qwikmailer");
  await sqlLocal`UPDATE users SET password_hash = ${newHash} WHERE email = 'manishp2119@gmail.com'`;
  console.log("Local DB updated");
  await sqlLocal.end();

  // Print command for EC2
  console.log("Run this on EC2:");
  console.log(`docker exec qwikmailer_postgres psql -U qwikmailer -d qwikmailer -c "UPDATE users SET password_hash = '${newHash}' WHERE email = 'manishp2119@gmail.com';"`);
}
main().catch(console.error);
