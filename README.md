# ClassSpace — Centralized Classroom Management Platform

![ClassSpace SaaS Platform](https://img.shields.io/badge/Platform-ClassSpace-blue.svg)
![Architecture](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Express%20%7C%20Tailwind%20%7C%20SQLite%2FPostgreSQL-indigo.svg)
![Security](https://img.shields.io/badge/Security-HMAC%20Signed%20Tokens%20%7C%20Role%20Enforcement-emerald.svg)
![Tests](https://img.shields.io/badge/Tests-24%20of%2024%20Passing-brightgreen.svg)

ClassSpace is a full-stack educational SaaS platform inspired by Google Classroom, engineered with original branding, role-based portals, centralized institutional administration, digital assignment submissions, institutional student login (@karunya.edu.in), admin audit login logs, and a secure cryptographic integration with a separate external AI Plagiarism Checker website.

---

## 1. System Architecture & Role Portals

ClassSpace provides **ONE centralized classroom website** with three role-isolated portals:

```
                                  +---------------------------------------+
                                  |         ClassSpace Central Auth       |
                                  |   (Identifies Verified DB Role)       |
                                  +-------------------+-------------------+
                                                      |
                    +---------------------------------+---------------------------------+
                    |                                 |                                 |
                    v                                 v                                 v
      +---------------------------+     +---------------------------+     +---------------------------+
      |       Admin Portal        |     |      Teacher Portal       |     |      Student Portal       |
      |   (Central Authority)     |     | (Assigned Subjects Only)  |     |   (Enrolled Subjects)     |
      +---------------------------+     +---------------------------+     +---------------------------+
      | - Total Students/Teachers |     | - My Assigned Subjects    |     | - Personalized Dashboard  |
      | - Dynamic Subject Catalog |     | - Student Class Rosters   |     | - My Enrolled Subjects    |
      | - Course Sections/Codes   |     | - Create Coursework       |     | - Document Submissions    |
      | - Student Enrollments     |     | - Submission Review Table |     | - Resubmission Control    |
      | - Teacher Assignments     |     | - Grade & Publish Marks   |     | - Published Grades/Rubric |
      | - System Audit Logs       |     | - AI Plagiarism Card      |     | - Academic Deadlines Cal  |
      +---------------------------+     +---------------------------+     +---------------------------+
                                                      |
                                                      v (Cryptographic Signed Token)
                                        +---------------------------+
                                        |   External AI Plagiarism  |
                                        |      Checker Website      |
                                        | (Nexus AI Analysis Engine)|
                                        +---------------------------+
```

### Authentication Rules
- **No Role Spoofing:** Users cannot choose their role on the login form to gain elevated access. The backend queries the registered email account in the database and retrieves the verified role.
- **Dedicated Login Pages:** Consistent, distinct login pages for Admin (`/login/admin`), Student (`/login/student`), and Teacher (`/login/teacher`).
- **Resource Ownership Verification:** Every protected endpoint validates subject enrollment or teaching authorization on the backend, not solely in client-side routing.

---

## 2. Dedicated AI Plagiarism Checker Integration

On the Teacher's Assignment Submissions page, ClassSpace features a dedicated clickable card:

### The AI Plagiarism Card
- **Title:** **AI Plagiarism Checker**
- **Subtitle:** *"Compare a selected student's assignment against other submissions in the same assignment."*
- **Action Flow:**
  1. Instructor opens an authorized assignment's submission table.
  2. Instructor selects a specific student's submission.
  3. Clicking **Check Plagiarism** verifies the teacher's ownership and generates a **short-lived signed JWT launch token** (valid for 5 minutes).
  4. ClassSpace launches the external website: `${PLAGIARISM_CHECKER_URL}?token=${SIGNED_TOKEN}`.
  5. The external website receives the target submission reference and assignment peer pool, runs comparative analysis, and posts the report back to ClassSpace via `POST /api/plagiarism/callback`.
  6. The similarity percentage and report link are saved in the ClassSpace database and displayed in the submissions table.

> Full API contract specifications are documented in [`docs/PLAGIARISM_INTEGRATION_CONTRACT.md`](docs/PLAGIARISM_INTEGRATION_CONTRACT.md).

---

## 2b. Real Institutional Student Login & Admin Audit Logging

ClassSpace supports real students logging in using their approved institutional email addresses:
- **Approved Institutional Domain:** Strictly accepts emails ending in `@karunya.edu.in` (e.g. `jenishachristobel@karunya.edu.in`).
- **Domain & Verification Enforcement:** Non-institutional email domains (`@gmail.com`, `@yahoo.com`, `@outlook.com`) and unverified accounts are rejected on both frontend and backend.
- **Auto-Provisioning with Role Isolation:** First-time institutional logins auto-create a student profile with role `student`. Students can never elevate themselves to `teacher` or `admin`. Course enrollment remains centrally managed.
- **Two Institutional Sign-in Methods:**
  1. **Google Identity Services (GIS) / OAuth:** Direct institutional Google account authentication with backend ID token validation.
  2. **Institutional Email OTP:** 6-digit one-time code sent and verified server-side.
- **Admin Login Activity Logs (`/admin/login-activity`):**
  - Database-backed live audit log in `login_activity_logs`.
  - Records student name, institutional email, role, UTC timestamp, auth provider, status (`successful` / `failed`), and event IDs.
  - Multi-facet filters (Email, Role, Outcome, Provider, Date) and pagination.
  - Admin Dashboard KPI cards: *Total Registered Students*, *Total Registered Teachers*, *Successful Logins Today*, *Unique Students Logged In Today*.
  - Strict RBAC: Students and Teachers receive HTTP 403 Forbidden if attempting to access audit logs.

---

## 2c. Real-Time Updates (Server-Sent Events) & Resubmission Lifecycle

ClassSpace incorporates continuous live academic synchronization via persistent Server-Sent Events (`GET /api/notifications/stream`):
- **Lightweight & Reverse-Proxy Compatible:** Operates over standard HTTP/HTTPS with automatic client reconnection and 20-second keepalive heartbeats.
- **Assignment Publication Broadcast:** When an instructor publishes new coursework, all enrolled students' dashboards and notification centers immediately receive the event.
- **Instant Submission Alerts:** When a student submits coursework, the assigned instructor's submissions table and pending count update in real time.
- **Grade Publication Notice:** Publishing marks pushes a notification and unmasks the grade directly to the target student without page reload.
- **Immutable Submission Versioning:** Every resubmission preserves previous files in `submission_versions`. Students can inspect their submission timeline, and teachers can review previous draft files or return work with feedback.

---

## 3. Database Design & Relational Integrity

ClassSpace implements a relational schema supporting both **SQLite 3** (zero-config local default) and **PostgreSQL**:

- `users`: Core account credentials, hashed passwords, roles (`admin`, `teacher`, `student`), and status.
- `students`: Linked to `users`, student ID / roll number, department, semester.
- `teachers`: Linked to `users`, employee ID, department, designation, office room.
- `subjects`: Dynamic curriculum catalog (`code`, `name`, `department`, `credits`, `color`, `icon`).
- `classes`: Section allocations (`section`, `academic_term`, unique `class_code`).
- `teacher_subject_assignments`: Centralized mapping of teachers to authorized subjects and classes.
- `student_enrollments`: Many-to-many relationship linking students to enrolled subjects.
- `announcements`: Course bulletins broadcast by instructors.
- `learning_materials`: Downloadable lecture notes, slides, and reference handouts.
- `assignments`: Published coursework with deadlines, max marks, allowed file types, and resubmission rules.
- `submissions`: Student work records with upload timestamps, status, current version pointer, and remarks.
- `submission_versions`: Immutable archive of each submission version (file path, version number, upload timestamp, remarks).
- `submission_files`: Stored files (PDF, DOCX, TXT) with MIME types and sizes.
- `grades`: Scores obtained, teacher feedback, and publication state (`is_published`).
- `plagiarism_checks`: External token IDs, similarity scores, and report URLs.
- `audit_logs`: Timestamped system-wide security, authorization, and grading audit stream.

---

## 4. Quick Start Guide (Windows)

### Option A: Automatic 1-Click Launchers
- **Batch Launcher:** Double-click [`start-classspace.bat`](start-classspace.bat)
- **PowerShell Launcher:** Run `.\start-classspace.ps1` in PowerShell

### Option B: Terminal Setup
```powershell
# 1. Install dependencies and seed sample database
npm run setup

# 2. In terminal 1: Start backend & mock plagiarism engine
npm run start:backend

# 3. In terminal 2: Start frontend development server
npm run start:frontend
```

Open your browser to:
- **ClassSpace Web App:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Mock AI Plagiarism Checker:** [http://localhost:5001](http://localhost:5001)

---

## 5. Verified Critical Test Scenarios

Run the automated integration test suite:
```powershell
npm test
```

### Test Suite Execution Output
```
▶ ClassSpace 10 Critical Test Scenarios
  ✔ Case 1: A student enrolled in five subjects sees all five
  ✔ Case 2: A student not enrolled in Java cannot access Java course materials (HTTP 403)
  ✔ Case 3: A teacher assigned to Java and Python sees only those assigned subjects
  ✔ Case 4: A teacher cannot view or grade another teacher's unauthorized submissions
  ✔ Case 5: An administrator can create accounts and manage enrollments
  ✔ Case 6: A student cannot access the teacher-only plagiarism checker
  ✔ Case 7: Clicking Check Plagiarism launches configured external application with signed token
  ✔ Case 8: Unauthorized and expired integration requests are rejected
  ✔ Case 8b: Inaccessible documents are rejected gracefully without faking analysis
  ✔ Case 8c: External service retrieves authorized document text using valid launch token
  ✔ Case 8d: Unreachable external service is detected and reported without simulating success
  ✔ Case 9: Grades are visible to students only after publication
  ✔ Case 10: Changes persist after logging out and logging back in
  ✔ Case 11: Real, verified @karunya.edu.in account signs in and auto-provisions student profile
  ✔ Case 12: User with unapproved email domain (@gmail.com) is rejected from student login
  ✔ Case 13: Unverified email account is rejected
  ✔ Case 14: Existing institutional student signs in without creating duplicate account
  ✔ Case 15: Institutional OTP verification flow authenticates eligible student
  ✔ Case 16: Login events are recorded in login_activity_logs with server timestamps
  ✔ Case 17: Students and Teachers are forbidden from accessing admin login activity logs
  ✔ Case 18: Admin Dashboard Login Summary reflects database counts
  ✔ Case 19: Submission versions are preserved and accessible in assignment details
  ✔ Case 20: Teacher can request work resubmission and student receives notification
  ✔ Case 21: Real-time notification endpoint establishes text/event-stream with client authentication
✔ ClassSpace 10 Critical Test Scenarios (24 of 24 passed)
```

---

## 6. Demo Accounts & Credentials

| Role | Name | Email | Password | Access Details |
|---|---|---|---|---|
| **Admin** | System Administrator | `admin@classspace.edu` | `Admin@123` | Full administrative control |
| **Teacher** | Prof. Robert Vance | `prof.vance@classspace.edu` | `Teacher@123` | Assigned to **Java** & **Python** only |
| **Teacher** | Dr. Maya Patel | `dr.patel@classspace.edu` | `Teacher@123` | Assigned to **AI** & **Data Structures** |
| **Teacher** | Prof. David Clark | `prof.clark@classspace.edu` | `Teacher@123` | Assigned to **DBMS** |
| **Student** | Alex Rivera | `alex.student@classspace.edu` | `Student@123` | Enrolled in **5 Subjects** (AI, Java, Python, DS, DBMS) |
| **Student** | Noah Williams | `noah.student@classspace.edu` | `Student@123` | Enrolled in 3 Subjects (**NOT** enrolled in Java) |

> Detailed documentation in [`docs/DEMO_ACCOUNTS.md`](docs/DEMO_ACCOUNTS.md).

---

## 7. Deliverables Index

- **Frontend Code:** [`frontend/src/`](frontend/src) (React, Vite, Tailwind CSS, Lucide icons, React Router)
- **Backend Code:** [`backend/`](backend) (Express REST API, Multer upload security, JWT authentication)
- **Database Schema:** [`backend/db/schema-sqlite.sql`](backend/db/schema-sqlite.sql) and [`backend/db/schema-postgresql.sql`](backend/db/schema-postgresql.sql)
- **Seeded Academic Demo Data:** [`backend/db/seed.js`](backend/db/seed.js)
- **Mock AI Plagiarism Service:** [`backend/mock-plagiarism-service/`](backend/mock-plagiarism-service)
- **API Documentation:** [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)
- **Plagiarism Integration Contract:** [`docs/PLAGIARISM_INTEGRATION_CONTRACT.md`](docs/PLAGIARISM_INTEGRATION_CONTRACT.md)
- **Setup & Execution Guide:** [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md)

