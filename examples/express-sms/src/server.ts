import { createExampleExpressApp } from "./app.js";

const { app } = createExampleExpressApp();

const port = Number(process.env.PORT ?? "3000");
app.listen(port, () => {
  console.log(`Express OTP example listening on http://127.0.0.1:${port}`);
});
