import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken, Stats, Task } from "../api";

const PAGE_SIZE = 5;

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Load the current page of tasks plus the stats.
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [pageData, statsData] = await Promise.all([
        api.listTasks(page, PAGE_SIZE),
        api.getStats(),
      ]);
      setTasks(pageData.items);
      setTotalPages(pageData.total_pages || 1);
      setStats(statsData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.createTask(newTitle.trim());
      setNewTitle("");
      setPage(1);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function toggle(task: Task) {
    try {
      await api.updateTask(task.id, { completed: !task.completed });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function edit(task: Task) {
    const title = window.prompt("Edit task title:", task.title);
    if (title === null || !title.trim()) return;
    try {
      await api.updateTask(task.id, { title: title.trim() });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Tasks</h1>
        <button className="btn btn-secondary" onClick={logout}>
          Log out
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats">
          <div className="stat">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
      )}

      {/* Add task */}
      <form onSubmit={addTask} className="add-row">
        <input
          placeholder="New task title..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button className="btn" type="submit">
          Add
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}

      {/* List */}
      {!loading && tasks.length === 0 && <p>No tasks yet. Add one above.</p>}

      {!loading &&
        tasks.map((task) => (
          <div className="card task-row" key={task.id}>
            <span
              className={task.completed ? "task-title done" : "task-title"}
              onClick={() => navigate(`/tasks/${task.id}`)}
            >
              {task.completed ? "✓ " : "○ "}
              {task.title}
            </span>
            <div className="task-actions">
              <button className="btn btn-secondary" onClick={() => toggle(task)}>
                {task.completed ? "Undo" : "Complete"}
              </button>
              <button className="btn btn-secondary" onClick={() => edit(task)}>
                Edit
              </button>
              <button className="btn btn-danger" onClick={() => remove(task)}>
                Delete
              </button>
            </div>
          </div>
        ))}

      {/* Pagination */}
      <div className="pagination">
        <button className="btn btn-secondary" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          className="btn btn-secondary"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
