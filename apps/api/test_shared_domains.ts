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
    console.log(`Testing with user: ${user.email} (${user.id})`);

    const token = jwt.sign(
      { sub: user.id, email: user.email, plan: "enterprise", role: "user" },
      SECRET,
      { expiresIn: "1h" }
    );
    const headers = { Authorization: `Bearer ${token}` };

    const fetchApi = async (path: string, options: any = {}) => {
      const res = await fetch(`${API}${path}`, { 
        ...options, 
        headers: { ...headers, ...options.headers }
      });
      return res.json();
    };

    console.log("\n[Test 1] Create Sender 'bot99' (Marketing)");
    let res = await fetchApi("/v1/senders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bot99", displayName: "Bot 99", category: "marketing" })
    });
    console.log(res);

    const senders = await fetchApi("/v1/senders");
    const sender = senders.data.find((s: any) => s.username === "bot99");
    const senderId = sender?.id;
    console.log("Sender ID to delete:", senderId);

    console.log("\n[Test 2] Delete 'bot99'");
    if (senderId) {
      res = await fetchApi(`/v1/senders/${senderId}`, { method: "DELETE" });
      console.log(res);
    }

    console.log("\n[Test 3] Reclaim 'bot99'");
    res = await fetchApi("/v1/senders/check?username=bot99");
    console.log("Check:", res);
    
    res = await fetchApi("/v1/senders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bot99", displayName: "Reclaimed", category: "support" })
    });
    console.log("Create:", res);

  } catch (err) {
    console.error("Error during tests:", err);
  } finally {
    await sql.end();
  }
}

runTests();
