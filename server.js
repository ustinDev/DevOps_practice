const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const db = new Pool({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.POSTGRES_DB || "tasks",
  user: process.env.POSTGRES_USER || "appuser",
  password: process.env.POSTGRES_PASSWORD
});

app.get("/", (_req, res) => {
  res.json({ message: "Tasks API is running" });
});

app.get("/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ api: "ok", database: "ok" });
  } catch {
    res.status(503).json({ api: "ok", database: "unavailable" });
  }
});

app.post("/tasks", async (req, res) => {
  const title = req.body.title;

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  try {
    const result = await db.query(
      "INSERT INTO tasks (title) VALUES ($1) RETURNING id, title",
      [title.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create task" });
  }
});

app.get("/tasks", async (_req, res) => {
  try {
    const result = await db.query(
      "SELECT id, title FROM tasks ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not retrieve tasks" });
  }
});

async function start() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL
    )
  `);

  app.listen(3000, "0.0.0.0", () => {
    console.log("Tasks API listening on port 3000");
  });
}

start().catch((err) => {
  console.error("API startup failed:", err);
  process.exit(1);
});