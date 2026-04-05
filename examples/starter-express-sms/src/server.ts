import { createStarterExpressApp } from "./app.js";

const { app } = createStarterExpressApp();

const port = Number(process.env.PORT ?? "3003");
app.listen(port, () => {
  console.log(`Starter Express OTP example listening on http://127.0.0.1:${port}`);
});
