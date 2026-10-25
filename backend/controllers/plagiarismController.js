const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const db = require('../config/database');
const env = require('../config/env');
const { logAuditAction } = require('../middleware/auditMiddleware');

/**
 * Helper to ping external service URL before launching to ensure it is running
 */
function probeServiceHealth(serviceUrl, timeoutMs = 1500) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(serviceUrl);
      const httpModule = parsed.protocol === 'https:' ? https : http;
      
      const req = httpModule.request(
        parsed,
        {
          method: 'GET',
          timeout: timeoutMs,
          headers: { 'User-Agent': 'ClassSpace-Handoff-Probe/1.0' }
        },
        (res) => {
          // Any response status code means the server is actively listening
          resolve({ ok: true, statusCode: res.statusCode });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'TIMEOUT', message: 'Connection timed out after ' + timeoutMs + 'ms' });
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: err.code || 'CONNECTION_ERROR', message: err.message });
      });

      req.end();
    } catch (err) {
      resolve({ ok: false, error: 'INVALID_URL', message: err.message });
    }
  });
}

/**
 * Generate a short-lived signed launch token for the external plagiarism checker
 */
async function generateLaunchToken(req, res) {
  try {
    const teacherId = req.user.teacherId;
    const { assignmentId, submissionId, destinationUrl, skipHealthCheck } = req.body;

    if (!assignmentId || !submissionId) {
      return res.status(400).json({ success: false, message: 'Assignment ID and Submission ID are required.' });
    }

    // 1. Resolve and validate target external service URL
    const targetUrl = (destinationUrl || env.PLAGIARISM_CHECKER_URL || '').trim();
    if (!targetUrl) {
      return res.status(503).json({
        success: false,
        configured: false,
        error: 'CONFIG_MISSING',
        message: 'AI Plagiarism Checker external service URL is not configured. Please set VITE_PLAGIARISM_APP_URL or PLAGIARISM_CHECKER_URL.'
      });
    }

    // 2. Strict Backend Authorization Check:
    // Verify that this teacher is authorized to access this assignment
    const assignment = db.get(
      `SELECT a.id, a.title, a.max_marks, s.id as subject_id, s.name as subject_name, s.code as subject_code
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       JOIN teacher_subject_assignments tsa ON tsa.subject_id = a.subject_id
       WHERE a.id = ? AND tsa.teacher_id = ?`,
      [assignmentId, teacherId]
    );

    if (!assignment && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access Denied: You are not authorized to check plagiarism for this assignment.'
      });
    }

    // 3. Verify target submission belongs to this assignment and has an uploaded file
    const targetSubmission = db.get(
      `SELECT sub.id, sub.submitted_at, sub.version,
              st.id as student_id, st.student_id as student_code,
              u.first_name || ' ' || u.last_name as student_name,
              sf.id as file_id, sf.file_name, sf.file_size, sf.mime_type, sf.file_path
       FROM submissions sub
       JOIN students st ON sub.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN submission_files sf ON sf.submission_id = sub.id
       WHERE sub.id = ? AND sub.assignment_id = ?`,
      [submissionId, assignmentId]
    );

    if (!targetSubmission) {
      return res.status(404).json({ success: false, message: 'Target submission not found for this assignment.' });
    }

    if (!targetSubmission.file_name || !targetSubmission.file_path) {
      return res.status(400).json({
        success: false,
        error: 'NO_DOCUMENT',
        message: 'This submission does not contain any uploaded document to scan.'
      });
    }

    // 4. Inaccessible Document Check: Verify target file physically exists and is readable on disk
    const targetFilePath = path.resolve(__dirname, '..', targetSubmission.file_path);
    if (!fs.existsSync(targetFilePath)) {
      return res.status(404).json({
        success: false,
        error: 'INACCESSIBLE_DOCUMENT',
        message: `The selected submission document (${targetSubmission.file_name}) is missing or inaccessible on the server storage.`
      });
    }

    // 5. Retrieve eligible comparison submissions and verify their physical file accessibility
    const rawPeerSubmissions = db.query(
      `SELECT sub.id as submission_id, sub.submitted_at,
              st.student_id as student_code,
              u.first_name || ' ' || u.last_name as student_name,
              sf.file_name, sf.file_size, sf.mime_type, sf.file_path
       FROM submissions sub
       JOIN students st ON sub.student_id = st.id
       JOIN users u ON st.user_id = u.id
       JOIN submission_files sf ON sf.submission_id = sub.id
       WHERE sub.assignment_id = ? AND sub.id != ?`,
      [assignmentId, submissionId]
    );

    // Keep only peer submissions whose files actually exist on disk
    const accessiblePeerSubmissions = rawPeerSubmissions.filter(s => {
      if (!s.file_path) return false;
      const p = path.resolve(__dirname, '..', s.file_path);
      return fs.existsSync(p);
    });

    // 6. External Service Health Probe: Do not simulate success when external service is offline
    if (!skipHealthCheck) {
      const probeResult = await probeServiceHealth(targetUrl);
      if (!probeResult.ok) {
        return res.status(503).json({
          success: false,
          error: 'EXTERNAL_SERVICE_UNAVAILABLE',
          targetUrl,
          message: `The external AI Plagiarism Checker service at '${targetUrl}' is unreachable or offline (${probeResult.error || 'Connection Failed'}). Plagiarism checks cannot be simulated while the external service is unavailable.`
        });
      }
    }

    const tokenId = `tok_plag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Build the payload for the external service contract
    const tokenPayload = {
      tokenId,
      iss: 'ClassSpace-Centralized-Portal',
      assignment: {
        id: assignment.id,
        title: assignment.title,
        subjectCode: assignment.subject_code,
        subjectName: assignment.subject_name
      },
      teacher: {
        id: teacherId,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email
      },
      targetSubmission: {
        submissionId: targetSubmission.id,
        studentId: targetSubmission.student_code,
        studentName: targetSubmission.student_name,
        fileName: targetSubmission.file_name,
        fileSize: targetSubmission.file_size,
        mimeType: targetSubmission.mime_type,
        fileUrl: `http://localhost:${env.PORT}/${targetSubmission.file_path}`,
        documentTextUrl: `http://localhost:${env.PORT}/api/plagiarism/document-text/${tokenId}/${targetSubmission.id}`
      },
      comparisonPool: accessiblePeerSubmissions.map(s => ({
        submissionId: s.submission_id,
        studentCode: s.student_code,
        studentName: s.student_name,
        fileName: s.file_name,
        fileSize: s.file_size,
        fileUrl: `http://localhost:${env.PORT}/${s.file_path}`,
        documentTextUrl: `http://localhost:${env.PORT}/api/plagiarism/document-text/${tokenId}/${s.submission_id}`
      })),
      callbackUrl: `http://localhost:${env.PORT}/api/plagiarism/callback`,
      issuedAt: Math.floor(Date.now() / 1000)
    };

    // Sign token with PLAGIARISM_SECRET with 5-minute expiry (300 seconds)
    const signedToken = jwt.sign(tokenPayload, env.PLAGIARISM_SECRET, { expiresIn: '5m' });

    // Record check in database as initiated
    db.run(
      `INSERT INTO plagiarism_checks (submission_id, assignment_id, initiated_by, token_id, status)
       VALUES (?, ?, ?, ?, 'initiated')`,
      [submissionId, assignmentId, teacherId, tokenId]
    );

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'teacher',
      action: 'PLAGIARISM_SCAN_INITIATED',
      entityType: 'PlagiarismCheck',
      entityId: tokenId,
      details: { submissionId, assignmentId, studentCode: targetSubmission.student_code, targetUrl },
      req
    });

    const separator = targetUrl.includes('?') ? '&' : '?';
    const launchUrl = `${targetUrl}${separator}token=${signedToken}`;

    return res.json({
      success: true,
      configured: true,
      tokenId,
      token: signedToken,
      launchUrl,
      targetStudent: targetSubmission.student_name,
      comparisonCount: accessiblePeerSubmissions.length,
      expiresInSeconds: 300,
      message: 'Launch token generated. Redirecting to external AI Plagiarism Checker...'
    });
  } catch (err) {
    console.error('[Plagiarism] generateLaunchToken error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate plagiarism launch token.' });
  }
}

/**
 * Endpoint for the external plagiarism service to validate token contents
 */
async function validateToken(req, res) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token query parameter required.' });
    }

    jwt.verify(token, env.PLAGIARISM_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'EXPIRED_TOKEN',
            message: 'Launch token has expired (5-minute TTL exceeded). Please launch from ClassSpace again.'
          });
        }
        return res.status(401).json({
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Cryptographic signature verification failed.'
        });
      }

      const check = db.get('SELECT id, status FROM plagiarism_checks WHERE token_id = ?', [decoded.tokenId]);
      if (!check) {
        return res.status(404).json({ success: false, error: 'UNKNOWN_TOKEN', message: 'Token session not registered in ClassSpace.' });
      }

      return res.json({
        success: true,
        valid: true,
        data: decoded
      });
    });
  } catch (err) {
    console.error('[Plagiarism] validateToken error:', err);
    return res.status(500).json({ success: false, message: 'Token validation error.' });
  }
}

/**
 * Secure document retrieval endpoint for the external plagiarism service
 * Retrieves the raw text of the authorized submission document
 */
async function getDocumentText(req, res) {
  try {
    const { tokenId, submissionId } = req.params;
    const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authorization token required to retrieve document text.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.PLAGIARISM_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'EXPIRED_TOKEN', message: 'Launch token has expired.' });
      }
      return res.status(401).json({ success: false, error: 'INVALID_TOKEN', message: 'Invalid launch token.' });
    }

    if (decoded.tokenId !== tokenId) {
      return res.status(403).json({ success: false, message: 'Token ID mismatch.' });
    }

    // Verify submissionId is either targetSubmission or in comparisonPool
    const targetId = String(decoded.targetSubmission.submissionId);
    const inPool = decoded.comparisonPool.some(s => String(s.submissionId) === String(submissionId));

    if (targetId !== String(submissionId) && !inPool) {
      return res.status(403).json({ success: false, message: 'Requested submission is not authorized in this plagiarism check session.' });
    }

    // Retrieve file record from DB
    const fileRecord = db.get(
      `SELECT sf.file_name, sf.file_path, sf.mime_type
       FROM submission_files sf
       WHERE sf.submission_id = ?`,
      [submissionId]
    );

    if (!fileRecord || !fileRecord.file_path) {
      return res.status(404).json({ success: false, error: 'INACCESSIBLE_DOCUMENT', message: 'Document record not found.' });
    }

    const diskPath = path.resolve(__dirname, '..', fileRecord.file_path);
    if (!fs.existsSync(diskPath)) {
      return res.status(404).json({ success: false, error: 'INACCESSIBLE_DOCUMENT', message: 'File is inaccessible on storage.' });
    }

    // Read file contents as UTF-8 string
    const content = fs.readFileSync(diskPath, 'utf8');

    return res.json({
      success: true,
      submissionId,
      fileName: fileRecord.file_name,
      mimeType: fileRecord.mime_type,
      text: content
    });
  } catch (err) {
    console.error('[Plagiarism] getDocumentText error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve document text.' });
  }
}

/**
 * Check if the external plagiarism service is currently reachable
 */
async function checkServiceStatus(req, res) {
  try {
    const targetUrl = (req.query.url || env.PLAGIARISM_CHECKER_URL || '').trim();
    if (!targetUrl) {
      return res.json({
        configured: false,
        online: false,
        message: 'External plagiarism service URL is not configured.'
      });
    }

    const probe = await probeServiceHealth(targetUrl, 2000);
    return res.json({
      configured: true,
      online: probe.ok,
      targetUrl,
      error: probe.error || null,
      message: probe.ok ? 'External service is active and responsive.' : `Service is unreachable: ${probe.message || probe.error}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to verify external service status.' });
  }
}

/**
 * Callback from the external plagiarism checker to record finalized analysis report
 */
async function recordReportCallback(req, res) {
  try {
    const { token, similarityPercentage, matchedSubmissionId, reportUrl, reportSummary, status = 'completed' } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Launch token required in callback payload.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.PLAGIARISM_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired launch token signature.' });
    }

    const check = db.get('SELECT id, submission_id, assignment_id FROM plagiarism_checks WHERE token_id = ?', [decoded.tokenId]);
    if (!check) {
      return res.status(404).json({ success: false, message: 'Matching plagiarism check session not found.' });
    }

    db.run(
      `UPDATE plagiarism_checks
       SET status = ?,
           similarity_percentage = ?,
           matched_submission_id = ?,
           report_url = ?,
           report_summary = ?,
           completed_at = CURRENT_TIMESTAMP
       WHERE token_id = ?`,
      [
        status,
        similarityPercentage !== undefined ? Number(similarityPercentage) : null,
        matchedSubmissionId || null,
        reportUrl || null,
        reportSummary || 'Comparative analysis completed by external AI plagiarism checker.',
        decoded.tokenId
      ]
    );

    logAuditAction({
      userId: null,
      userEmail: 'external-plagiarism-service',
      role: 'integration',
      action: 'PLAGIARISM_REPORT_RECEIVED',
      entityType: 'PlagiarismCheck',
      entityId: decoded.tokenId,
      details: { similarityPercentage, status, submissionId: check.submission_id },
      req
    });

    return res.json({
      success: true,
      message: 'Plagiarism report recorded successfully in ClassSpace.'
    });
  } catch (err) {
    console.error('[Plagiarism] recordReportCallback error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record report callback.' });
  }
}

/**
 * Retrieve plagiarism check status and report for a submission
 */
async function getReportForSubmission(req, res) {
  try {
    const { submissionId } = req.params;

    const check = db.get(
      `SELECT pc.id, pc.submission_id, pc.assignment_id, pc.token_id, pc.status,
              pc.similarity_percentage, pc.report_url, pc.report_summary, pc.created_at, pc.completed_at,
              u.first_name || ' ' || u.last_name as matched_student_name,
              st.student_id as matched_student_code
       FROM plagiarism_checks pc
       LEFT JOIN submissions sub ON pc.matched_submission_id = sub.id
       LEFT JOIN students st ON sub.student_id = st.id
       LEFT JOIN users u ON st.user_id = u.id
       WHERE pc.submission_id = ?
       ORDER BY pc.created_at DESC
       LIMIT 1`,
      [submissionId]
    );

    return res.json({ success: true, check: check || null });
  } catch (err) {
    console.error('[Plagiarism] getReportForSubmission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve plagiarism report.' });
  }
}

module.exports = {
  generateLaunchToken,
  validateToken,
  getDocumentText,
  checkServiceStatus,
  recordReportCallback,
  getReportForSubmission
};
