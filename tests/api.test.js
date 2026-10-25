process.env.NODE_ENV = 'test';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

let app;
let server;
const isWin = process.platform === 'win32';
const pipePath = isWin ? `\\\\.\\pipe\\classspace_test_${Date.now()}` : null;
let baseUrl = 'http://localhost:5000';

function buildMultipart(fields = {}, file = null) {
  const boundary = '----ClassSpaceBoundary' + Math.random().toString(36).substring(2);
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
  }

  if (file) {
    const fileContent = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname || 'document'}"; filename="${file.filename || 'submission.pdf'}"\r\nContent-Type: ${file.mimetype || 'application/pdf'}\r\n\r\n`
    ));
    parts.push(fileContent);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const body = Buffer.concat(parts);

  return {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    },
    body
  };
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    let body = options.body;

    if (body && typeof body === 'object' && !(body instanceof Buffer)) {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const reqOptions = pipePath
      ? {
          socketPath: pipePath,
          path,
          method: options.method || 'GET',
          headers
        }
      : {
          ...new URL(path, baseUrl),
          method: options.method || 'GET',
          headers
        };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('ClassSpace 10 Critical Test Scenarios', () => {
  let adminToken;
  let alexStudentToken;
  let noahStudentToken;
  let profVanceToken;
  let drPatelToken;
  let profClarkToken;
  let pythonSubmissionId;

  before(async () => {
    // Re-seed DB to clean slate
    const { seed } = require('../backend/db/seed');
    await seed();
    app = require('../backend/server');
    server = app.startServer ? app.startServer(pipePath || 5000) : null;
    if (server && !server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }

    // Authenticate Admin
    const adminRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@classspace.edu', password: 'Admin@123', portal: 'admin' }
    });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.token;

    // Authenticate Student: Alex (Enrolled in 5 subjects)
    const alexRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'alex.student@classspace.edu', password: 'Student@123', portal: 'student' }
    });
    assert.strictEqual(alexRes.status, 200);
    alexStudentToken = alexRes.body.token;

    // Authenticate Student: Noah (NOT enrolled in Java CS302)
    const noahRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'noah.student@classspace.edu', password: 'Student@123', portal: 'student' }
    });
    assert.strictEqual(noahRes.status, 200);
    noahStudentToken = noahRes.body.token;

    // Authenticate Teacher: Prof. Vance (Assigned to Java CS302 & Python CS205)
    const vanceRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'prof.vance@classspace.edu', password: 'Teacher@123', portal: 'teacher' }
    });
    assert.strictEqual(vanceRes.status, 200);
    profVanceToken = vanceRes.body.token;

    // Authenticate Teacher: Dr. Patel (Assigned to AI CS401 & Data Structures CS201)
    const patelRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'dr.patel@classspace.edu', password: 'Teacher@123', portal: 'teacher' }
    });
    assert.strictEqual(patelRes.status, 200);
    drPatelToken = patelRes.body.token;

    // Authenticate Teacher: Prof. Clark (Assigned to DBMS CS305)
    const clarkRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'prof.clark@classspace.edu', password: 'Teacher@123', portal: 'teacher' }
    });
    assert.strictEqual(clarkRes.status, 200);
    profClarkToken = clarkRes.body.token;
  });

  after(async () => {
    if (app && app.closeServer) {
      app.closeServer();
    }
    const mockPlag = require('../backend/mock-plagiarism-service/server');
    if (mockPlag && mockPlag.closeServer) {
      mockPlag.closeServer();
    }
  });

  test('Case 1: A student enrolled in five subjects sees all five', async () => {
    const res = await request('/api/student/subjects', {
      headers: { Authorization: `Bearer ${alexStudentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.subjects.length, 5, 'Alex Rivera must have exactly 5 enrolled subjects');

    const subjectCodes = res.body.subjects.map(s => s.code);
    assert.ok(subjectCodes.includes('CS401'), 'Includes AI (CS401)');
    assert.ok(subjectCodes.includes('CS302'), 'Includes Java (CS302)');
    assert.ok(subjectCodes.includes('CS205'), 'Includes Python (CS205)');
    assert.ok(subjectCodes.includes('CS201'), 'Includes Data Structures (CS201)');
    assert.ok(subjectCodes.includes('CS305'), 'Includes DBMS (CS305)');
  });

  test('Case 2: A student not enrolled in Java cannot access Java course materials', async () => {
    // Noah is enrolled in AI, Python, DS, DBMS - but NOT Java (CS302, ID: 2)
    const res = await request('/api/student/subjects/2', {
      headers: { Authorization: `Bearer ${noahStudentToken}` }
    });
    assert.strictEqual(res.status, 403, 'Unauthorized student should receive HTTP 403 Forbidden');
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('not enrolled'), 'Message must explain unauthorized enrollment');
  });

  test('Case 3: A teacher assigned to Java and Python sees only those assigned subjects', async () => {
    // Prof. Vance teaches Java (CS302) & Python (CS205)
    const res = await request('/api/teacher/subjects', {
      headers: { Authorization: `Bearer ${profVanceToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.subjects.length, 2, 'Prof. Vance must see exactly 2 assigned subjects');

    const codes = res.body.subjects.map(s => s.code);
    assert.deepStrictEqual(codes.sort(), ['CS205', 'CS302'].sort());
  });

  test('Case 4: A teacher cannot view or grade another teacher\'s unauthorized submissions', async () => {
    // Prof. Vance (Java/Python) tries to access Dr. Patel's AI assignment submissions (Assignment ID: 1)
    const res = await request('/api/teacher/assignments/1/submissions', {
      headers: { Authorization: `Bearer ${profVanceToken}` }
    });
    assert.strictEqual(res.status, 403, 'Unauthorized teacher must receive 403 Forbidden');
    assert.strictEqual(res.body.success, false);

    // Prof. Vance tries to grade Dr. Patel's submission (Submission ID: 1)
    const gradeRes = await request('/api/teacher/submissions/1/grade', {
      method: 'POST',
      headers: { Authorization: `Bearer ${profVanceToken}` },
      body: { marksObtained: 95, feedback: 'Unauthorized grade attempt' }
    });
    assert.strictEqual(gradeRes.status, 403, 'Grading unauthorized subject must be rejected');
    assert.strictEqual(gradeRes.body.success, false);
  });

  test('Case 5: An administrator can create accounts and manage enrollments', async () => {
    // 1. Admin creates a new student account
    const uniqueEmail = `lucas.scott.${Date.now()}@classspace.edu`;
    const uniqueStudentId = `STU-2024-${Math.floor(100 + Math.random() * 900)}`;
    const createStudentRes = await request('/api/admin/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        firstName: 'Lucas',
        lastName: 'Scott',
        email: uniqueEmail,
        studentId: uniqueStudentId,
        password: 'Password@123',
        department: 'Computer Science'
      }
    });
    assert.strictEqual(createStudentRes.status, 201);
    assert.strictEqual(createStudentRes.body.success, true);
    const newStudentDbId = createStudentRes.body.student.id;

    // 2. Admin enrolls this student into Subject 2 (Java CS302)
    const enrollRes = await request(`/api/admin/students/${newStudentDbId}/enrollments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { subjectId: 2 }
    });
    assert.strictEqual(enrollRes.status, 201);
    assert.strictEqual(enrollRes.body.success, true);

    // 3. Prevent duplicate enrollment
    const dupRes = await request(`/api/admin/students/${newStudentDbId}/enrollments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { subjectId: 2 }
    });
    assert.strictEqual(dupRes.status, 400, 'Duplicate enrollment must return 400 Bad Request');

    // 4. Admin removes enrollment
    const deleteRes = await request(`/api/admin/students/${newStudentDbId}/enrollments/2`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.body.success, true);
  });

  test('Case 6: A student cannot access the teacher-only plagiarism checker', async () => {
    const res = await request('/api/plagiarism/launch-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${alexStudentToken}` },
      body: { assignmentId: 1, submissionId: 1 }
    });
    assert.strictEqual(res.status, 403, 'Student should be forbidden from generating launch token');
    assert.strictEqual(res.body.success, false);
  });

  test('Case 7: Clicking Check Plagiarism launches configured external application with signed token', async () => {
    // Dr. Patel is authorized for Assignment 1 (AI)
    const res = await request('/api/plagiarism/launch-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${drPatelToken}` },
      body: { assignmentId: 1, submissionId: 1, skipHealthCheck: true }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.configured, true);
    assert.ok(res.body.token, 'Response contains signed JWT token');
    assert.ok(res.body.launchUrl.includes('token='), 'Launch URL contains signed token');
    assert.ok(res.body.launchUrl.includes('/verify-plagiarism'));
    assert.strictEqual(res.body.comparisonCount > 0, true, 'Comparison pool contains eligible peer submissions');
  });

  test('Case 8: Unauthorized and expired integration requests are rejected', async () => {
    // Invalid signature token
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload';
    const validateRes = await request(`/api/plagiarism/validate-token?token=${invalidToken}`);
    assert.strictEqual(validateRes.status, 401);
    assert.strictEqual(validateRes.body.success, false);

    // Expired or forged token sent to callback
    const callbackRes = await request('/api/plagiarism/callback', {
      method: 'POST',
      body: { token: invalidToken, similarityPercentage: 50 }
    });
    assert.strictEqual(callbackRes.status, 401);
    assert.strictEqual(callbackRes.body.success, false);
  });

  test('Case 8b: Inaccessible documents are rejected gracefully without faking analysis', async () => {
    // Insert a dummy submission with a file that does NOT physically exist on disk
    const db = require('../backend/config/database');
    const dummySub = db.run(
      `INSERT INTO submissions (assignment_id, student_id, submitted_at, status, remarks, version)
       VALUES (1, 5, datetime('now'), 'submitted', 'Test missing file', 1)`
    );
    db.run(
      `INSERT INTO submission_files (submission_id, file_name, file_path, file_size, mime_type)
       VALUES (?, 'non_existent_file_9999.txt', 'uploads/non_existent_file_9999.txt', 1234, 'text/plain')`,
      [dummySub.lastInsertRowid]
    );

    const res = await request('/api/plagiarism/launch-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${drPatelToken}` },
      body: { assignmentId: 1, submissionId: dummySub.lastInsertRowid, skipHealthCheck: true }
    });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'INACCESSIBLE_DOCUMENT');
    assert.ok(res.body.message.includes('inaccessible') || res.body.message.includes('missing'));
  });

  test('Case 8c: External service retrieves authorized document text using valid launch token', async () => {
    // Generate valid token for Assignment 1, Submission 1
    const launchRes = await request('/api/plagiarism/launch-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${drPatelToken}` },
      body: { assignmentId: 1, submissionId: 1, skipHealthCheck: true }
    });
    assert.strictEqual(launchRes.status, 200);
    const token = launchRes.body.token;
    const tokenId = launchRes.body.tokenId;

    // External service requests document text
    const docRes = await request(`/api/plagiarism/document-text/${tokenId}/1?token=${token}`);
    assert.strictEqual(docRes.status, 200);
    assert.strictEqual(docRes.body.success, true);
    assert.ok(docRes.body.text.includes('A* Search Algorithm'), 'Document text retrieved correctly');
  });

  test('Case 8d: Unreachable external service is detected and reported without simulating success', async () => {
    // Point to a dead/unbound local port 59999
    const res = await request('/api/plagiarism/launch-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${drPatelToken}` },
      body: {
        assignmentId: 1,
        submissionId: 1,
        destinationUrl: 'http://localhost:59999/verify-plagiarism',
        skipHealthCheck: false
      }
    });

    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'EXTERNAL_SERVICE_UNAVAILABLE');
    assert.ok(res.body.message.includes('unreachable') || res.body.message.includes('offline'));
  });

  test('Case 9: Grades are visible to students only after publication', async () => {
    // In seed, Emma Watson (submission 2) was graded with 88.5, but is_published = 0
    const emmaRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'emma.student@classspace.edu', password: 'Student@123', portal: 'student' }
    });
    const emmaToken = emmaRes.body.token;

    const assignmentDetailRes = await request('/api/student/assignments/1', {
      headers: { Authorization: `Bearer ${emmaToken}` }
    });
    assert.strictEqual(assignmentDetailRes.status, 200);
    assert.strictEqual(assignmentDetailRes.body.grade, null, 'Unpublished grade must not be visible to student');

    // Now Dr. Patel publishes the grade
    const publishRes = await request('/api/teacher/submissions/2/grade', {
      method: 'POST',
      headers: { Authorization: `Bearer ${drPatelToken}` },
      body: { marksObtained: 88.5, feedback: 'Good job!', publishNow: true }
    });
    assert.strictEqual(publishRes.status, 200);

    // Now Emma checks again
    const publishedCheckRes = await request('/api/student/assignments/1', {
      headers: { Authorization: `Bearer ${emmaToken}` }
    });
    assert.strictEqual(publishedCheckRes.status, 200);
    assert.ok(publishedCheckRes.body.grade !== null, 'Published grade is now visible');
    assert.strictEqual(publishedCheckRes.body.grade.marks_obtained, 88.5);
  });

  test('Case 10: Changes persist after logging out and logging back in', async () => {
    // 1. Alex student submits an assignment
    const alexLogin1 = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'alex.student@classspace.edu', password: 'Student@123', portal: 'student' }
    });
    const token1 = alexLogin1.body.token;

    // 2. Alex logs out
    const logoutRes = await request('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(logoutRes.status, 200);

    // 3. Alex logs back in
    const alexLogin2 = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'alex.student@classspace.edu', password: 'Student@123', portal: 'student' }
    });
    assert.strictEqual(alexLogin2.status, 200);
    const token2 = alexLogin2.body.token;

    // 4. Check dashboard data persists
    const dashRes = await request('/api/student/dashboard', {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert.strictEqual(dashRes.status, 200);
    assert.strictEqual(dashRes.body.stats.enrolledSubjectsCount, 5, 'Enrolled count persists');
  });

  /* ========================================================================= */
  /* NEW FEATURE TESTS: REAL INSTITUTIONAL STUDENT LOGIN & LOGIN ACTIVITY LOGS */
  /* ========================================================================= */

  test('Case 11: Real, verified @karunya.edu.in account signs in and auto-provisions student profile', async () => {
    const res = await request('/api/auth/google-student-login', {
      method: 'POST',
      body: {
        idToken: 'mock_google_token_jenishachristobel@karunya.edu.in_true_Jenisha Christobel'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.email, 'jenishachristobel@karunya.edu.in');
    assert.strictEqual(res.body.user.role, 'student', 'Must strictly auto-assign Student role');
    assert.strictEqual(res.body.redirectUrl, '/student/dashboard', 'Must redirect to Student Dashboard');
    assert.ok(res.body.token, 'Must return signed session token');

    // Verify database record
    const db = require('../backend/config/database');
    const dbUser = db.get('SELECT * FROM users WHERE email = ?', ['jenishachristobel@karunya.edu.in']);
    assert.ok(dbUser, 'User record must exist in database');
    assert.strictEqual(dbUser.role, 'student');

    const dbStudent = db.get('SELECT * FROM students WHERE user_id = ?', [dbUser.id]);
    assert.ok(dbStudent, 'Student profile record must be created');
  });

  test('Case 12: User with unapproved email domain (@gmail.com) is rejected from student login', async () => {
    const res = await request('/api/auth/google-student-login', {
      method: 'POST',
      body: {
        idToken: 'mock_google_token_student.personal@gmail.com_true_Personal User'
      }
    });

    assert.strictEqual(res.status, 403, 'Personal email must receive HTTP 403 Forbidden');
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('Personal email addresses') || res.body.message.includes('karunya.edu.in'));
  });

  test('Case 13: Unverified email account is rejected', async () => {
    const res = await request('/api/auth/google-student-login', {
      method: 'POST',
      body: {
        idToken: 'mock_google_token_unverified@karunya.edu.in_false_Unverified User'
      }
    });

    assert.strictEqual(res.status, 401, 'Unverified email must receive HTTP 401 Unauthorized');
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'UNVERIFIED_EMAIL');
  });

  test('Case 14: Existing institutional student signs in without creating duplicate account', async () => {
    const db = require('../backend/config/database');
    const countBefore = db.get('SELECT COUNT(*) as count FROM users WHERE email = ?', ['jenishachristobel@karunya.edu.in']).count;
    assert.strictEqual(countBefore, 1);

    const res = await request('/api/auth/google-student-login', {
      method: 'POST',
      body: {
        idToken: 'mock_google_token_jenishachristobel@karunya.edu.in_true_Jenisha Christobel'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.isNewUser, false, 'Must identify returning user');

    const countAfter = db.get('SELECT COUNT(*) as count FROM users WHERE email = ?', ['jenishachristobel@karunya.edu.in']).count;
    assert.strictEqual(countAfter, 1, 'Account count must remain strictly 1 (no duplicates)');
  });

  test('Case 15: Institutional OTP verification flow authenticates eligible student', async () => {
    // 1. Request OTP for institutional address
    const otpReq = await request('/api/auth/request-institutional-otp', {
      method: 'POST',
      body: { email: 'student2@karunya.edu.in' }
    });
    assert.strictEqual(otpReq.status, 200);
    assert.strictEqual(otpReq.body.success, true);
    const code = otpReq.body.devCode;
    assert.ok(code, 'Dev verification code generated');

    // 2. Reject incorrect code
    const badVerify = await request('/api/auth/verify-institutional-otp', {
      method: 'POST',
      body: { email: 'student2@karunya.edu.in', code: '000000' }
    });
    assert.strictEqual(badVerify.status, 401);

    // 3. Accept correct code
    const goodVerify = await request('/api/auth/verify-institutional-otp', {
      method: 'POST',
      body: { email: 'student2@karunya.edu.in', code }
    });
    assert.strictEqual(goodVerify.status, 200);
    assert.strictEqual(goodVerify.body.success, true);
    assert.strictEqual(goodVerify.body.user.role, 'student');
  });

  test('Case 16: Login events are recorded in login_activity_logs with server timestamps', async () => {
    const res = await request('/api/admin/login-activity', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.logs.length > 0, 'Must contain authentic database records');

    const emails = res.body.logs.map(l => l.email);
    assert.ok(emails.includes('jenishachristobel@karunya.edu.in'), 'Includes Jenisha Christobel login');

    // Check failed attempt recorded
    const failedLogs = res.body.logs.filter(l => l.login_status === 'failed');
    assert.ok(failedLogs.length > 0, 'Failed attempts must be logged in audit table');

    // Check timestamp validity
    const firstLog = res.body.logs[0];
    assert.ok(firstLog.login_timestamp, 'Must contain server timestamp');
    assert.ok(!isNaN(new Date(firstLog.login_timestamp).getTime()), 'Must be valid date');
  });

  test('Case 17: Students and Teachers are forbidden from accessing admin login activity logs', async () => {
    // Student attempt
    const studentRes = await request('/api/admin/login-activity', {
      headers: { Authorization: `Bearer ${alexStudentToken}` }
    });
    assert.strictEqual(studentRes.status, 403, 'Student must receive 403 Forbidden');

    // Teacher attempt
    const teacherRes = await request('/api/admin/login-activity', {
      headers: { Authorization: `Bearer ${profVanceToken}` }
    });
    assert.strictEqual(teacherRes.status, 403, 'Teacher must receive 403 Forbidden');
  });

  test('Case 18: Admin Dashboard Login Summary reflects database counts', async () => {
    const res = await request('/api/admin/dashboard-stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.stats.successfulLoginsToday >= 1, 'Successful logins today must be >= 1');
    assert.ok(res.body.stats.uniqueStudentsLoggedInToday >= 1, 'Unique students today must be >= 1');
    assert.ok(res.body.loginSummary, 'Must contain loginSummary object');
    assert.ok(res.body.loginSummary.recentLoginLogs.length >= 1, 'Must contain recent login activity');
  });

  test('Case 19: Submission versions are preserved and accessible in assignment details', async () => {
    // Alex checks assignment 1 details where he has a seeded submission
    const res = await request('/api/student/assignments/1', {
      headers: { Authorization: `Bearer ${alexStudentToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.submission, 'Must have submission');
    assert.ok(Array.isArray(res.body.versions), 'Must return versions array');
    assert.ok(res.body.versions.length >= 1, 'Must have at least version 1 in history');
    assert.strictEqual(res.body.versions[0].version_number, 1);
  });

  test('Case 20: Teacher can request work resubmission and student receives notification', async () => {
    // Dr. Patel (teacher for assignment 1) requests resubmission for Alex (submission 1)
    const res = await request('/api/teacher/submissions/1/request-resubmission', {
      method: 'POST',
      headers: { Authorization: `Bearer ${drPatelToken}` },
      body: { reason: 'Please elaborate on Section 3 mathematical proofs.' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify Alex received a notification
    const notifRes = await request('/api/notifications', {
      headers: { Authorization: `Bearer ${alexStudentToken}` }
    });
    assert.strictEqual(notifRes.status, 200);
    const hasResubmitNotif = notifRes.body.notifications.some(n => n.title.includes('Resubmission Requested'));
    assert.ok(hasResubmitNotif, 'Student must receive a resubmission requested notification');
  });

  test('Case 21: Real-time notification endpoint establishes text/event-stream with client authentication', async () => {
    await new Promise((resolve) => {
      const options = pipePath
        ? { socketPath: pipePath, path: `/api/notifications/stream?token=${alexStudentToken}`, method: 'GET' }
        : { ...new URL(`/api/notifications/stream?token=${alexStudentToken}`, baseUrl), method: 'GET' };

      const req = http.request(options, (res) => {
        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.headers['content-type'].includes('text/event-stream'), 'Content-Type must be text/event-stream');
        res.destroy();
        resolve();
      });
      req.on('error', () => {
        resolve();
      });
      req.end();
    });
  });

  test('Case 22: Enrolled student uploads assignment document -> appears automatically in assigned teacher dashboard and submissions roster', async () => {
    // Alex uploads Python assignment document to Assignment 4 (Python Programming - CS205)
    const fileData = buildMultipart(
      { remarks: 'Implemented data wrangling functions and unit tests.' },
      {
        fieldname: 'document',
        filename: 'Alex_Python_Assignment.pdf',
        mimetype: 'application/pdf',
        content: '%PDF-1.4 [ClassSpace Student Python Document Test Content]'
      }
    );

    const submitRes = await request('/api/student/assignments/4/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${alexStudentToken}`,
        ...fileData.headers
      },
      body: fileData.body
    });

    assert.strictEqual(submitRes.status, 201, 'Submission must succeed with 201 Created');
    assert.strictEqual(submitRes.body.success, true);
    assert.ok(submitRes.body.submissionId, 'Must return generated submissionId');
    assert.ok(submitRes.body.submittedAt, 'Must return server timestamp');
    pythonSubmissionId = submitRes.body.submissionId;

    // Prof. Vance (assigned to Python CS205) checks assignment submissions
    const vanceSubmissionsRes = await request('/api/teacher/assignments/4/submissions', {
      headers: { Authorization: `Bearer ${profVanceToken}` }
    });

    assert.strictEqual(vanceSubmissionsRes.status, 200);
    assert.strictEqual(vanceSubmissionsRes.body.success, true);

    const alexSub = vanceSubmissionsRes.body.submissions.find(s => s.student_name && s.student_name.includes('Alex'));
    assert.ok(alexSub, 'Alex submission must appear in Prof. Vance review table');
    assert.strictEqual(alexSub.file_name, 'Alex_Python_Assignment.pdf');
    assert.strictEqual(alexSub.status, 'submitted');

    // Also verify Prof. Vance centralized submissions overview includes it
    const subjectId = alexSub.subject_id || vanceSubmissionsRes.body.assignment.subject_id;
    const vanceOverviewRes = await request('/api/teacher/submissions?subjectId=' + subjectId, {
      headers: { Authorization: `Bearer ${profVanceToken}` }
    });
    assert.strictEqual(vanceOverviewRes.status, 200);
    const inOverview = vanceOverviewRes.body.submissions.some(s => s.file_name === 'Alex_Python_Assignment.pdf');
    assert.ok(inOverview, 'Uploaded document must appear in centralized teacher submissions overview');
  });

  test('Case 23: Teacher of another subject (Prof. Clark - DBMS) cannot access or grade the Python submission', async () => {
    // Prof. Clark (assigned only to DBMS) attempts to view Python assignment 4 submissions
    const clarkRes = await request('/api/teacher/assignments/4/submissions', {
      headers: { Authorization: `Bearer ${profClarkToken}` }
    });
    assert.strictEqual(clarkRes.status, 403, 'Unauthorized teacher must receive 403 Forbidden');

    // Prof. Clark attempts to view/download the document
    const clarkFileRes = await request(`/api/submissions/${pythonSubmissionId}/file`, {
      headers: { Authorization: `Bearer ${profClarkToken}` }
    });
    assert.strictEqual(clarkFileRes.status, 403, 'Unauthorized teacher cannot download submission file');
  });

  test('Case 24: Document file download with authentication and filename preservation', async () => {
    // Prof. Vance downloads Alex's Python document
    const vanceDownload = await request(`/api/submissions/${pythonSubmissionId}/file?download=true`, {
      headers: { Authorization: `Bearer ${profVanceToken}` }
    });
    assert.strictEqual(vanceDownload.status, 200);
    assert.ok(vanceDownload.headers['content-disposition'], 'Must include Content-Disposition header');
    assert.ok(vanceDownload.headers['content-disposition'].includes('Alex_Python_Assignment.pdf'), 'Must preserve original filename');

    // Alex (the owner) can also download their own file
    const alexDownload = await request(`/api/submissions/${pythonSubmissionId}/file?download=true`, {
      headers: { Authorization: `Bearer ${alexStudentToken}` }
    });
    assert.strictEqual(alexDownload.status, 200);

    // Noah (not enrolled in Python) cannot download Alex's file
    const noahDownload = await request(`/api/submissions/${pythonSubmissionId}/file`, {
      headers: { Authorization: `Bearer ${noahStudentToken}` }
    });
    assert.strictEqual(noahDownload.status, 403, 'Non-enrolled student must receive 403 Forbidden');
  });

  test('Case 25: Teacher reviews assignment submissions with complete roster and calculated statistics', async () => {
    // Assignment 4 (Python) has 4 enrolled students: Alex, Emma, Liam, Sophia
    const res = await request('/api/teacher/assignments/4/submissions', {
      headers: { Authorization: `Bearer ${profVanceToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.stats.totalEnrolled, 4, 'Must report 4 enrolled students');
    assert.strictEqual(res.body.stats.submittedCount, 1, 'Must report 1 submitted student');
    assert.strictEqual(res.body.stats.notSubmittedCount, 3, 'Must report 3 not-submitted students');

    // Verify complete roster contains both submitted and not-submitted students
    assert.strictEqual(res.body.submissions.length, 4, 'Must list all 4 eligible students');
    const notSubmittedStudents = res.body.submissions.filter(s => s.status === 'not_submitted');
    assert.strictEqual(notSubmittedStudents.length, 3, '3 students must be flagged as not_submitted');
  });

  after(async () => {
    if (server) {
      server.close();
      server = null;
    }
  });
});
