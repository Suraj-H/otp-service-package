import { createExampleFastifyApp } from "./app.js";

const { app } = createExampleFastifyApp();

const port = Number(process.env.PORT ?? "3001");
await app.listen({
  host: "127.0.0.1",
  port
});

console.log(`Fastify OTP example listening on http://127.0.0.1:${port}`);
