# ClassSpace Centralized Platform — API Documentation

**Base URL:** `http://localhost:5000/api`  
**Authentication:** JWT Bearer Token (`Authorization: Bearer <TOKEN>`)  
**Format:** JSON (`Content-Type: application/json`)  

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 User Login
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Body:**
  ```json
  {
    "email": "alex.student@classspace.edu",
    "password": "Student@123",
    "portal": "student"
  }
  ```
- **Rules:** The backend looks up the email and verifies password hash using bcrypt. If `portal` is provided, the backend enforces that the registered account matches the portal.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "redirectUrl": "/student/dashboard",
    "user": {
      "id": 5,
      "email": "alex.student@classspace.edu",
      "role": "student",
      "firstName": "Alex",
      "lastName": "Rivera",
      "studentId": 1,
      "studentCode": "STU-2024-001"
    }
  }
  ```

### 1.2 Get Current User Profile
- **Endpoint:** `GET /api/auth/me`
- **Access:** Authenticated (Any role)
- **Response (200 OK):** Current session user object with enrolled or teaching load metadata.

### 1.3 Request Password Reset (Demo)
- **Endpoint:** `POST /api/auth/forgot-password`
- **Access:** Public
- **Body:** `{ "email": "user@classspace.edu" }`

### 1.4 User Logout
- **Endpoint:** `POST /api/auth/logout`
- **Access:** Authenticated
- **Response (200 OK):** `{ "success": true, "message": "Successfully logged out." }`

### 1.5 Real Institutional Google Sign-In (@karunya.edu.in)
- **Endpoint:** `POST /api/auth/google-student-login`
- **Access:** Public
- **Body:** `{ "idToken": "<GOOGLE_GIS_ID_TOKEN>" }`
- **Validation:** Verifies credential with Google API (`https://oauth2.googleapis.com/tokeninfo`). Verifies audience, expiration, issuer, `email_verified: true`, and approved domain `@karunya.edu.in`.
- **Auto-Provisioning:** If student does not exist, securely creates user and student profile with immutable `role: 'student'`.

### 1.6 Institutional Email OTP Request
- **Endpoint:** `POST /api/auth/request-institutional-otp`
- **Access:** Public
- **Body:** `{ "email": "jenishachristobel@karunya.edu.in" }`
- **Rules:** Strictly validates `@karunya.edu.in`. Rejects `@gmail.com` and other unapproved domains. Issues 6-digit single-use code (5-min TTL).

### 1.7 Institutional Email OTP Verification
- **Endpoint:** `POST /api/auth/verify-institutional-otp`
- **Access:** Public
- **Body:** `{ "email": "jenishachristobel@karunya.edu.in", "code": "123456" }`
- **Rules:** Verifies code, rate limits attempts, and returns authenticated JWT session + student profile.

---

## 2. Central Administrator Endpoints (`/api/admin`)
*All admin endpoints require `role: 'admin'`.*

### 2.1 Dashboard Metrics
- **Endpoint:** `GET /api/admin/dashboard-stats`
- **Returns:** Total students, teachers, subjects, classes, active assignments, and recent audit logs.

### 2.2 Manage Students
- `GET /api/admin/students?search=&department=&status=&page=&limit=`: Filtered student catalog.
- `POST /api/admin/students`: Create new student account.
- `PUT /api/admin/students/:id`: Update student details or activate/deactivate account.
- `GET /api/admin/students/:id/enrollments`: View subjects enrolled for this student.
- `POST /api/admin/students/:id/enrollments`: Enroll student into a subject section.
- `DELETE /api/admin/students/:id/enrollments/:subjectId`: Remove student enrollment.

### 2.3 Manage Teachers
- `GET /api/admin/teachers`: List faculty with assigned subjects summary.
- `POST /api/admin/teachers`: Register new teacher account.
- `PUT /api/admin/teachers/:id`: Update faculty details or status.
- `GET /api/admin/teachers/:id/assignments`: View subject teaching assignments.
- `POST /api/admin/teachers/:id/assignments`: Authorize teacher to teach a subject.
- `DELETE /api/admin/teachers/:id/assignments/:subjectId`: Revoke teaching authorization.

### 2.4 Manage Subjects
- `GET /api/admin/subjects`: Dynamic subject list with counts and assigned faculty.
- `POST /api/admin/subjects`: Create curriculum subject with code, credits, color, and icon.
- `PUT /api/admin/subjects/:id`: Update subject metadata.
- `DELETE /api/admin/subjects/:id`: Remove subject.

### 2.5 Classes & Audit
- `GET /api/admin/classes`: List all sections and codes.
- `POST /api/admin/classes`: Add section and generate code.
- `GET /api/admin/all-assignments`: Platform-wide assignments overview.
- `GET /api/admin/audit-logs?action=&page=&limit=`: Searchable security and audit log stream.

---

## 3. Student Portal Endpoints (`/api/student`)
*All student endpoints require `role: 'student'` and verify that the student is enrolled in the target course.*

### 3.1 Student Dashboard
- **Endpoint:** `GET /api/student/dashboard`
- **Returns:** Enrolled subject count, pending assignments, upcoming deadlines, recently submitted work, recently published grades, and announcements.

### 3.2 My Subjects (Personalized Course List)
- **Endpoint:** `GET /api/student/subjects`
- **Rules:** Returns only subjects in which the authenticated student is actively enrolled.

### 3.3 Subject Workspace
- **Endpoint:** `GET /api/student/subjects/:subjectId`
- **Rules:** Verifies enrollment. Returns 403 Forbidden if student is not enrolled.
- **Includes:** Teacher profile, announcements, learning materials, and assignment checklist.

### 3.4 Assignment Details
- **Endpoint:** `GET /api/student/assignments/:assignmentId`
- **Rules:** Verifies enrollment. Returns assignment instructions, due date, max marks, student's own submission record, and published grade. Unpublished grades return `null`.

### 3.5 Submit or Resubmit Work
- **Endpoint:** `POST /api/student/assignments/:assignmentId/submit`
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data:**
  - `document`: File (PDF, DOCX, TXT) up to 15 MB.
  - `remarks`: Optional text note.
- **Rules:** Validates enrollment, file type, file size, late submission flag, and resubmission permissions.

### 3.6 Student Grades & Calendar
- `GET /api/student/grades`: All published grades and feedback across enrolled subjects.
- `GET /api/student/calendar`: Chronological timeline of upcoming deadlines.

---

## 4. Teacher Portal Endpoints (`/api/teacher`)
*All teacher endpoints require `role: 'teacher'` and enforce that the teacher is authorized for that specific subject.*

### 4.1 Faculty Dashboard
- **Endpoint:** `GET /api/teacher/dashboard`
- **Returns:** Assigned courses, student headcount, active coursework, and pending grading queue.

### 4.2 Assigned Subjects Only
- **Endpoint:** `GET /api/teacher/subjects`
- **Rules:** Returns only subjects assigned to the logged-in teacher by admin.

### 4.3 Subject Classroom Management
- **Endpoint:** `GET /api/teacher/subjects/:subjectId`
- **Rules:** Enforces teacher assignment ownership.
- **Includes:** Enrolled student roster, announcements, learning materials, and assignments.

### 4.4 Course Actions
- `POST /api/teacher/assignments`: Publish assignment with title, description, due date, max marks.
- `POST /api/teacher/announcements`: Broadcast announcement to students.
- `POST /api/teacher/materials`: Upload learning resource (PDF/doc).

### 4.5 Submissions Review Table
- **Endpoint:** `GET /api/teacher/assignments/:assignmentId/submissions`
- **Rules:** Verifies teacher ownership. Returns all student submissions with uploaded files, grades, and plagiarism report statuses.

### 4.6 Grade & Rubric Feedback
- **Endpoint:** `POST /api/teacher/submissions/:submissionId/grade`
- **Body:**
  ```json
  {
    "marksObtained": 95.0,
    "feedback": "Great algorithmic analysis and clean experimental charts.",
    "publishNow": true
  }
  ```
- **Rules:** Verifies teacher ownership. Enforces `marksObtained <= maxMarks`. Dispatches student notification and broadcasts SSE event when `publishNow = true`.

### 4.7 Request Resubmission / Return Work
- **Endpoint:** `POST /api/teacher/submissions/:submissionId/request-resubmission`
- **Body:**
  ```json
  {
    "reason": "Please format diagrams according to instructions and re-submit."
  }
  ```
- **Rules:** Sets submission status to `resubmitted` / returned, dispatches warning notification to student, and broadcasts `RESUBMISSION_REQUESTED` SSE event.

---

## 4b. Real-Time Notification & Event Endpoints (`/api/notifications`)

### 4b.1 Real-Time Server-Sent Events (SSE) Stream
- **Endpoint:** `GET /api/notifications/stream?token=<JWT>`
- **Headers:** `Accept: text/event-stream`
- **Events Emitted:**
  - `NOTIFICATION`: Real-time toast payload with unread count.
  - `ASSIGNMENT_PUBLISHED`: Dispatched to enrolled students when teacher publishes coursework.
  - `SUBMISSION_RECEIVED`: Dispatched to instructor when student submits work.
  - `GRADE_PUBLISHED`: Dispatched to student when marks are published.
  - `RESUBMISSION_REQUESTED`: Dispatched to student when work is returned.
  - `ANNOUNCEMENT_POSTED`: Dispatched to enrolled students when announcement is broadcast.

### 4b.2 Notification Management
- `GET /api/notifications`: Retrieves past 20 notifications with `unreadCount`.
- `PUT /api/notifications/:id/read`: Marks notification as read.
- `PUT /api/notifications/read-all`: Marks all notifications as read.

---

## 5. AI Plagiarism Integration Endpoints (`/api/plagiarism`)

### 5.1 Generate Signed Launch Token
- **Endpoint:** `POST /api/plagiarism/launch-token`
- **Access:** Authorized Teacher / Admin
- **Body:** `{ "assignmentId": 1, "submissionId": 1 }`
- **Security:** Verifies teacher assignment ownership. Issues HMAC-signed JWT token valid for 5 minutes.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "configured": true,
    "tokenId": "tok_plag_1729701000000_abc1234",
    "launchUrl": "http://localhost:5001/verify-plagiarism?token=eyJhbGciOi...",
    "targetStudent": "Alex Rivera",
    "comparisonCount": 2,
    "expiresInSeconds": 300
  }
  ```

### 5.2 Validate Token (External Service Check)
- **Endpoint:** `GET /api/plagiarism/validate-token?token=<TOKEN>`
- **Access:** External Integration Service

### 5.3 Report Synchronization Callback
- **Endpoint:** `POST /api/plagiarism/callback`
- **Access:** External Integration Service
- **Body:**
  ```json
  {
    "token": "eyJhbGciOi...",
    "similarityPercentage": 16.8,
    "matchedSubmissionId": 2,
    "reportUrl": "http://localhost:5001/reports/rep_1",
    "reportSummary": "16.8% similarity detected with peer submissions.",
    "status": "completed"
  }
  ```

### 5.4 Secure File Stream
- **Endpoint:** `GET /api/plagiarism/submissions/:submissionId/file`
- **Access:** Owner student, authorized teacher, or admin only.

