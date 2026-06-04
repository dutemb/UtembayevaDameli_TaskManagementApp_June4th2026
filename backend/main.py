"""
Carbon Arc Tasks API - the whole backend in one file.

Read it top to bottom:
  1. Setup        - create the app, allow the frontend to call it
  2. Data         - the in-memory storage (plain dicts) and request models
  3. Auth         - login + a simple check that requests carry a valid token
  4. Routes       - one function per endpoint

Run locally:  uvicorn main:app --reload --port 3001
Docs:         http://localhost:3001/docs
Login with:   demo@carbonarc.co / password123
"""

from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
import secrets


# ============================================================
# 1. SETUP
# ============================================================

app = FastAPI(title="Carbon Arc Tasks API")

# Let the React app (running on port 3000) call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 2. DATA  (everything is kept in memory; lost on restart)
# ============================================================

# All tasks, keyed by id. Each task looks like:
#   {"id": 1, "title": "...", "completed": False,
#    "created_at": datetime, "activity": [ {...}, ... ]}
tasks = {}

# The id to give the next new task.
next_id = 1

# Demo login. A real app would look users up in a database.
DEMO_EMAIL = "demo@carbonarc.co"
DEMO_PASSWORD = "password123"


# What the client sends when creating a task.
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


# What the client sends when editing a task (either field is optional).
class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    completed: bool | None = None


# What the client sends to log in.
class LoginRequest(BaseModel):
    email: str
    password: str


# function purpose: get the current time in UTC.
# arguments: none
# return: a datetime
# behavior: used so every timestamp is consistent.
def now():
    return datetime.now(timezone.utc)


# function purpose: find a task or stop with a 404.
# arguments: task_id (int)
# return: the task (dict)
# behavior: looks the task up in the map; raises 404 if it isn't there.
def find_task(task_id):
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")
    return task


# ============================================================
# 3. AUTH  (simple in-memory tokens)
# ============================================================

# The set of tokens that are currently valid (handed out at login).
valid_tokens = set()

# Reads the "Authorization: Bearer <token>" header.
bearer = HTTPBearer(auto_error=False)


# function purpose: make sure the request carries a valid token.
# arguments: credentials (the Bearer header, or None)
# return: None (it only guards; it doesn't return data)
# behavior: raises 401 if the token is missing or unknown. Add it to a route
#           with Depends(require_login) to protect that route.
def require_login(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    token = credentials.credentials if credentials else None
    if token not in valid_tokens:
        raise HTTPException(status_code=401, detail="Invalid or missing token.")


# function purpose: log in and get a token.
# arguments: body (LoginRequest with email + password)
# return: {"access_token": "...", "token_type": "bearer"}
# behavior: 401 if the credentials are wrong; otherwise makes a random token,
#           remembers it, and returns it.
@app.post("/auth/login")
def login(body: LoginRequest):
    if body.email.strip().lower() != DEMO_EMAIL or body.password != DEMO_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = secrets.token_urlsafe(32)
    valid_tokens.add(token)
    return {"access_token": token, "token_type": "bearer"}


# ============================================================
# 4. ROUTES  (every task route requires login)
# ============================================================

# function purpose: list tasks for one page, newest first.
# arguments: page (int, starts at 1), page_size (int)
# return: {"items": [...], "total", "page", "page_size", "total_pages"}
# behavior: sorts tasks by id (newest first) and returns the requested slice.
@app.get("/tasks", dependencies=[Depends(require_login)])
def list_tasks(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)):
    ordered = sorted(tasks.values(), key=lambda t: t["id"], reverse=True)
    total = len(ordered)
    start = (page - 1) * page_size
    items = ordered[start : start + page_size]
    total_pages = (total + page_size - 1) // page_size if total else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# function purpose: create a new task.
# arguments: body (TaskCreate with title)
# return: the new task (dict), with HTTP 201
# behavior: gives it the next id, marks it not completed, and starts its
#           activity log with a "created" entry.
@app.post("/tasks", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_login)])
def create_task(body: TaskCreate):
    global next_id
    task = {
        "id": next_id,
        "title": body.title.strip(),
        "completed": False,
        "created_at": now(),
        "activity": [{"timestamp": now(), "old_status": None, "new_status": "pending"}],
    }
    tasks[next_id] = task
    next_id += 1
    return task


# function purpose: return how many tasks are total / completed / pending.
# arguments: none
# return: {"total": int, "completed": int, "pending": int}
# behavior: counts completed tasks; pending is the rest. Declared before the
#           /tasks/{task_id} route so "stats" isn't treated as an id.
@app.get("/tasks/stats", dependencies=[Depends(require_login)])
def get_stats():
    total = len(tasks)
    completed = sum(1 for t in tasks.values() if t["completed"])
    return {"total": total, "completed": completed, "pending": total - completed}


# function purpose: get one task by id.
# arguments: task_id (int)
# return: the task (dict)
# behavior: 404 if it doesn't exist.
@app.get("/tasks/{task_id}", dependencies=[Depends(require_login)])
def get_task(task_id: int):
    return find_task(task_id)


# function purpose: edit a task's title and/or completed status.
# arguments: task_id (int), body (TaskUpdate)
# return: the updated task (dict)
# behavior: 404 if missing, 400 if the body is empty. If completed changes,
#           adds an activity entry. (Used by the UI's edit + toggle buttons.)
@app.patch("/tasks/{task_id}", dependencies=[Depends(require_login)])
def update_task(task_id: int, body: TaskUpdate):
    if body.title is None and body.completed is None:
        raise HTTPException(status_code=400, detail="Provide title and/or completed.")
    task = find_task(task_id)
    if body.title is not None:
        task["title"] = body.title.strip()
    if body.completed is not None and body.completed != task["completed"]:
        old = "completed" if task["completed"] else "pending"
        new = "completed" if body.completed else "pending"
        task["activity"].append({"timestamp": now(), "old_status": old, "new_status": new})
        task["completed"] = body.completed
    return task


# function purpose: mark a task completed.
# arguments: task_id (int)
# return: the updated task (dict)
# behavior: 404 if missing; does nothing extra if it's already completed.
@app.put("/tasks/{task_id}/complete", dependencies=[Depends(require_login)])
def complete_task(task_id: int):
    task = find_task(task_id)
    if not task["completed"]:
        task["activity"].append(
            {"timestamp": now(), "old_status": "pending", "new_status": "completed"}
        )
        task["completed"] = True
    return task


# function purpose: delete a task.
# arguments: task_id (int)
# return: nothing, with HTTP 204
# behavior: 404 if the id doesn't exist; otherwise removes it from the map.
@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_login)])
def delete_task(task_id: int):
    find_task(task_id)
    del tasks[task_id]


# function purpose: return a task's activity log.
# arguments: task_id (int)
# return: a list of entries, each {timestamp, old_status, new_status}
# behavior: 404 if the task doesn't exist. old_status is null for the first
#           ("created") entry.
@app.get("/tasks/{task_id}/activity", dependencies=[Depends(require_login)])
def get_activity(task_id: int):
    return find_task(task_id)["activity"]


# ============================================================
# Seed a couple of tasks so the app isn't empty on first run.
# (Optional - delete this block to start empty.)
# ============================================================
first = create_task(TaskCreate(title="Explore the Carbon Arc Insights Exchange"))
create_task(TaskCreate(title="Review data provider onboarding flow"))
complete_task(first["id"])
