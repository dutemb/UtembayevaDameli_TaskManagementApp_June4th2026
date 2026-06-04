// All communication with the backend lives here.
// The browser runs on port 3000 and calls the backend on port 3001.

const API_URL = "http://localhost:3001";

// ---- Types (the shapes the backend returns) ----
export type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
};

export type ActivityEntry = {
  timestamp: string;
  old_status: string | null;
  new_status: string;
};

export type Stats = { total: number; completed: number; pending: number };

export type TaskPage = {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

// ---- Token helpers (saved in the browser) ----
export const getToken = () => localStorage.getItem("token");
export const setToken = (t: string) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");

// One request helper that attaches the token and turns errors into thrown messages.
async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) clearToken();
    let message = "Something went wrong.";
    try {
      const data = await res.json();
      message = data.detail || message;
    } catch {
      // response had no JSON body
    }
    throw new Error(message);
  }

  if (res.status === 204) return null; // delete returns no body
  return res.json();
}

// ---- The API the pages use ----
export const api = {
  login: (email: string, password: string): Promise<{ access_token: string }> =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  listTasks: (page: number, pageSize: number): Promise<TaskPage> =>
    request(`/tasks?page=${page}&page_size=${pageSize}`),

  getStats: (): Promise<Stats> => request("/tasks/stats"),

  createTask: (title: string): Promise<Task> =>
    request("/tasks", { method: "POST", body: JSON.stringify({ title }) }),

  getTask: (id: number | string): Promise<Task> => request(`/tasks/${id}`),

  updateTask: (id: number | string, data: { title?: string; completed?: boolean }): Promise<Task> =>
    request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteTask: (id: number | string): Promise<null> =>
    request(`/tasks/${id}`, { method: "DELETE" }),

  getActivity: (id: number | string): Promise<ActivityEntry[]> =>
    request(`/tasks/${id}/activity`),
};
