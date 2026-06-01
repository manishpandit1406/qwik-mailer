import { db } from "@qwikmailer/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import "dotenv/config";

function generateJWT(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing");
  const base64url = (str: string | Buffer) => 
    (typeof str === 'string' ? Buffer.from(str) : str)
      .toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: userId, source: 'dashboard', iat: Math.floor(Date.now()/1000) }));
  const signature = base64url(crypto.createHmac('sha256', secret).update(header + '.' + payload).digest());
  return `${header}.${payload}.${signature}`;
}

async function run() {
  console.log("Fetching a user...");
  const userList = await db.execute(sql`SELECT id FROM users LIMIT 1`);
  if (userList.length === 0) {
    console.log("No user found!");
    process.exit(1);
  }
  const userId = userList[0].id as string;
  const token = generateJWT(userId);

  console.log("Generating 50,000 emails payload...");
  const emails = [];
  for (let i = 0; i < 50000; i++) {
    emails.push({
      to: `api_bulk_test_${i}@example.com`,
      subject: `Massive Bulk API Test (50k) - Email ${i}`,
      html: `<p>Hello from API bulk test ${i}</p>`,
      fromName: "API Tester",
    });
  }

  console.log(`Sending payload to API (size: ${(JSON.stringify({ emails }).length / 1024 / 1024).toFixed(2)} MB)...`);

  const start = Date.now();
  const res = await fetch("http://localhost:4000/v1/bulk-send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ emails })
  });

  const json = await res.json();
  console.log(`Response received in ${Date.now() - start}ms:`, json);
  process.exit(0);
}

run().catch(console.error);
