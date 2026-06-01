import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-2.0-flash-lite-001",
  "gemini-2.5-pro"
];

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured. Please add it to your .env file.");
  }

  let lastError = "";

  for (const model of FALLBACK_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        lastError = `Gemini API error (${model}): ${res.status} - ${errBody}`;
        // Skip to next model on error (e.g. 503 high demand or 429 quota)
        console.warn(`[AI Fallback] ${model} failed with ${res.status}`);
        continue;
      }

      const data = await res.json() as any;
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (err: any) {
      lastError = `Gemini network error (${model}): ${err.message}`;
      console.warn(`[AI Fallback] ${model} network error: ${err.message}`);
      continue;
    }
  }

  throw new Error(`All fallback AI models failed due to high demand/quota limits. Last error: ${lastError}`);
}

export async function aiRoutes(app: FastifyInstance) {

  // POST /v1/ai/generate-template
  // Generate a complete HTML email template from a description
  app.post("/generate-template", { preHandler: authenticate }, async (req, reply) => {
    const { prompt, tone, variables } = z.object({
      prompt: z.string().min(3).max(1000),
      tone: z.enum(["professional", "friendly", "formal", "casual"]).default("professional"),
      variables: z.array(z.string()).optional().default([]),
    }).parse(req.body);

    const varList = variables.length > 0
      ? `Use these personalization variables in the template: ${variables.map(v => `{{${v}}}`).join(", ")}.`
      : `Include common personalization variables like {{name}}, {{email}}.`;

    const systemPrompt = `You are an expert email designer. Generate a beautiful, responsive HTML email template along with a compelling subject line.

Context: ${prompt}
Tone: ${tone}
${varList}

Requirements:
- Make the HTML fully self-contained with inline CSS (no external dependencies)
- Use a clean, modern design with proper typography
- Include an unsubscribe link at the bottom: <a href="{{unsubscribe_url}}">Unsubscribe</a>
- Mobile responsive design
- Use the variable {{name}} to personalize the greeting
- Include standard <html>, <head>, and <body> tags to ensure the email renders properly.

Format your output EXACTLY as follows:
SUBJECT: [Your generated subject line here]
HTML:
[Your generated HTML code here]`;

    try {
      const text = await callGemini(systemPrompt);
      
      const subjectMatch = text.match(/SUBJECT:\s*(.+)/i);
      const htmlMatch = text.match(/HTML:\s*([\s\S]+)/i);
      
      const subject = subjectMatch ? subjectMatch[1].trim() : "Generated Template";
      let html = htmlMatch ? htmlMatch[1].trim() : text.trim();
      
      // Remove any leftover markdown fences
      if (html.startsWith("```html")) html = html.replace(/^```html/, "");
      if (html.startsWith("```")) html = html.replace(/^```/, "");
      if (html.endsWith("```")) html = html.replace(/```$/, "");
      html = html.trim();

      return reply.send({ success: true, data: { subject, html } });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message });
    }
  });

  // POST /v1/ai/subject-lines
  // Generate subject line variations
  app.post("/subject-lines", { preHandler: authenticate }, async (req, reply) => {
    const { context, count } = z.object({
      context: z.string().min(5).max(500),
      count: z.number().min(1).max(10).default(5),
    }).parse(req.body);

    const prompt = `Generate ${count} compelling email subject lines for this context:

"${context}"

Rules:
- Each subject line should be 30-60 characters
- Mix different styles: curiosity, urgency, personalization, benefit-driven, question-based
- Use {{name}} only if personalization makes sense
- Return ONLY a JSON array of strings, like: ["Subject 1", "Subject 2"]
- No explanations, no markdown`;

    try {
      const text = await callGemini(prompt);
      // Extract JSON array from response
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Invalid AI response format");
      const subjects = JSON.parse(match[0]) as string[];
      return reply.send({ success: true, data: { subjects } });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message });
    }
  });

  // POST /v1/ai/spam-score
  // Analyze email for spam indicators
  app.post("/spam-score", { preHandler: authenticate }, async (req, reply) => {
    const { subject, html } = z.object({
      subject: z.string().min(1),
      html: z.string().min(1),
    }).parse(req.body);

    const textContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000);

    const prompt = `You are a spam detection expert. Analyze this email and return a spam risk score.

Subject: ${subject}
Content preview: ${textContent}

Analyze for:
1. Spam trigger words (FREE, WINNER, URGENT, etc.)
2. Excessive capitalization
3. Misleading subject lines
4. Missing unsubscribe link reference
5. Link-to-text ratio issues
6. Overly promotional language

Return ONLY a JSON object like:
{
  "score": 2,
  "level": "low",
  "issues": ["Missing unsubscribe mention", "Promotional language detected"],
  "suggestions": ["Add clear unsubscribe link", "Reduce exclamation marks"],
  "breakdown": {
    "spamWords": 1,
    "formatting": 0,
    "links": 1,
    "promotional": 0
  }
}

score: 0-10 (0=clean, 10=certain spam)
level: "low" | "medium" | "high" | "critical"`;

    try {
      const text = await callGemini(prompt);
      // Find the outermost JSON object robustly (handle arrays inside)
      let jsonStr = "";
      let depth = 0;
      let started = false;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === "{") { depth++; started = true; }
        if (started) jsonStr += text[i];
        if (text[i] === "}" && started) { depth--; if (depth === 0) break; }
      }
      if (!jsonStr) throw new Error("Invalid AI response format");
      const result = JSON.parse(jsonStr);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message });
    }
  });

  // POST /v1/ai/personalize
  // AI content personalization based on recipient data
  app.post("/personalize", { preHandler: authenticate }, async (req, reply) => {
    const { template, recipientData } = z.object({
      template: z.string().min(10),
      recipientData: z.record(z.string()),
    }).parse(req.body);

    const dataStr = Object.entries(recipientData)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const prompt = `You are an email personalization AI. Rewrite this email template to be highly personalized for this specific recipient.

Recipient data:
${dataStr}

Email template:
${template}

Rules:
- Use the recipient's data naturally in the text (not just variable substitution)
- Maintain the original structure and purpose of the email
- Make it feel genuinely personal, not like a form letter
- Keep the same tone as the original
- Return ONLY the personalized HTML, no explanations`;

    try {
      const personalized = await callGemini(prompt);
      return reply.send({ success: true, data: { html: personalized.trim() } });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message });
    }
  });

  // GET /v1/ai/status
  // Check if AI is configured
  app.get("/status", { preHandler: authenticate }, async (_req, reply) => {
    return reply.send({
      success: true,
      data: {
        configured: !!GEMINI_API_KEY,
        provider: "Google Gemini Flash",
        features: ["template-generation", "subject-lines", "spam-score", "personalization"],
      },
    });
  });
}
