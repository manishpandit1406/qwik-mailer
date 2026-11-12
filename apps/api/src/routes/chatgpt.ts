import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, count } from "drizzle-orm";
import { db, forms, formSubmissions } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

const FORMS_URL = process.env.NEXT_PUBLIC_FORMS_URL || "https://forms.qwikmailer.in";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qwikmailer.in";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.qwikmailer.in";

export async function chatgptRoutes(app: FastifyInstance) {
  // ─── 1. ChatGPT Plugin Manifest (.well-known/ai-plugin.json) ───────────────
  const pluginManifest = {
    schema_version: "v1",
    name_for_human: "QwikForms by Qwik Mailer",
    name_for_model: "qwikforms",
    description_for_human: "Create responsive forms, surveys, and collect submissions directly within ChatGPT.",
    description_for_model:
      "Plugin and Actions for creating, customizing, and reading forms in Qwik Mailer. Allows ChatGPT to generate modern forms with short answer, paragraph, email, phone, dropdown, checkbox, multiple choice, rating, scale, file upload, and signature fields, and fetch live submission data.",
    auth: {
      type: "service_http",
      authorization_type: "bearer",
      verification_tokens: {},
    },
    api: {
      type: "openapi",
      url: `${API_URL}/.well-known/openapi.json`,
    },
    logo_url: `${APP_URL}/favicon.ico`,
    contact_email: "support@qwikmailer.in",
    legal_info_url: `${APP_URL}/privacy`,
  };

  app.get("/.well-known/ai-plugin.json", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(pluginManifest);
  });

  // ─── 2. OpenAPI 3.1.0 Specification for ChatGPT Actions ────────────────────
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "QwikForms API",
      description:
        "API for creating and managing web forms, surveys, and reviewing submissions on Qwik Mailer directly from ChatGPT.",
      version: "1.0.0",
    },
    servers: [
      {
        url: API_URL,
        description: "Qwik Mailer Production API",
      },
      {
        url: "http://localhost:4000",
        description: "Local Development API",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Enter your Qwik Mailer API Key (starts with mf_live_). Obtain one from Qwik Mailer Dashboard -> Settings -> API Keys.",
        },
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Enter your Qwik Mailer API Key (starts with mf_live_).",
        },
      },
      schemas: {
        FormField: {
          type: "object",
          required: ["id", "type", "label"],
          properties: {
            id: {
              type: "string",
              description: "Unique field ID (e.g. 'field_name', 'field_email')",
            },
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
              description: "Input field type.",
            },
            name: {
              type: "string",
              description: "Machine identifier in snake_case (e.g. 'full_name', 'user_email').",
            },
            label: {
              type: "string",
              description: "User-facing label or question prompt.",
            },
            placeholder: {
              type: "string",
              description: "Optional placeholder text inside input.",
            },
            helperText: {
              type: "string",
              description: "Optional sub-label or instruction text.",
            },
            required: {
              type: "boolean",
              description: "Whether this question is required to submit.",
              default: false,
            },
            options: {
              type: "array",
              items: { type: "string" },
              description: "Choices list for select, radio, or checkbox questions.",
            },
            maxStars: {
              type: "integer",
              description: "Max stars for rating fields (default 5).",
            },
            minLabel: {
              type: "string",
              description: "Low-end label for linear scale (e.g. 'Poor').",
            },
            maxLabel: {
              type: "string",
              description: "High-end label for linear scale (e.g. 'Excellent').",
            },
            accept: {
              type: "string",
              description: "Accepted file types for file upload (e.g. '.pdf,.docx' or 'image/*').",
            },
            maxSizeMb: {
              type: "integer",
              description: "Max file upload size in MB (e.g. 10 or 100).",
            },
          },
        },
        FormDesign: {
          type: "object",
          properties: {
            title: { type: "string", description: "Header title of the form." },
            description: { type: "string", description: "Sub-description or instructions." },
            buttonText: { type: "string", description: "Submit button text (default: 'Submit')." },
            buttonColor: { type: "string", description: "Hex color code for submit button (default: '#4f46e5')." },
            accentColor: { type: "string", description: "Hex color code for accents." },
          },
        },
        FormSettings: {
          type: "object",
          properties: {
            requireGoogleAuth: {
              type: "boolean",
              description: "Require Google Sign-in to record verified respondent email.",
            },
            sendConfirmationEmail: {
              type: "boolean",
              description: "Automatically send confirmation receipt email to respondent.",
            },
            confirmationSubject: {
              type: "string",
              description: "Custom auto-responder email subject line.",
            },
            confirmationBody: {
              type: "string",
              description: "Custom confirmation message body.",
            },
            limitOneResponse: {
              type: "boolean",
              description: "Limit respondents to exactly 1 submission per email.",
            },
            maxSubmissions: {
              type: "integer",
              description: "Maximum total responses before form auto-closes.",
            },
            expiresAt: {
              type: "string",
              format: "date-time",
              description: "ISO timestamp after which the form closes.",
            },
            closedMessage: {
              type: "string",
              description: "Message shown when form is expired or closed.",
            },
            successMessage: {
              type: "string",
              description: "Message shown upon successful submission.",
            },
          },
        },
        CreateFormRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              description: "Internal name of the form.",
              example: "Job Application - Software Engineer",
            },
            status: {
              type: "string",
              enum: ["active", "draft", "inactive"],
              default: "active",
              description: "Initial status of the form. Use 'active' to allow immediate submissions.",
            },
            design: { $ref: "#/components/schemas/FormDesign" },
            settings: { $ref: "#/components/schemas/FormSettings" },
            schema: {
              type: "array",
              items: { $ref: "#/components/schemas/FormField" },
              description: "List of fields/questions in the form.",
            },
          },
        },
      },
    },
    security: [
      { BearerAuth: [] },
      { ApiKeyAuth: [] },
    ],
    paths: {
      "/v1/chatgpt/create-form-from-prompt": {
        post: {
          operationId: "createFormFromPrompt",
          summary: "Create a complete form with natural language prompt",
          description:
            "Pass a description of the form you want to create (e.g. 'Customer Feedback Form with Rating and Comments' or 'Job Application with Resume upload'). The server generates the full question schema and returns the live URL.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["prompt"],
                  properties: {
                    prompt: {
                      type: "string",
                      description: "Natural language description of the form.",
                      example: "Create an Event RSVP Form for AI Workshop with Name, Email, Attendance Mode (In-Person / Virtual), Dietary preferences, and Questions for Speaker.",
                    },
                    formName: {
                      type: "string",
                      description: "Optional form title.",
                    },
                    requireGoogleAuth: {
                      type: "boolean",
                      default: false,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Form created successfully with public live link.",
            },
          },
        },
      },
      "/v1/forms": {
        get: {
          operationId: "listForms",
          summary: "List all forms",
          description: "Retrieve all forms created by the team, including view and submission counts.",
          responses: {
            "200": {
              description: "List of forms.",
            },
          },
        },
        post: {
          operationId: "createForm",
          summary: "Create a new form with custom fields",
          description: "Create a new form with custom field definitions, design, and settings.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateFormRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Form created successfully.",
            },
          },
        },
      },
      "/v1/forms/{id}": {
        get: {
          operationId: "getForm",
          summary: "Get form details and schema",
          description: "Retrieve schema, design, and current status of a specific form by ID.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Form UUID.",
            },
          ],
          responses: {
            "200": { description: "Form details." },
            "404": { description: "Form not found." },
          },
        },
        put: {
          operationId: "updateForm",
          summary: "Update an existing form",
          description: "Update the fields, design, or settings of an existing form.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateFormRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Form updated successfully." },
          },
        },
        delete: {
          operationId: "deleteForm",
          summary: "Delete a form",
          description: "Permanently delete a form and its submissions.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Form deleted." },
          },
        },
      },
      "/v1/forms/{id}/submissions": {
        get: {
          operationId: "getFormSubmissions",
          summary: "View form submissions and responses",
          description: "Retrieve responses submitted by users for a given form.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", default: 50 },
            },
          ],
          responses: {
            "200": { description: "Submissions list." },
          },
        },
      },
    },
  };

  app.get("/.well-known/openapi.json", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(openApiSpec);
  });

  app.get("/openapi.json", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(openApiSpec);
  });

  // ─── 3. ChatGPT Natural Language Form Creation Endpoint ─────────────────────
  // POST /v1/chatgpt/create-form-from-prompt
  app.post("/v1/chatgpt/create-form-from-prompt", { preHandler: authenticate }, async (req, reply) => {
    const teamId = (req as any).teamId;
    if (!teamId) {
      return reply.code(400).send({ success: false, error: "Team ID is required" });
    }

    const { prompt, formName, requireGoogleAuth } = z
      .object({
        prompt: z.string().min(5),
        formName: z.string().optional(),
        requireGoogleAuth: z.boolean().optional().default(false),
      })
      .parse(req.body);

    // Heuristic generator: derive form fields cleanly from user prompt
    const title = formName || prompt.split(".")[0].slice(0, 80) || "New Form";
    const lowerPrompt = prompt.toLowerCase();

    const fields: any[] = [];
    let fieldCount = 1;

    // Helper to generate fields
    const addF = (type: string, label: string, extra?: Record<string, any>) => {
      const sanitized = label.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
      fields.push({
        id: `field_${fieldCount++}`,
        type,
        name: sanitized,
        label,
        required: true,
        helperText: "",
        placeholder: "",
        ...(extra || {}),
      });
    };

    // Standard contact questions
    addF("text", "Full Name", { placeholder: "e.g. John Doe" });
    addF("email", "Email Address", { placeholder: "e.g. john@example.com" });

    if (lowerPrompt.includes("phone") || lowerPrompt.includes("mobile") || lowerPrompt.includes("contact number")) {
      addF("tel", "Phone Number", { placeholder: "+1 (555) 000-0000" });
    }

    if (lowerPrompt.includes("company") || lowerPrompt.includes("organization") || lowerPrompt.includes("business")) {
      addF("text", "Company / Organization Name", { required: false });
    }

    if (lowerPrompt.includes("job") || lowerPrompt.includes("role") || lowerPrompt.includes("position") || lowerPrompt.includes("apply") || lowerPrompt.includes("resume") || lowerPrompt.includes("internship")) {
      addF("select", "Applying For Role", { options: ["Frontend Developer", "Backend Developer", "Full Stack Engineer", "Product Designer", "Other"] });
      addF("url", "Portfolio / LinkedIn Profile", { placeholder: "https://linkedin.com/in/..." });
      addF("file", "Upload Resume / CV", { accept: ".pdf,.doc,.docx", maxSizeMb: 25, helperText: "PDF or DOCX format (Max 25 MB)" });
    } else if (lowerPrompt.includes("feedback") || lowerPrompt.includes("satisfaction") || lowerPrompt.includes("survey") || lowerPrompt.includes("review")) {
      addF("rating", "How would you rate your overall experience?", { maxStars: 5 });
      addF("radio", "Would you recommend us to a colleague?", { options: ["Definitely Yes", "Maybe", "Not likely"] });
      addF("textarea", "Detailed Feedback or Suggestions", { required: false, placeholder: "What did you enjoy or how can we improve?" });
    } else if (lowerPrompt.includes("rsvp") || lowerPrompt.includes("event") || lowerPrompt.includes("webinar") || lowerPrompt.includes("meetup")) {
      addF("radio", "Will you be attending?", { options: ["Yes, I'll be there!", "Attending Virtually", "Sorry, can't make it"] });
      addF("select", "Dietary Preferences", { required: false, options: ["No Restrictions", "Vegetarian", "Vegan", "Halal", "Gluten-Free"] });
      addF("textarea", "Questions for the Speaker / Organizers", { required: false });
    } else {
      addF("textarea", "Your Message / Details", { placeholder: "Please provide any relevant details..." });
    }

    if (lowerPrompt.includes("sign") || lowerPrompt.includes("signature") || lowerPrompt.includes("agreement")) {
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
          description: `Please fill out this form. Your response will be recorded securely.`,
          buttonText: "Submit",
          buttonColor: "#4f46e5",
          accentColor: "#4f46e5",
          bgType: "solid",
          bgColor: "#f9fafb",
        },
        settings: {
          requireGoogleAuth,
          sendConfirmationEmail: true,
          limitOneResponse: false,
        },
      })
      .returning();

    const safeSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const publicUrl = `${FORMS_URL}/f/${safeSlug}/${newForm.id}`;
    const builderUrl = `${APP_URL}/dashboard/forms/builder?id=${newForm.id}`;

    return reply.code(201).send({
      success: true,
      message: `Form "${title}" created successfully!`,
      form: {
        id: newForm.id,
        name: newForm.name,
        status: newForm.status,
        fieldsCount: fields.length,
        publicUrl,
        builderUrl,
        fields: fields.map((f) => ({ label: f.label, type: f.type, required: f.required })),
      },
    });
  });
}

