#!/usr/bin/env node
import * as readline from "readline";

const API_BASE_URL = process.env.QWIKMAILER_API_URL || "https://api.qwikmailer.in";
const API_KEY = process.env.QWIKMAILER_API_KEY || "";

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

const TOOLS: ToolDefinition[] = [
  {
    name: "create_form_from_prompt",
    description:
      "Create a complete, responsive web form using natural language. For example: 'Create a Job Application form for Senior Full Stack Developer with Resume upload and Portfolio link' or 'Create an Event RSVP Form with dietary preferences'.",
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
    description:
      "Get detailed information and full questions schema of a specific form by its ID.",
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
    description:
      "Fetch all collected submissions/responses for a specific form.",
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

async function apiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}`, "X-API-Key": API_KEY } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(json.error || json.message || `API Error ${response.status}: ${text}`);
  }

  return json;
}

async function handleToolCall(name: string, args: any): Promise<any> {
  switch (name) {
    case "create_form_from_prompt": {
      const res = await apiRequest("/v1/chatgpt/create-form-from-prompt", {
        method: "POST",
        body: JSON.stringify(args),
      });
      return {
        message: res.message || "Form created successfully!",
        form: res.form,
      };
    }

    case "create_form": {
      const res = await apiRequest("/v1/forms", {
        method: "POST",
        body: JSON.stringify(args),
      });
      const safeSlug = (res.data?.name || "form").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const formsUrl = process.env.NEXT_PUBLIC_FORMS_URL || "https://forms.qwikmailer.in";
      return {
        message: `Form "${res.data.name}" created!`,
        form: {
          id: res.data.id,
          name: res.data.name,
          status: res.data.status,
          publicUrl: `${formsUrl}/f/${safeSlug}/${res.data.id}`,
          builderUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://qwikmailer.in"}/dashboard/forms/builder?id=${res.data.id}`,
          fields: res.data.schema,
        },
      };
    }

    case "list_forms": {
      const res = await apiRequest("/v1/forms", { method: "GET" });
      const formsUrl = process.env.NEXT_PUBLIC_FORMS_URL || "https://forms.qwikmailer.in";
      return {
        count: res.data?.length || 0,
        forms: (res.data || []).map((f: any) => {
          const safeSlug = (f.name || "form").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          return {
            id: f.id,
            name: f.name,
            status: f.status,
            submissions: f.submissions || 0,
            views: f.views || 0,
            publicUrl: `${formsUrl}/f/${safeSlug}/${f.id}`,
            createdAt: f.createdAt,
          };
        }),
      };
    }

    case "get_form": {
      const res = await apiRequest(`/v1/forms/${args.id}`, { method: "GET" });
      return res.data;
    }

    case "get_form_submissions": {
      const limit = args.limit || 50;
      const res = await apiRequest(`/v1/forms/${args.id}/submissions?limit=${limit}`, { method: "GET" });
      return {
        total: res.total,
        count: res.data?.length || 0,
        submissions: res.data,
      };
    }

    case "delete_form": {
      const res = await apiRequest(`/v1/forms/${args.id}`, { method: "DELETE" });
      return { message: res.message || "Form deleted successfully" };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function sendResponse(id: any, result: any) {
  const response = {
    jsonrpc: "2.0",
    id,
    result,
  };
  process.stdout.write(JSON.stringify(response) + "\n");
}

function sendError(id: any, code: number, message: string) {
  const response = {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
  process.stdout.write(JSON.stringify(response) + "\n");
}

// ─── Main Stdio JSON-RPC Loop ────────────────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const request = JSON.parse(trimmed);
    const { id, method, params } = request;

    switch (method) {
      case "initialize":
        sendResponse(id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "qwikforms-mcp",
            version: "1.0.0",
          },
        });
        break;

      case "notifications/initialized":
        // Client acknowledgment, no response required
        break;

      case "tools/list":
        sendResponse(id, {
          tools: TOOLS,
        });
        break;

      case "tools/call": {
        const { name, arguments: args } = params || {};
        try {
          const result = await handleToolCall(name, args || {});
          sendResponse(id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          });
        } catch (err: any) {
          sendResponse(id, {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error: ${err.message}`,
              },
            ],
          });
        }
        break;
      }

      default:
        if (id !== undefined) {
          sendError(id, -32601, `Method not found: ${method}`);
        }
    }
  } catch (e: any) {
    sendError(null, -32700, `Parse error: ${e.message}`);
  }
});

process.stderr.write("🚀 QwikForms MCP Server running on stdio...\n");

