import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
];

app.use(
  "*",
  cors({
    origin: (origin) =>
      origin && allowed.some((re) => re.test(origin)) ? origin : null,
    credentials: true,
  })
);

app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/", (c) => {
  return c.text("PRPRTY API is running 🚀");
});

export default app.fetch;
