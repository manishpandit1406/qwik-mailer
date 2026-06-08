import "dotenv/config";
import { db, users, teams, teamMembers } from "@qwikmailer/db";
import { eq, sql, isNull } from "drizzle-orm";
import crypto from "crypto";

async function fixOrphanUsers() {
  console.log("Looking for users without a team...");
  
  // Find users who have NO entries in teamMembers
  const orphanUsers = await db.execute(sql`
    SELECT u.id, u.name, u.company_name
    FROM users u
    LEFT JOIN team_members tm ON u.id = tm.user_id
    WHERE tm.id IS NULL
  `);
  
  const usersToFix = (orphanUsers as any).rows || orphanUsers;
  console.log(`Found ${usersToFix.length} users without a team.`);

  for (const u of usersToFix) {
    const companyName = u.company_name || u.name || "My Team";
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      + "-" + crypto.randomBytes(3).toString("hex");

    console.log(`Creating team for user ${u.id}...`);
    
    try {
      const result = await db.execute(
        sql`INSERT INTO teams (owner_id, name, slug) VALUES (${u.id}, ${companyName}, ${slug}) RETURNING *`
      );
      const team = Array.isArray(result) ? result[0] : (result as any).rows?.[0] || result[0];
      
      await db.execute(
        sql`INSERT INTO team_members (team_id, user_id, role) VALUES (${team.id}, ${u.id}, 'owner')`
      );
      console.log(`✅ Fixed user ${u.id}`);
    } catch (err) {
      console.error(`❌ Failed for user ${u.id}:`, err);
    }
  }

  console.log("Done!");
  process.exit(0);
}

fixOrphanUsers();
