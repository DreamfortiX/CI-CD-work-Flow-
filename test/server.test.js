const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const request = require("supertest");

const testFile = path.join(os.tmpdir(), `todos-test-${process.pid}.json`);

function loadApp() {
  process.env.TODO_DATA_FILE = testFile;
  delete require.cache[require.resolve("../server")];
  if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  return require("../server");
}

after(() => {
  if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
});

let app;

beforeEach(() => {
  app = loadApp();
});

test("GET /api/todos returns empty list", async () => {
  const res = await request(app).get("/api/todos");
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, []);
});

test("POST /api/todos creates a todo", async () => {
  const res = await request(app)
    .post("/api/todos")
    .send({ text: "Buy groceries" });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.text, "Buy groceries");
  assert.strictEqual(res.body.completed, false);
  assert.ok(res.body.id);
});

test("POST /api/todos rejects empty text", async () => {
  const res = await request(app).post("/api/todos").send({ text: "   " });
  assert.strictEqual(res.status, 400);
});

test("PATCH /api/todos/:id toggles completion", async () => {
  const created = await request(app)
    .post("/api/todos")
    .send({ text: "Walk the dog" });

  const res = await request(app)
    .patch(`/api/todos/${created.body.id}`)
    .send({ completed: true });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.completed, true);
});

test("DELETE /api/todos/:id removes a todo", async () => {
  const created = await request(app)
    .post("/api/todos")
    .send({ text: "Temp task" });

  const deleted = await request(app).delete(`/api/todos/${created.body.id}`);
  assert.strictEqual(deleted.status, 204);

  const list = await request(app).get("/api/todos");
  assert.strictEqual(list.body.length, 0);
});

test("GET / serves the frontend", async () => {
  const res = await request(app).get("/");
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /My Todos/);
});
