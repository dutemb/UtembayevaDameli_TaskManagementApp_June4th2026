# Carbon Arc Tasks

A lightweight task-management app. 

## Run it

From this folder:

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API docs (Swagger): http://localhost:3001/docs
- Login: **demo@carbonarc.co** / **password123**

Data is stored in memory, so it resets every time the backend restarts.

## Structure
Simplest structure i could compe up with basically 
.
├── docker-compose.yml      # runs both services together
├── backend/                # FastAPI app
│   ├── main.py             # the whole backend (app, storage, auth, routes)
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/             
    ├── src/                
    ├── Dockerfile       

```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Log in, returns a token |
| GET | /tasks | List tasks (paginated) |
| POST | /tasks | Create a task |
| GET | /tasks/{id} | Get one task |
| PATCH | /tasks/{id} | Edit title and/or completed (added — see below) |
| PUT | /tasks/{id}/complete | Mark a task completed |
| DELETE | /tasks/{id} | Delete a task |
| GET | /tasks/stats | Total / completed / pending counts |
| GET | /tasks/{id}/activity | Status-change log for a task |

## Assumptions & simplifications

-  no database, as the brief allows. Data resets on restart.
-ogin returns a random token that the server remembers; it's sent as `Authorization: Bearer <token>` on every request. No JWT/refresh tokens — in production I'd use a vetted library.
- backedn runs on port 3001


## Answers to the questions

### How did you handle API errors?

In a centralized way for handling the api errors. I have helpers that would just handle each error the same way. Handling 402/400 errors currently
This definitely would be improved had I more time 

### What tests would you write with more time?
Test every endpoint individually, capture cases where the body/request is empty. Create cases that throw errors

### What would you improve with 1 extra hour?
My data storage is O(n) and not scalable. Hashmap is an objectively bad choice here as it is not scalable, so I would do something about that first. Next would be authentication.
I currently generate a random string on login
