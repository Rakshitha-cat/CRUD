# Student Management System

A full-stack Student CRUD Web Application built with:

- **Frontend** — HTML5, CSS3, Vanilla JavaScript
- **Backend** — Node.js + Express.js
- **Database** — Supabase (PostgreSQL)

---

## Project Structure

```
student-CRUD/
│
├── backend/
│   ├── server.js          # Express REST API
│   ├── package.json
│   ├── .env.example       # Environment variable template
│   └── .gitignore
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── README.md
```

---

## Supabase — Create the Database Table

Log in to [Supabase](https://supabase.com), open your project, navigate to
**SQL Editor**, paste the following and click **Run**:

```sql
CREATE TABLE students (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  department  TEXT    NOT NULL,
  year        INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
  cgpa        NUMERIC NOT NULL CHECK (cgpa BETWEEN 0 AND 10),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Setup Instructions

### Step 1 — Install Node.js

Download and install the LTS version from https://nodejs.org.
Verify with:

```powershell
node -v
npm -v
```

### Step 2 — Open the project in VS Code

```powershell
code "C:\path\to\student-CRUD"
```

### Step 3 — Install backend dependencies

Open the integrated terminal and run:

```powershell
cd backend
npm init -y
npm install express @supabase/supabase-js cors dotenv
```

> The `npm init -y` is already done if you use the provided `package.json`.
> You only need to run `npm install` to restore `node_modules`.

### Step 4 — Create Supabase project and get credentials

1. Go to https://supabase.com and create a free account.
2. Create a new project.
3. Wait for the database to provision.
4. Create the `students` table using the SQL above.
5. Navigate to **Project Settings → API**.
6. Copy:
   - **Project URL** — e.g. `https://xyzxyz.supabase.co`
   - **Service Role key** (under "Project API Keys") — starts with `eyJ…`

> **Security note:** Use the **service role key** on the backend only.
> Never expose the service role key in frontend JavaScript or commit it to git.
> The `anon` public key is fine for frontend-only Supabase projects, but since
> this app uses a Node.js backend as the sole Supabase client, the service role
> key gives the backend full access without needing RLS policies.

### Step 5 — Create the .env file

Inside the `backend/` folder, create a file named `.env` (copy from `.env.example`):

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in your real values:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_service_role_key_here
PORT=3000
```

### Step 6 — Start the backend server

```powershell
node server.js
```

You should see:

```
Student Management API running on http://localhost:3000
```

### Step 7 — Open the frontend

Open `frontend/index.html` with **VS Code Live Server** (right-click →
*Open with Live Server*) or simply open it directly in your browser:

```
File → Open File → frontend/index.html
```

---

## REST API Reference

| Method | Endpoint          | Description           |
|--------|-------------------|-----------------------|
| GET    | /students         | Get all students      |
| GET    | /students/:id     | Get one student by ID |
| POST   | /students         | Create a new student  |
| PUT    | /students/:id     | Update a student      |
| DELETE | /students/:id     | Delete a student      |

### Example Request — Create student

```http
POST http://localhost:3000/students
Content-Type: application/json

{
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "department": "Computer Science",
  "year": 2,
  "cgpa": 8.75
}
```

### Example Response — Success

```json
{
  "success": true,
  "message": "Student created successfully.",
  "data": {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "department": "Computer Science",
    "year": 2,
    "cgpa": 8.75,
    "created_at": "2026-09-09T10:00:00Z"
  }
}
```

### Example Response — Validation Error

```json
{
  "success": false,
  "errors": [
    "Year must be an integer between 1 and 4.",
    "CGPA must be a number between 0 and 10."
  ]
}
```

---

## Validation Rules

| Field      | Rule                                      |
|------------|-------------------------------------------|
| name       | Required, non-empty string                |
| email      | Required, valid email format              |
| department | Required, non-empty string                |
| year       | Required, integer between 1 and 4         |
| cgpa       | Required, number between 0.0 and 10.0     |

Both frontend and backend enforce these rules. Server-side validation is always
authoritative — bad requests receive HTTP 400 with a clear error message.

---

## Testing Checklist

- [ ] **CREATE** — Fill in the form and click "Add Student". The table refreshes.
- [ ] **READ** — Students appear in the table on page load.
- [ ] **UPDATE** — Click "Edit", change a field, click "Update Student".
- [ ] **DELETE** — Click "Delete" and confirm. The row disappears.
- [ ] **Validation** — Submit with empty fields or invalid CGPA (e.g. 11). Errors appear.
- [ ] **Persistence** — Reload the page. Students are still there (stored in Supabase).

---

## Security Notes

- Supabase credentials are stored in `backend/.env`, which is git-ignored.
- The frontend never talks to Supabase directly.
- All data flows through the Express API, which is the only Supabase client.
- Input is trimmed and validated on the server before touching the database.
- HTML output is escaped in the frontend to prevent XSS.

---

## Common Issues

| Problem | Solution |
|---------|----------|
| `Cannot connect to server` | Make sure `node server.js` is running |
| `Missing SUPABASE_URL` on startup | Create `backend/.env` from `.env.example` |
| CORS error in browser | Confirm the backend has `app.use(cors())` |
| Table not found in Supabase | Run the `CREATE TABLE` SQL in the Supabase SQL Editor |
| `node_modules` missing | Run `npm install` inside the `backend/` folder |
