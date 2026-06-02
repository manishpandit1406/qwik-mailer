import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const postgres = require("postgres");
const jwt = require("jsonwebtoken");

const sql = postgres("postgresql://postgres@localhost:5432/qwikmailer");
const API = "http://localhost:4000";
const SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

async function runTests() {
  try {
    const users = await sql`SELECT id, email FROM users LIMIT 1`;
    const user = users[0];
    
    const token = jwt.sign(
      { sub: user.id, email: user.email, plan: "enterprise", role: "user" },
      SECRET,
      { expiresIn: "1h" }
    );
    const headers = { Authorization: `Bearer ${token}` };

    console.log("\n[Test 1] Send Email with Category 'newsletter'");
    const res = await fetch(`${API}/v1/send`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "test@example.com",
        from: "bot99@promo.qwikmailer.in", // Trying to send from the shared domain
        subject: "Dynamic routing test",
        html: "<p>Hello</p>",
        category: "newsletter" // Should override subdomain to news.qwikmailer.in
      })
    });
    const result = await res.json();
    console.log(result);

    // Verify DB
    const emails = await sql`SELECT * FROM emails ORDER BY created_at DESC LIMIT 1`;
    console.log("Logged email in DB:");
    console.log("from_email:", emails[0].from_email);
    console.log("category:", emails[0].category);

  } catch (err) {
    console.error("Error during tests:", err);
  } finally {
    await sql.end();
  }
}

runTests();
