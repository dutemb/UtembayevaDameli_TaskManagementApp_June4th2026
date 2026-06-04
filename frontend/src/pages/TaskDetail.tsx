import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ActivityEntry, api, Task } from "../api";

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Load the task and its activity log together.
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [taskData, activityData] = await Promise.all([
        api.getTask(id!),
        api.getActivity(id!),
      ]);
      setTask(taskData);
      setTitle(taskData.title);
      setActivity(activityData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveTitle() {
    if (!title.trim() || !task) return;
    try {
      await api.updateTask(task.id, { title: title.trim() });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function toggle() {
    if (!task) return;
    try {
      await api.updateTask(task.id, { completed: !task.completed });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove() {
    if (!task || !window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p><Link to="/">Back</Link></div>;
  if (!task) return null;

  return (
    <div className="container">
      <Link to="/">&larr; Back to tasks</Link>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row">
          <label>Title</label>
          <div className="add-row">
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="btn" onClick={saveTitle}>
              Save
            </button>
          </div>
        </div>

        <p>
          <strong>Status:</strong>{" "}
          {task.completed ? "Completed" : "Pending"}
        </p>
        <p>
          <strong>Created:</strong> {new Date(task.created_at).toLocaleString()}
        </p>

        <div className="task-actions">
          <button className="btn btn-secondary" onClick={toggle}>
            {task.completed ? "Mark as pending" : "Mark as completed"}
          </button>
          <button className="btn btn-danger" onClick={remove}>
            Delete
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Activity log</h2>
      {activity.length === 0 && <p>No activity yet.</p>}
      {activity.map((entry, i) => (
        <div className="card activity-row" key={i}>
          <span>{new Date(entry.timestamp).toLocaleString()}</span>
          <span>
            {entry.old_status ?? "created"} &rarr; {entry.new_status}
          </span>
        </div>
      ))}
    </div>
  );
}
