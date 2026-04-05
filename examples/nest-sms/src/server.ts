import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { createExampleNestApp } from "./app.js";

const { module } = createExampleNestApp();
const app = await NestFactory.create(module.module, {
  logger: ["error", "warn"]
});

const port = Number(process.env.PORT ?? "3002");
await app.listen(port);

console.log(`Nest OTP example listening on http://127.0.0.1:${port}`);
