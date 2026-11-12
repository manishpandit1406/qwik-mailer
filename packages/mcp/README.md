# QwikForms MCP Server

Model Context Protocol (MCP) server for QwikForms & Qwik Mailer. Enables AI assistants (Claude, Cursor, Antigravity, ChatGPT) to create, manage, and read web forms and submissions.

## Supported Tools

1. **`create_form_from_prompt`**: Create a complete, styled form with questions using natural language.
2. **`create_form`**: Create custom forms with structured field schemas (Text, Dropdown, Radio, Checkbox, Rating, Scale, File Upload, Signature, Section breaks).
3. **`list_forms`**: List all forms with view and submission counts.
4. **`get_form`**: Retrieve details and full field schema of a specific form.
5. **`get_form_submissions`**: Read collected responses for any form.
6. **`delete_form`**: Delete a form.

---

## Configuration

### 1. Claude Desktop (`claude_desktop_config.json`)

On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "qwikforms": {
      "command": "node",
      "args": ["/Users/ashishpandit/Documents/Qwik Mailer/packages/mcp/dist/index.js"],
      "env": {
        "QWIKMAILER_API_KEY": "mf_live_YOUR_API_KEY_HERE",
        "QWIKMAILER_API_URL": "https://api.qwikmailer.in"
      }
    }
  }
}
```

### 2. Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "qwikforms": {
      "command": "node",
      "args": ["/Users/ashishpandit/Documents/Qwik Mailer/packages/mcp/dist/index.js"],
      "env": {
        "QWIKMAILER_API_KEY": "mf_live_YOUR_API_KEY_HERE",
        "QWIKMAILER_API_URL": "https://api.qwikmailer.in"
      }
    }
  }
}
```

### 3. Local Development (Testing against localhost)

```json
{
  "env": {
    "QWIKMAILER_API_KEY": "mf_live_YOUR_LOCAL_API_KEY",
    "QWIKMAILER_API_URL": "http://localhost:4000"
  }
}
```

