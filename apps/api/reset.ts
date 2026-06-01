import { db, users } from '@qwikmailer/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'manishp2119@gmail.com';
  const newPassword = 'ManishTest123!';
  const hash = await bcrypt.hash(newPassword, 12);
  
  const result = await db.update(users).set({ passwordHash: hash }).where(eq(users.email, email)).returning();
  if (result.length > 0) {
    console.log('Password successfully reset for ' + email);
    console.log('New Password: ' + newPassword);
  } else {
    console.log('Failed to update password. User not found?');
  }
}
main().catch(console.error);
