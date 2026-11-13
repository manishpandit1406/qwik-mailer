import type { FastifyInstance } from "fastify";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";
import { db, forms, formSubmissions, teams, teamMembers } from "@qwikmailer/db";
import { validateApiKey } from "../services/api-key.service.js";

const FORMS_URL = process.env.NEXT_PUBLIC_FORMS_URL || "https://forms.qwikmailer.in";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qwikmailer.in";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.qwikmailer.in";

const TOOLS = [
  {
    name: "create_form_from_prompt",
    description:
      "Create a complete, responsive web form with questions using natural language. For example: 'Create a Job Application form for Senior React Developer with Resume upload and Portfolio link' or 'Create an Event RSVP Form with dietary preferences'.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Natural language description of the form you want to create.",
        },
        formName: {
          type: "string",
          description: "Optional form title.",
        },
        requireGoogleAuth: {
          type: "boolean",
          description: "Whether respondents must sign in with Google (default: false).",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "create_form",
    description:
      "Create a custom web form with explicitly structured fields, styling, and settings. Supports text, textarea, email, tel, select, radio, checkbox, rating, range, date, time, url, file, signature, and section break fields.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Form name.",
        },
        status: {
          type: "string",
          enum: ["active", "draft", "inactive"],
          description: "Status of the form (default: 'active').",
        },
        design: {
          type: "object",
          description: "Optional form design with title, description, buttonText, buttonColor.",
        },
        settings: {
          type: "object",
          description: "Optional form settings: requireGoogleAuth, sendConfirmationEmail, limitOneResponse, maxSubmissions, expiresAt.",
        },
        schema: {
          type: "array",
          description: "List of field definitions for questions.",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: {
                type: "string",
                enum: [
                  "text",
                  "textarea",
                  "email",
                  "tel",
                  "select",
                  "radio",
                  "checkbox",
                  "rating",
                  "range",
                  "date",
                  "time",
                  "url",
                  "file",
                  "signature",
                  "section",
                ],
              },
              label: { type: "string" },
              name: { type: "string" },
              required: { type: "boolean" },
              options: { type: "array", items: { type: "string" } },
              helperText: { type: "string" },
              placeholder: { type: "string" },
            },
          },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_forms",
    description:
      "List all web forms in your Qwik Mailer account, along with their view count, submission count, status, and creation date.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_form",
    description: "Get detailed information and full questions schema of a specific form by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Form UUID.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_form_submissions",
    description: "Fetch all collected submissions/responses for a specific form.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Form UUID.",
        },
        limit: {
          type: "integer",
          description: "Max number of submissions to return (default 50).",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_form",
    description: "Permanently delete a form and its responses by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Form UUID.",
        },
      },
      required: ["id"],
    },
  },
];

interface AuthContext {
  teamId: string;
  teamIds: string[];
  scopes: string[];
}

const ALL_SCOPES = ["forms:read", "forms:write", "submissions:read", "forms:delete"];

const TOOL_SCOPE_MAP: Record<string, string> = {
  create_form_from_prompt: "forms:write",
  create_form: "forms:write",
  list_forms: "forms:read",
  get_form: "forms:read",
  get_form_submissions: "submissions:read",
  delete_form: "forms:delete",
};

async function resolveAuth(req: any, app: FastifyInstance): Promise<AuthContext | null> {
  const queryKey = req.query?.apiKey || req.query?.key;
  const authHeader = req.headers?.authorization;
  const headerKey =
    req.headers?.["x-api-key"] ||
    (authHeader && authHeader.startsWith("Bearer mf_live_")
      ? authHeader.replace("Bearer ", "").trim()
      : undefined);
  const candidateKey = queryKey || headerKey;

  // 1. API Key validation
  if (candidateKey) {
    try {
      const user = await validateApiKey(candidateKey, req.ip);
      if (user?.teamId) {
        return {
          teamId: user.teamId,
          teamIds: [user.teamId],
          scopes: ALL_SCOPES,
        };
      }
    } catch {}
  }

  // 2. OAuth 2.0 Bearer Token (Claude, ChatGPT, etc.)
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : (req.query?.token as string);

  if (bearerToken) {
    try {
      const oauthRes = await db.execute(sql`
        SELECT team_id, team_ids, scope FROM oauth_tokens WHERE token = ${bearerToken} AND expires_at > now()
      `);
      if (oauthRes.length && (oauthRes[0] as any)?.team_id) {
        const row = oauthRes[0] as any;
        const rawScope = String(row.scope || "").trim();
        const scopes = rawScope ? rawScope.split(/\s+/).filter(Boolean) : [];
        const rawTeamIds = Array.isArray(row.team_ids) ? row.team_ids : [];
        const teamIds = Array.from(new Set([row.team_id, ...rawTeamIds])).filter(Boolean);
        return {
          teamId: row.team_id as string,
          teamIds,
          scopes,
        };
      }
    } catch {}
  }

  // 3. JWT validation (User signed in to platform / dashboard token)
  const jwtToken =
    req.query?.token ||
    req.query?.jwt ||
    (authHeader && !authHeader.startsWith("Bearer mf_live_") && authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : undefined) ||
    req.cookies?.token ||
    req.cookies?.auth_token;

  if (jwtToken) {
    try {
      const decoded = app.jwt.verify(jwtToken) as any;
      const userId = decoded?.sub || decoded?.id;
      if (userId) {
        const member = await db.query.teamMembers.findFirst({
          where: eq(teamMembers.userId, userId),
        });
        if (member?.teamId) {
          return {
            teamId: member.teamId,
            teamIds: [member.teamId],
            scopes: ALL_SCOPES,
          };
        }
      }
    } catch {}
  }

  return null;
}

export async function mcpRoutes(app: FastifyInstance) {
  // CORS & Options
  app.options("/mcp", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Headers", "*");
    reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    reply.header("Access-Control-Expose-Headers", "WWW-Authenticate, Authorization");
    return reply.status(204).send();
  });

  // GET /mcp — Server discovery or SSE stream
  app.get("/mcp", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Expose-Headers", "WWW-Authenticate, Authorization");
    const accept = req.headers.accept || "";

    if (accept.includes("text/event-stream")) {
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      reply.raw.write(`event: endpoint\ndata: ${req.url}\n\n`);
      return;
    }

    const auth = await resolveAuth(req, app);

    return reply.send({
      name: "qwikforms",
      version: "1.0.0",
      description: "QwikForms Remote MCP Server for Claude & AI assistants",
      status: "online",
      authenticated: !!auth?.teamId,
      grantedScopes: auth?.scopes || [],
      endpoints: {
        mcp: `${req.protocol}://${req.hostname}/mcp`,
      },
      toolsCount: TOOLS.length,
      authInstructions: auth?.teamId
        ? "Authenticated successfully."
        : "Authentication required. Connect with OAuth or your API key: https://api.qwikmailer.in/mcp?apiKey=YOUR_API_KEY. Generate keys at https://qwikmailer.in/dashboard/api-keys",
    });
  });

  // POST /mcp — Standard Streamable HTTP Transport (Claude Connectors & MCP Clients)
  app.post("/mcp", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Expose-Headers", "WWW-Authenticate, Authorization");
    reply.header("Content-Type", "application/json");

    const auth = await resolveAuth(req, app);
    const body = (req.body || {}) as any;
    const { id, method, params } = body;

    switch (method) {
      case "initialize":
        return reply.send({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "qwikforms",
              version: "1.0.0",
            },
          },
        });

      case "notifications/initialized":
        return reply.status(200).send();

      case "tools/list": {
        // Only advertise tools that the current connection has permission to invoke
        const availableTools = auth?.scopes
          ? TOOLS.filter((t) => {
              const reqScope = TOOL_SCOPE_MAP[t.name];
              return !reqScope || auth.scopes.includes(reqScope);
            })
          : TOOLS;

        return reply.send({
          jsonrpc: "2.0",
          id,
          result: {
            tools: availableTools,
          },
        });
      }

      case "tools/call": {
        if (!auth?.teamId) {
          reply.header("WWW-Authenticate", `Bearer error="invalid_token", resource_metadata="${API_URL}/.well-known/oauth-protected-resource"`);
          return reply.send({
            jsonrpc: "2.0",
            id,
            result: {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `❌ Authentication Required: Please sign in to connect your Qwik Mailer account with ChatGPT or Claude, or provide your API Key.\n\n• Sign in & Authorize: ${APP_URL}/oauth/authorize\n• Or get your API Key: ${APP_URL}/dashboard/api-keys`,
                },
              ],
            },
          });
        }

        const { name, arguments: args = {} } = params || {};
        const teamIds = auth.teamIds && auth.teamIds.length > 0 ? auth.teamIds : [auth.teamId];
        const teamId = (args.teamId && teamIds.includes(args.teamId)) ? args.teamId : auth.teamId;

        // Check granular permission / scope
        const requiredScope = TOOL_SCOPE_MAP[name];
        if (requiredScope && !auth.scopes.includes(requiredScope)) {
          return reply.send({
            jsonrpc: "2.0",
            id,
            result: {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `❌ Permission Denied: This operation requires the '${requiredScope}' permission, but your connection was only granted [${auth.scopes.join(", ") || "none"}]. Form deletion and submissions access are strictly blocked. Please re-authorize with '${requiredScope}' permission enabled if you need this capability.`,
                },
              ],
            },
          });
        }
        try {
          let toolResult: any;

          if (name === "create_form_from_prompt") {
            const prompt = String(args.prompt || "");
            const title = args.formName || prompt.split(".")[0].slice(0, 80) || "New Form";
            const lowerPrompt = prompt.toLowerCase();
            const fields: any[] = [];
            let count = 1;

            const addF = (type: string, label: string, extra?: Record<string, any>) => {
              const sanitized = label.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
              fields.push({
                id: `field_${count++}`,
                type,
                name: sanitized,
                label,
                required: true,
                helperText: "",
                placeholder: "",
                ...(extra || {}),
              });
            };

            addF("text", "Full Name", { placeholder: "e.g. John Doe" });
            addF("email", "Email Address", { placeholder: "e.g. john@example.com" });

            if (lowerPrompt.includes("phone") || lowerPrompt.includes("mobile")) {
              addF("tel", "Phone Number", { placeholder: "+1 (555) 000-0000" });
            }
            if (lowerPrompt.includes("job") || lowerPrompt.includes("apply") || lowerPrompt.includes("resume") || lowerPrompt.includes("internship")) {
              addF("select", "Applying For Role", { options: ["Frontend Developer", "Backend Developer", "Full Stack Engineer", "Designer", "Other"] });
              addF("url", "Portfolio / LinkedIn Profile", { placeholder: "https://..." });
              addF("file", "Upload Resume / CV", { accept: ".pdf,.doc,.docx", maxSizeMb: 25, helperText: "PDF or DOCX format (Max 25 MB)" });
            } else if (lowerPrompt.includes("feedback") || lowerPrompt.includes("rating") || lowerPrompt.includes("survey")) {
              addF("rating", "How would you rate your overall experience?", { maxStars: 5 });
              addF("radio", "Would you recommend us to a colleague?", { options: ["Definitely Yes", "Maybe", "Not likely"] });
              addF("textarea", "Detailed Feedback or Suggestions", { required: false });
            } else if (lowerPrompt.includes("rsvp") || lowerPrompt.includes("event") || lowerPrompt.includes("meetup")) {
              addF("radio", "Will you be attending?", { options: ["Yes, I'll be there!", "Attending Virtually", "Sorry, can't make it"] });
              addF("select", "Dietary Preferences", { required: false, options: ["No Restrictions", "Vegetarian", "Vegan", "Halal", "Gluten-Free"] });
              addF("textarea", "Questions for the Speaker / Organizers", { required: false });
            } else {
              addF("textarea", "Your Message / Details", { placeholder: "Please provide any relevant details..." });
            }

            if (lowerPrompt.includes("sign") || lowerPrompt.includes("signature")) {
              addF("signature", "Digital Signature", { helperText: "Draw your signature using touch or mouse" });
            }

            const [newForm] = await db
              .insert(forms)
              .values({
                teamId,
                name: title,
                status: "active",
                schema: fields,
                design: {
                  title,
                  description: "Please fill out this form. Your response will be recorded securely.",
                  buttonText: "Submit",
                  buttonColor: "#4f46e5",
                  accentColor: "#4f46e5",
                },
                settings: {
                  requireGoogleAuth: args.requireGoogleAuth || false,
                  sendConfirmationEmail: true,
                  limitOneResponse: false,
                },
              })
              .returning();

            const safeSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            toolResult = {
              message: `Form "${title}" created successfully!`,
              id: newForm.id,
              name: newForm.name,
              publicUrl: `${FORMS_URL}/f/${safeSlug}/${newForm.id}`,
              builderUrl: `${APP_URL}/dashboard/forms/builder?id=${newForm.id}`,
              fieldsCount: fields.length,
              fields: fields.map((f) => ({ label: f.label, type: f.type, required: f.required })),
            };
          } else if (name === "create_form") {
            const [newForm] = await db
              .insert(forms)
              .values({
                teamId,
                name: args.name,
                status: args.status || "active",
                schema: args.schema || [],
                design: args.design || {},
                settings: args.settings || {},
              })
              .returning();

            const safeSlug = (newForm.name || "form").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            toolResult = {
              message: `Form "${newForm.name}" created!`,
              id: newForm.id,
              name: newForm.name,
              publicUrl: `${FORMS_URL}/f/${safeSlug}/${newForm.id}`,
              builderUrl: `${APP_URL}/dashboard/forms/builder?id=${newForm.id}`,
              fieldsCount: (newForm.schema as any[])?.length || 0,
            };
          } else if (name === "list_forms") {
            const userForms = await db.query.forms.findMany({
              where: inArray(forms.teamId, teamIds),
              orderBy: [desc(forms.createdAt)],
            });
            toolResult = {
              count: userForms.length,
              forms: userForms.map((f) => {
                const safeSlug = (f.name || "form").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                return {
                  id: f.id,
                  name: f.name,
                  status: f.status,
                  submissions: f.submissions || 0,
                  views: f.views || 0,
                  publicUrl: `${FORMS_URL}/f/${safeSlug}/${f.id}`,
                  createdAt: f.createdAt,
                };
              }),
            };
          } else if (name === "get_form") {
            const form = await db.query.forms.findFirst({
              where: and(eq(forms.id, args.id), inArray(forms.teamId, teamIds)),
            });
            if (!form) throw new Error("Form not found");
            toolResult = form;
          } else if (name === "get_form_submissions") {
            const limit = Math.min(100, Math.max(1, args.limit || 50));
            const submissions = await db.query.formSubmissions.findMany({
              where: and(eq(formSubmissions.formId, args.id), inArray(formSubmissions.teamId, teamIds)),
              orderBy: [desc(formSubmissions.createdAt)],
              limit,
            });
            toolResult = {
              count: submissions.length,
              submissions,
            };
          } else if (name === "delete_form") {
            const [deleted] = await db
              .delete(forms)
              .where(and(eq(forms.id, args.id), inArray(forms.teamId, teamIds)))
              .returning();
            if (!deleted) throw new Error("Form not found");
            toolResult = { message: "Form deleted successfully" };
          } else {
            throw new Error(`Unknown tool: ${name}`);
          }

          return reply.send({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(toolResult, null, 2),
                },
              ],
            },
          });
        } catch (err: any) {
          return reply.send({
            jsonrpc: "2.0",
            id,
            result: {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Error: ${err.message}`,
                },
              ],
            },
          });
        }
      }

      default:
        return reply.send({
          jsonrpc: "2.0",
          id: id ?? null,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        });
    }
  });
}

