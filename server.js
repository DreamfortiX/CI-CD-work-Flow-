const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.TODO_DATA_FILE || path.join(__dirname, "todos.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function loadTodos() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch {
    // ignore corrupt file
  }
  return [];
}

function saveTodos(todos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
}

let todos = loadTodos();
let nextId = todos.length > 0 ? Math.max(...todos.map((t) => t.id)) + 1 : 1;

app.get("/api/todos", (_req, res) => {
  res.json(todos);
});

app.post("/api/todos", (req, res) => {
  const text = req.body.text?.trim();
  if (!text) {
    return res.status(400).json({ error: "Todo text is required" });
  }

  const todo = {
    id: nextId++,
    text,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  todos.unshift(todo);
  saveTodos(todos);
  res.status(201).json(todo);
});

app.patch("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const todo = todos.find((t) => t.id === id);

  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }

  if (typeof req.body.text === "string") {
    const text = req.body.text.trim();
    if (!text) {
      return res.status(400).json({ error: "Todo text cannot be empty" });
    }
    todo.text = text;
  }

  if (typeof req.body.completed === "boolean") {
    todo.completed = req.body.completed;
  }

  saveTodos(todos);
  res.json(todo);
});

app.delete("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Todo not found" });
  }

  todos.splice(index, 1);
  saveTodos(todos);
  res.status(204).send();
});

app.delete("/api/todos", (_req, res) => {
  todos = todos.filter((t) => !t.completed);
  saveTodos(todos);
  res.json(todos);
});

if (require.main === module) {
const server = app.listen(PORT, () => {
  console.log(`Todo app running at http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nPort ${PORT} is already in use.`);
    console.error("Either open http://localhost:3000 in your browser (app may already be running),");
    console.error("or stop the other process and try again.\n");
    process.exit(1);
  }
  throw err;
});
}

module.exports = app;
