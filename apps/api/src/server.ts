import { buildApp } from "./app.js";


const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? "0.0.0.0";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n🚀 Qwik Mailer API running on http://${HOST}:${PORT}`);
    console.log(`📮 Health check: http://localhost:${PORT}/health\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
