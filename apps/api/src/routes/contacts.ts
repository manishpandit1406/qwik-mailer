import type { FastifyInstance } from "fastify";
import { eq, and, desc, ilike, or, sql, inArray } from "drizzle-orm";
import { db, contacts, contactListMembers, users, teams } from "@qwikmailer/db";
import { authenticate, requireTeamRole } from "../middleware/auth.js";
import { checkContactQuota } from "../middleware/quota.js";
import { PlanType, PlanLimits } from "../config/plans.js";
import * as XLSX from "xlsx";
import { z } from "zod";
import { ValidationService } from "../services/validation.service.js";

export async function contactRoutes(app: FastifyInstance) {
  // GET /v1/contacts (Paginated & Searchable)
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { page = 1, limit = 50, search = "", tags = "", listId = "" } = req.query as { page?: number; limit?: number; search?: string; tags?: string; listId?: string };
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let conditions = eq(contacts.teamId, teamId);
    if (search) {
      const searchPattern = `%${search}%`;
      conditions = and(
        conditions,
        or(
          ilike(contacts.email, searchPattern),
          ilike(contacts.firstName, searchPattern),
          ilike(contacts.lastName, searchPattern)
        )
      )! as any;
    }
    
    if (listId) {
      const members = await db.select({ contactId: contactListMembers.contactId }).from(contactListMembers).where(eq(contactListMembers.listId, listId));
      const memberIds = members.map(m => m.contactId);
      if (memberIds.length === 0) {
         return reply.send({ success: true, data: [], meta: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 } });
      }
      conditions = and(conditions, inArray(contacts.id, memberIds))! as any;
    }

    if (tags) {
       const tagArray = tags.split(",").map(t => t.trim()).filter(Boolean);
       if (tagArray.length > 0) {
         const tagConditions = tagArray.map(t => sql`${contacts.tags} @> ${JSON.stringify([t])}::jsonb`);
         conditions = and(conditions, or(...tagConditions))! as any;
       }
    }

    const userContacts = await db.query.contacts.findMany({
      where: conditions,
      orderBy: [desc(contacts.createdAt)],
      limit: Number(limit),
      offset: Number(offset),
    });

    const [totalCount] = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(contacts)
      .where(conditions);

    return reply.send({ 
      success: true, 
      data: userContacts,
      meta: {
        total: totalCount.count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount.count / Number(limit))
      }
    });
  });

  // GET /v1/contacts/export
  app.get("/export", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const userContacts = await db.query.contacts.findMany({
      where: eq(contacts.teamId, teamId),
      orderBy: [desc(contacts.createdAt)],
    });
    
    const escapeCsv = (str: string | null | undefined) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    const header = "First Name,Last Name,Email,Phone,Added At\n";
    const rows = userContacts.map(c => 
      `${escapeCsv(c.firstName)},${escapeCsv(c.lastName)},${escapeCsv(c.email)},${escapeCsv(c.phone)},${escapeCsv(c.createdAt?.toISOString())}`
    ).join("\n");
    
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="contacts-${new Date().toISOString().split('T')[0]}.csv"`);
    return reply.send(header + rows);
  });

  // PUT /v1/contacts/:id
  app.put("/:id", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id } = req.params as { id: string };
    const { tags, firstName, lastName, phone } = req.body as any;

    const [updatedContact] = await db.update(contacts)
      .set({ 
        tags, 
        firstName, 
        lastName, 
        phone,
        updatedAt: new Date()
      })
      .where(and(eq(contacts.id, id), eq(contacts.teamId, teamId)))
      .returning();

    if (!updatedContact) return reply.code(404).send({ success: false, error: "Contact not found" });
    return reply.send({ success: true, data: updatedContact });
  });

  // GET /v1/contacts/tags
  app.get("/tags", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    // Extract unique tags used across this team's contacts
    const result = await db.execute(sql`
      SELECT DISTINCT jsonb_array_elements_text(tags) as tag
      FROM contacts
      WHERE team_id = ${teamId} AND jsonb_typeof(tags) = 'array'
    `);
    const tags = result.map((r: any) => r.tag);
    return reply.send({ success: true, data: tags });
  });

  // DELETE /v1/contacts/:id
  app.delete("/:id", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id } = req.params as { id: string };
    const [deletedContact] = await db.delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.teamId, teamId)))
      .returning();
      
    if (!deletedContact) return reply.code(404).send({ success: false, error: "Contact not found" });
    return reply.send({ success: true, message: "Contact deleted" });
  });

  // POST /v1/contacts
  app.post("/", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"]), checkContactQuota] }, async (req, reply) => {
    const teamId = req.teamId!;
    const schema = z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      tags: z.array(z.string()).optional(),
      customFields: z.record(z.any()).optional()
    });

    const body = schema.parse(req.body);
    const apiTags = body.tags || [];
    
    // Construct SQL to append each new tag without duplicating
    let tagsSql = sql`COALESCE(${contacts.tags}, '[]'::jsonb)`;
    if (apiTags.length > 0) {
      for (const tag of apiTags) {
         tagsSql = sql`CASE WHEN ${tagsSql} @> ${JSON.stringify([tag])}::jsonb THEN ${tagsSql} ELSE ${tagsSql} || ${JSON.stringify([tag])}::jsonb END`;
      }
    }

    // Validate email
    const validation = await ValidationService.validate(body.email);

    const [contact] = await db.insert(contacts).values({
      teamId,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      customFields: body.customFields || {},
      tags: apiTags,
      validationStatus: validation.status,
      validationScore: validation.score,
      lastValidatedAt: validation.validatedAt,
    }).onConflictDoUpdate({
      target: [contacts.teamId, contacts.email],
      set: {
        firstName: body.firstName ?? sql`${contacts.firstName}`,
        lastName: body.lastName ?? sql`${contacts.lastName}`,
        phone: body.phone ?? sql`${contacts.phone}`,
        customFields: body.customFields ? sql`${contacts.customFields} || ${JSON.stringify(body.customFields)}::jsonb` : sql`${contacts.customFields}`,
        tags: apiTags.length > 0 ? tagsSql : sql`${contacts.tags}`,
        validationStatus: validation.status,
        validationScore: validation.score,
        lastValidatedAt: validation.validatedAt,
        updatedAt: new Date()
      }
    }).returning();

    return reply.send({ success: true, data: contact });
  });

  // POST /v1/contacts/import
  app.post("/import", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = req.teamId!;
    const parts = req.parts();
    
    let fileBuffer: Buffer | null = null;
    let filename = "";

    for await (const part of parts) {
      if (part.type === "file") {
        filename = part.filename;
        fileBuffer = await part.toBuffer();
      }
    }

    if (!fileBuffer) return reply.code(400).send({ success: false, error: "File required" });

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

    if (rows.length === 0) return reply.code(400).send({ success: false, error: "File is empty" });
    if (rows.length > 50000) return reply.code(400).send({ success: false, error: "Maximum 50,000 rows allowed" });

    // Check Quota Manually
    const user = await db.query.users.findFirst({
      where: eq(users.id, (req.user as any).sub),
      columns: { plan: true, id: true }
    });
    
    // If not found, try to find owner of the team
    let ownerId = user?.id;
    let plan = user?.plan || "free";
    
    if (!user) {
      const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
      if (team) {
        ownerId = team.ownerId;
        const owner = await db.query.users.findFirst({ where: eq(users.id, team.ownerId) });
        plan = owner?.plan || "free";
      }
    }

    const limitsConfig = await import("../config/plans.js");
    const limits = limitsConfig.PLAN_LIMITS[plan as PlanType] || limitsConfig.PLAN_LIMITS.free;
    
    let currentContacts = 0;
    if (ownerId) {
      const resCount = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM contacts c
        JOIN teams t ON c.team_id = t.id
        WHERE t.owner_id = ${ownerId}
      `);
      const rowsCount = (resCount as any).rows || resCount;
      currentContacts = Number(rowsCount[0]?.count || 0);
    }

    if (currentContacts + rows.length > limits.maxContacts) {
      return reply.code(402).send({ success: false, error: `Contact limit exceeded. Maximum ${limits.maxContacts} contacts allowed on the ${plan} plan. You are trying to add ${rows.length} contacts.` });
    }

    const listTag = `List: ${filename}`;
    let addedCount = 0;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const CHUNK_SIZE = 1000;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const insertPayloads = [];
      
      for (const row of chunk) {
        let email = "";
        let firstName = "";
        let lastName = "";
        let phone = "";
        let customFields: Record<string, any> = {};

        // Find keys dynamically to handle BOMs, spaces, and case sensitivity
        for (const key of Object.keys(row)) {
          const cleanKey = key.replace(/^\uFEFF/, "").trim();
          const lowerK = cleanKey.toLowerCase();
          const val = row[key] ? row[key].toString().trim() : "";
          
          if (lowerK === "email" || lowerK === "e-mail") email = val;
          else if (lowerK === "first_name" || lowerK === "firstname" || lowerK === "name" || lowerK === "fullname") firstName = val;
          else if (lowerK === "last_name" || lowerK === "lastname") lastName = val;
          else if (lowerK === "phone" || lowerK === "mobile") phone = val;
          else customFields[cleanKey] = val; // Store original key for custom fields
        }

        if (!email || !emailRegex.test(email)) continue;
        
        insertPayloads.push({
          teamId,
          email,
          firstName,
          lastName,
          phone,
          customFields,
          tags: [listTag]
        });
        addedCount++;
      }
      
      if (insertPayloads.length > 0) {
        // Use batch upsert for performance and reliability
        await db.insert(contacts).values(insertPayloads).onConflictDoUpdate({
          target: [contacts.teamId, contacts.email],
          set: {
            firstName: sql`EXCLUDED.first_name`,
            lastName: sql`EXCLUDED.last_name`,
            phone: sql`EXCLUDED.phone`,
            customFields: sql`EXCLUDED.custom_fields`,
            tags: sql`CASE WHEN ${contacts.tags} @> EXCLUDED.tags THEN ${contacts.tags} ELSE COALESCE(${contacts.tags}, '[]'::jsonb) || EXCLUDED.tags END`,
            updatedAt: new Date()
          }
        });
      }
    }

    // Fire-and-forget background validation
    (async () => {
      try {
        console.log(`[Import] Starting background validation for ${rows.length} contacts...`);
        for (let i = 0; i < rows.length; i += 20) {
          const chunk = rows.slice(i, i + 20);
          await Promise.all(chunk.map(async (row) => {
            let email = "";
            for (const key of Object.keys(row)) {
              const lowerK = key.replace(/^\uFEFF/, "").trim().toLowerCase();
              if (lowerK === "email" || lowerK === "e-mail") {
                email = row[key] ? row[key].toString().trim() : "";
                break;
              }
            }
            if (email && emailRegex.test(email)) {
              const validation = await ValidationService.validate(email);
              await db.update(contacts)
                .set({
                  validationStatus: validation.status,
                  validationScore: validation.score,
                  lastValidatedAt: validation.validatedAt
                })
                .where(and(eq(contacts.teamId, teamId), eq(contacts.email, email)));
            }
          }));
        }
        console.log(`[Import] Background validation complete.`);
      } catch (err) {
        console.error("[Import] Background validation failed:", err);
      }
    })();

    return reply.send({ success: true, message: `Imported ${addedCount} contacts. Validation is running in the background.`, count: addedCount });
  });
}
