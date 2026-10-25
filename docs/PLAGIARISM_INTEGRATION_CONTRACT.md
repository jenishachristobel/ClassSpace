# AI Plagiarism Checker — External Integration Technical Contract

**Version:** 2.0.0  
**Issuer:** ClassSpace Centralized Classroom Management Platform  
**Target:** Separate External AI Plagiarism Checker Website / Engine  
**Protocol:** Cryptographically Signed Single-Use JWT Launch Token + Document API + REST Callback  

---

## 1. Overview & Architectural Boundary

The **ClassSpace** platform provides centralized course administration, student document submission, and grading. The **AI Plagiarism Checker** is an independent, separately hosted website developed by another engineering teammate.

Rather than leaking passwords, student tokens, or raw document payloads across public query parameters, ClassSpace initiates a **secure backend-mediated handoff** using a **cryptographically signed, short-lived launch token** (JWT).

```
+-----------------------------------------------------------------------------------------+
|                                    ClassSpace Platform                                  |
|                                                                                         |
|  1. Teacher selects submission -> clicks "Check Plagiarism" on Assignment Review table  |
|  2. Frontend verifies VITE_PLAGIARISM_APP_URL is configured                             |
|  3. Backend checks Teacher authorization, physical file existence, & service health    |
|  4. Backend signs 5-minute single-use JWT with shared PLAGIARISM_SECRET                 |
|  5. ClassSpace opens external website in a new tab: ${VITE_PLAGIARISM_APP_URL}?token=.. |
|  6. Original GCR submission page remains open and interactive in the existing tab       |
+--------------------------------------------+--------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                         Separate AI Plagiarism Checker Website                          |
|                                                                                         |
|  7. Validates JWT signature with shared PLAGIARISM_SECRET                               |
|  8. Retrieves target document text via GET /api/plagiarism/document-text/:tokenId/:id   |
|  9. Compares against eligible peer submissions in assignment comparison pool            |
| 10. Computes true similarity index and highlights matching segments                     |
| 11. Posts finalized similarity report back to ClassSpace: POST ${callbackUrl}           |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Environment Configuration

### Frontend Configuration (`frontend/.env`)
```env
# URL where the separately hosted AI Plagiarism Checker website is running
VITE_PLAGIARISM_APP_URL=http://localhost:5001/verify-plagiarism
```

### Backend Configuration (`backend/.env`)
```env
# Shared cryptographic secret key for signing and verifying launch tokens
PLAGIARISM_SECRET=classspace_plagiarism_hmac_secret_key_9988

# Destination URL for backend health checks and fallback resolution
PLAGIARISM_CHECKER_URL=http://localhost:5001/verify-plagiarism
```

---

## 3. Launch Token Specifications

### 3.1 Cryptographic Parameters
- **Shared Secret:** Configured via `PLAGIARISM_SECRET` environment variable in both applications.
- **Algorithm:** `HS256` (HMAC SHA-256).
- **Time to Live (TTL):** 300 seconds (5 minutes). Replay attacks or expired tokens are rejected.

### 3.2 Launch URL Format
```http
GET ${VITE_PLAGIARISM_APP_URL}?token=${SIGNED_JWT_TOKEN}
```
*Example:*
```
http://localhost:5001/verify-plagiarism?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.3 JWT Claims Payload (Decoded Object)
```json
{
  "tokenId": "tok_plag_1729701000000_abc1234",
  "iss": "ClassSpace-Centralized-Portal",
  "issuedAt": 1729701000,
  "iat": 1729701000,
  "exp": 1729701300,
  "assignment": {
    "id": 1,
    "title": "Assignment 1: A* Search Algorithm & Heuristic Analysis",
    "subjectCode": "CS401",
    "subjectName": "Artificial Intelligence"
  },
  "teacher": {
    "id": 2,
    "name": "Dr. Maya Patel",
    "email": "dr.patel@classspace.edu"
  },
  "targetSubmission": {
    "submissionId": 1,
    "studentId": "STU-2024-001",
    "studentName": "Alex Rivera",
    "fileName": "alex_rivera_ai_assignment1.txt",
    "fileSize": 1024,
    "mimeType": "text/plain",
    "fileUrl": "http://localhost:5000/uploads/alex_rivera_ai_assignment1.txt",
    "documentTextUrl": "http://localhost:5000/api/plagiarism/document-text/tok_plag_1729701000000_abc1234/1"
  },
  "comparisonPool": [
    {
      "submissionId": 2,
      "studentCode": "STU-2024-002",
      "studentName": "Emma Watson",
      "fileName": "emma_watson_ai_assignment1.txt",
      "fileSize": 980,
      "fileUrl": "http://localhost:5000/uploads/emma_watson_ai_assignment1.txt",
      "documentTextUrl": "http://localhost:5000/api/plagiarism/document-text/tok_plag_1729701000000_abc1234/2"
    }
  ],
  "callbackUrl": "http://localhost:5000/api/plagiarism/callback"
}
```

---

## 4. Document Retrieval API

The external application retrieves the raw authorized document text using the `documentTextUrl` or the following endpoint:

```http
GET /api/plagiarism/document-text/:tokenId/:submissionId?token=${SIGNED_TOKEN}
```

### Response Schema (200 OK)
```json
{
  "success": true,
  "submissionId": 1,
  "fileName": "alex_rivera_ai_assignment1.txt",
  "mimeType": "text/plain",
  "text": "# Artificial Intelligence Assignment 1: A* Search Algorithm Report..."
}
```

---

## 5. Report Synchronization Callback

Once the external engine finishes comparing the target student's submission against the assignment's comparison pool, it sends a `POST` request to `callbackUrl`.

### Callback Request
- **Endpoint:** `POST /api/plagiarism/callback`
- **Headers:** `Content-Type: application/json`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "similarityPercentage": 22.4,
  "matchedSubmissionId": 2,
  "reportUrl": "http://localhost:5001/verify-plagiarism?token=...",
  "reportSummary": "Comparative analysis completed: 22.4% similarity detected with peer submissions in CS401.",
  "status": "completed"
}
```

---

## 6. Error Handling & Edge Cases

| Error Condition | Behavior | Error Code / Status |
|---|---|---|
| **Missing Config** | If `VITE_PLAGIARISM_APP_URL` is empty, button is disabled and warning banner is displayed. | `CONFIG_MISSING` (503) |
| **Service Offline** | ClassSpace probes destination URL. If offline, launch is blocked and clear error banner is displayed. **No analysis is simulated.** | `EXTERNAL_SERVICE_UNAVAILABLE` (503) |
| **Inaccessible Document** | Physical file existence on disk is validated with `fs.existsSync`. If missing, returns error. | `INACCESSIBLE_DOCUMENT` (404) |
| **Expired Token** | Tokens expire after 5 minutes (300 seconds). External site and API return 401 Unauthorized. | `EXPIRED_TOKEN` (401) |
| **Unauthorized Teacher** | Teachers can only check plagiarism for courses assigned to them. Students cannot generate tokens. | `FORBIDDEN` (403) |
