const postgres = require('postgres');

async function main() {
  const sqlLocal = postgres("postgresql://qwikmailer:qwikmailer_secret@localhost:5432/qwikmailer");
  
  // Update Local
  await sqlLocal`UPDATE users SET password_hash = ${'$2a$10$0zbLnHvxvIZdXxVXYVan2.9kgL4dS0u/LK2FLYE/Kgj61kjWz6j4O'} WHERE email = 'manishp2119@gmail.com'`;
  console.log("Local updated");
  await sqlLocal.end();
}
main().catch(console.error);
