const API = "/api/todos";

let todos = [];
let currentFilter = "all";
let editingId = null;

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const emptyState = document.getElementById("empty-state");
const countEl = document.getElementById("todo-count");
const clearBtn = document.getElementById("clear-completed");
const toast = document.getElementById("toast");
const filterBtns = document.querySelectorAll(".filter-btn");

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Something went wrong");
  }

  if (res.status === 204) return null;
  return res.json();
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add("hidden"), 2500);
}

function getFilteredTodos() {
  switch (currentFilter) {
    case "active":
      return todos.filter((t) => !t.completed);
    case "completed":
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
}

function updateCount() {
  const active = todos.filter((t) => !t.completed).length;
  countEl.textContent = `${active} item${active !== 1 ? "s" : ""} left`;
  clearBtn.disabled = !todos.some((t) => t.completed);
}

function render() {
  const filtered = getFilteredTodos();
  list.innerHTML = "";

  if (todos.length === 0) {
    emptyState.classList.remove("hidden");
    list.classList.add("hidden");
  } else {
    emptyState.classList.add("hidden");
    list.classList.remove("hidden");

    if (filtered.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-state";
      li.style.padding = "2rem";
      li.textContent =
        currentFilter === "completed"
          ? "No completed todos yet."
          : "No active todos. You're all caught up!";
      list.appendChild(li);
    } else {
      filtered.forEach((todo) => list.appendChild(createTodoElement(todo)));
    }
  }

  updateCount();
}

function createTodoElement(todo) {
  const li = document.createElement("li");
  li.className = "todo-item";
  li.dataset.id = todo.id;

  const checkbox = document.createElement("div");
  checkbox.className = `checkbox${todo.completed ? " checked" : ""}`;
  checkbox.title = todo.completed ? "Mark as active" : "Mark as done";
  checkbox.addEventListener("click", () => toggleTodo(todo.id));

  const textSpan = document.createElement("span");
  textSpan.className = `todo-text${todo.completed ? " completed" : ""}`;
  textSpan.textContent = todo.text;
  textSpan.addEventListener("dblclick", () => startEdit(todo.id, textSpan, li));

  const actions = document.createElement("div");
  actions.className = "todo-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "icon-btn";
  editBtn.title = "Edit";
  editBtn.textContent = "✎";
  editBtn.addEventListener("click", () => startEdit(todo.id, textSpan, li));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "icon-btn delete";
  deleteBtn.title = "Delete";
  deleteBtn.textContent = "✕";
  deleteBtn.addEventListener("click", () => deleteTodo(todo.id, li));

  actions.append(editBtn, deleteBtn);
  li.append(checkbox, textSpan, actions);
  return li;
}

function startEdit(id, textSpan, _li) {
  if (editingId !== null) return;
  editingId = id;

  const todo = todos.find((t) => t.id === id);
  const editInput = document.createElement("input");
  editInput.className = "todo-edit-input";
  editInput.value = todo.text;
  editInput.maxLength = 200;

  textSpan.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  const finishEdit = async (save) => {
    if (editingId !== id) return;
    editingId = null;

    const newText = editInput.value.trim();
    if (save && newText && newText !== todo.text) {
      try {
        const updated = await api(`${API}/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ text: newText }),
        });
        todos = todos.map((t) => (t.id === id ? updated : t));
        showToast("Todo updated");
      } catch (err) {
        showToast(err.message, true);
      }
    }

    render();
  };

  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finishEdit(true);
    if (e.key === "Escape") finishEdit(false);
  });

  editInput.addEventListener("blur", () => finishEdit(true));
}

async function loadTodos() {
  try {
    todos = await api(API);
    render();
  } catch {
    showToast("Failed to load todos", true);
  }
}

async function addTodo(text) {
  try {
    const todo = await api(API, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    todos.unshift(todo);
    render();
    showToast("Todo added");
  } catch (err) {
    showToast(err.message, true);
  }
}

async function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  try {
    const updated = await api(`${API}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !todo.completed }),
    });
    todos = todos.map((t) => (t.id === id ? updated : t));
    render();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteTodo(id, li) {
  li.classList.add("removing");
  setTimeout(async () => {
    try {
      await api(`${API}/${id}`, { method: "DELETE" });
      todos = todos.filter((t) => t.id !== id);
      render();
      showToast("Todo deleted");
    } catch (err) {
      li.classList.remove("removing");
      showToast(err.message, true);
    }
  }, 250);
}

async function clearCompleted() {
  try {
    todos = await api(API, { method: "DELETE" });
    render();
    showToast("Completed todos cleared");
  } catch (err) {
    showToast(err.message, true);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addTodo(text);
  input.value = "";
  input.focus();
});

clearBtn.addEventListener("click", clearCompleted);

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

loadTodos();
