# ClassSpace Platform — Windows Setup & Execution Guide

Follow these steps to run ClassSpace locally on Windows.

---

## 1. Prerequisites
- **Node.js**: v18.0.0 or later (Node v20+ or v24 recommended).
- **npm**: v9.0.0 or later.
- *(Optional)* **PostgreSQL**: Not required by default! Out-of-the-box, ClassSpace uses embedded SQLite (via `better-sqlite3`) for instant, zero-configuration local execution without database password setup. Full PostgreSQL schemas and drivers are also bundled if you wish to connect to an external PostgreSQL instance.

---

## 2. Quick Start (Automated 1-Command Setup)

From the project root directory (`AI_mp`):

```powershell
# 1. Install dependencies and seed sample database
npm run setup

# 2. Run backend API & mock plagiarism service in terminal 1:
npm run start:backend

# 3. In terminal 2, run the Vite frontend development server:
npm run start:frontend
```

Once running:
- **ClassSpace Web App:** [http://localhost:5173](http://localhost:5173)
- **Backend API Server:** [http://localhost:5000](http://localhost:5000)
- **Mock AI Plagiarism Service:** [http://localhost:5001](http://localhost:5001)

---

## 3. Manual Step-by-Step Instructions

### Step 1: Backend Setup
```powershell
cd backend
npm install
node db/seed.js
npm start
```
*Output will display:*
```
[ClassSpace API] Server running on http://localhost:5000
[Mock Plagiarism Service] Running on http://localhost:5001
```

### Step 2: Frontend Setup
Open a separate PowerShell terminal:
```powershell
cd frontend
npm install
npm run dev
```
*Output will display:*
```
  VITE v6.1.0  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 4. Running the 10 Critical Automated Tests

ClassSpace includes an end-to-end integration test suite verifying all 10 academic security and functional scenarios specified in project requirements:

```powershell
npm run test
```

*Verifies:*
1. Student enrolled in five subjects sees all five.
2. Student not enrolled in Java is forbidden from accessing Java course materials.
3. Teacher assigned to Java and Python sees only those assigned subjects.
4. Teacher cannot view or grade unauthorized submissions.
5. Administrator can create accounts and manage enrollments.
6. Students cannot access the teacher-only plagiarism checker.
7. "Check Plagiarism" generates a signed HMAC launch token and opens the external URL.
8. Expired and unauthorized integration requests are rejected.
9. Grades become visible to students only after teacher publication.
10. System state persists across logout and re-login.

---

## 5. Switching to PostgreSQL (Optional)

If your department requires PostgreSQL instead of embedded SQLite:
1. Ensure your PostgreSQL server is running.
2. Edit `backend/.env`:
   ```env
   DB_CLIENT=postgres
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/classspace
   ```
3. Run the schema migrations:
   ```powershell
   cd backend
   node db/init.js
   node db/seed.js
   ```

---

## 6. Windows 1-Click Launchers

For convenience during college project presentations, two 1-click scripts are provided in the project root:
- `start-classspace.bat`: Double-click from Windows File Explorer.
- `start-classspace.ps1`: Run from Windows PowerShell (`.\start-classspace.ps1`).

---

## 7. Google OAuth Setup Guide (@karunya.edu.in)

ClassSpace supports official Google Identity Services (GIS) for real student authentication:

### Step 1: Google Cloud Console Project
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project (e.g. `ClassSpace-Karunya-Portal`).

### Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** (or **Internal** if hosted within an institutional Google Workspace).
3. Set **App Name** to `ClassSpace`.
4. Provide your support email and developer contact email.
5. In **Scopes**, ensure `openid`, `https://www.googleapis.com/auth/userinfo.email`, and `https://www.googleapis.com/auth/userinfo.profile` are added.
6. Save and continue.

### Step 3: Create Web OAuth 2.0 Client ID
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Select **Web application**.
4. Set Name to `ClassSpace Web Client`.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:5173`
7. Click **Create** and copy your **Client ID** (format: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`).

### Step 4: Configure Environment Variables
Update both `backend/.env` and `frontend/.env`:

**In `backend/.env`:**
```env
INSTITUTIONAL_DOMAIN=karunya.edu.in
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**In `frontend/.env`:**
```env
VITE_INSTITUTIONAL_DOMAIN=karunya.edu.in
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Step 5: How Google Identity Services Works in ClassSpace
1. On `/login/student`, the official Google GIS button loads.
2. The user signs in using their institutional account (e.g. `jenishachristobel@karunya.edu.in`).
3. Google returns a cryptographically signed ID Token to the browser.
4. The frontend posts the ID token to `POST /api/auth/google-student-login`.
5. The backend validates the ID token directly with Google's public keys (`https://oauth2.googleapis.com/tokeninfo`).
6. The backend verifies:
   - Token signature and issuer (`accounts.google.com`)
   - `email_verified == true`
   - Client ID matches `GOOGLE_CLIENT_ID`
   - Token has not expired
   - Email strictly ends in `@karunya.edu.in`
7. If valid, the backend automatically provisions a student record (if new) with immutable role `student`, generates a JWT session, and logs the event in `login_activity_logs`.

