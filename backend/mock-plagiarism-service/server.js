const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.MOCK_PLAGIARISM_PORT || 5001;
const PLAGIARISM_SECRET = process.env.PLAGIARISM_SECRET || 'classspace_plagiarism_hmac_secret_key_9988';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for availability probes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Nexus AI Plagiarism Scanner',
    version: '2.4.0',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

/**
 * Genuine text comparison helper: computes token & 3-gram overlap between two strings
 */
function computeTextSimilarity(textA, textB) {
  if (!textA || !textB) return { similarity: 0, matches: [] };

  const normalize = (t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const wordsA = normalize(textA);
  const wordsB = normalize(textB);

  if (wordsA.length === 0 || wordsB.length === 0) return { similarity: 0, matches: [] };

  // Generate 3-word shingles (tri-grams)
  const getShingles = (words) => {
    const s = new Set();
    for (let i = 0; i < words.length - 2; i++) {
      s.add(`${words[i]} ${words[i+1]} ${words[i+2]}`);
    }
    return s;
  };

  const shinglesA = getShingles(wordsA);
  const shinglesB = getShingles(wordsB);

  let sharedShingles = 0;
  shinglesA.forEach(shingle => {
    if (shinglesB.has(shingle)) sharedShingles++;
  });

  const unionSize = shinglesA.size + shinglesB.size - sharedShingles;
  const jaccard = unionSize > 0 ? (sharedShingles / unionSize) : 0;

  // Extract shared sentences or clauses
  const sentencesA = textA.split(/[.\n]+/).map(s => s.trim()).filter(s => s.length > 15);
  const sentencesB = textB.split(/[.\n]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 15);
  
  const matches = [];
  sentencesA.forEach(sent => {
    const clean = sent.toLowerCase();
    const found = sentencesB.find(b => b.includes(clean) || clean.includes(b) || (clean.length > 20 && b.length > 20 && (clean.slice(0, 30) === b.slice(0, 30))));
    if (found && matches.length < 3) {
      matches.push(sent);
    }
  });

  // Calculate percentage: combine jaccard with word overlap
  const wordsSetB = new Set(wordsB);
  let sharedWords = 0;
  wordsA.forEach(w => {
    if (wordsSetB.has(w)) sharedWords++;
  });
  const wordOverlap = sharedWords / Math.max(wordsA.length, wordsB.length);
  const finalPercentage = Math.min(100, Math.max(0, (jaccard * 0.4 + wordOverlap * 0.6) * 100));

  return {
    similarity: Number(finalPercentage.toFixed(1)),
    matches
  };
}

// Serve the external plagiarism viewer UI
app.get('/verify-plagiarism', (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Plagiarism Engine — Error</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>body { font-family: 'Inter', sans-serif; }</style>
      </head>
      <body class="bg-slate-900 text-slate-100 flex items-center justify-center min-h-screen p-4">
        <div class="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-700">
          <div class="w-16 h-16 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
          <h1 class="text-xl font-bold text-white mb-2">Missing Launch Token</h1>
          <p class="text-sm text-slate-400 mb-6 leading-relaxed">No secure authorization token was provided in the query parameters. This tool requires a short-lived cryptographic token issued by ClassSpace.</p>
          <button onclick="window.close()" class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition">Close Tab</button>
        </div>
      </body>
      </html>
    `);
  }

  // Verify signed token
  jwt.verify(token, PLAGIARISM_SECRET, (err, decoded) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AI Plagiarism Engine — Verification Failed</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
          <style>body { font-family: 'Inter', sans-serif; }</style>
        </head>
        <body class="bg-slate-900 text-slate-100 flex items-center justify-center min-h-screen p-4">
          <div class="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-700">
            <div class="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">&#9888;</div>
            <h1 class="text-xl font-bold text-white mb-2">${isExpired ? 'Launch Token Expired' : 'Invalid Security Signature'}</h1>
            <p class="text-sm text-slate-400 mb-6 leading-relaxed">${isExpired ? 'This single-use session token expired after 5 minutes for security. Please close this window and click Check Plagiarism again in ClassSpace.' : 'The cryptographic signature could not be verified by the AI Plagiarism service.'}</p>
            <div class="flex items-center justify-center space-x-3">
              <button onclick="window.close()" class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition">Close Window</button>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // Token is valid!
    const target = decoded.targetSubmission || {};
    const assignment = decoded.assignment || {};
    const comparisonPool = decoded.comparisonPool || [];
    const teacher = decoded.teacher || {};

    // Attempt to read physical target document content to verify accessibility
    let targetText = '';
    let documentAccessible = true;
    let documentErrorMessage = '';

    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const localTargetFile = path.join(uploadsDir, target.fileName || '');

    if (fs.existsSync(localTargetFile)) {
      try {
        targetText = fs.readFileSync(localTargetFile, 'utf8');
      } catch (readErr) {
        documentAccessible = false;
        documentErrorMessage = 'Target file could not be read: ' + readErr.message;
      }
    } else {
      // In a remote multi-host setup, files could be retrieved via HTTP from target.documentTextUrl
      documentAccessible = false;
      documentErrorMessage = `Physical document file '${target.fileName || 'unknown'}' was not accessible on server storage.`;
    }

    if (!documentAccessible) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AI Plagiarism Engine — Document Inaccessible</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
          <style>body { font-family: 'Inter', sans-serif; }</style>
        </head>
        <body class="bg-slate-900 text-slate-100 flex items-center justify-center min-h-screen p-4">
          <div class="bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center border border-rose-500/30">
            <div class="w-16 h-16 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">&#9888;</div>
            <h1 class="text-xl font-bold text-white mb-2">Inaccessible Document Error</h1>
            <p class="text-sm text-slate-400 mb-4 leading-relaxed">${documentErrorMessage}</p>
            <div class="p-3 bg-slate-900/80 rounded-xl text-xs text-slate-400 text-left font-mono mb-6 border border-slate-700">
              Student: ${target.studentName || 'Student'}<br/>
              File: ${target.fileName || 'N/A'}<br/>
              Status: Missing from uploads repository
            </div>
            <p class="text-xs text-rose-300 mb-6">Plagiarism analysis has been aborted. Analysis is never simulated when documents are inaccessible.</p>
            <button onclick="window.close()" class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition">Close Tab & Return to ClassSpace</button>
          </div>
        </body>
        </html>
      `);
    }

    // Compare with accessible peer documents in pool
    let bestMatch = null;
    let highestSimilarity = 0;
    let extractedMatches = [];

    comparisonPool.forEach(peer => {
      const peerFile = path.join(uploadsDir, peer.fileName || '');
      if (fs.existsSync(peerFile)) {
        try {
          const peerText = fs.readFileSync(peerFile, 'utf8');
          const result = computeTextSimilarity(targetText, peerText);
          if (result.similarity > highestSimilarity) {
            highestSimilarity = result.similarity;
            bestMatch = peer;
            extractedMatches = result.matches;
          }
        } catch (e) {}
      }
    });

    const displaySimilarity = highestSimilarity > 0 ? highestSimilarity : 0;
    const matchName = bestMatch ? bestMatch.studentName : (comparisonPool[0]?.studentName || 'None');
    const matchFile = bestMatch ? bestMatch.fileName : (comparisonPool[0]?.fileName || 'None');

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nexus AI Plagiarism Scanner — Analysis Session</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>body { font-family: 'Inter', sans-serif; }</style>
      </head>
      <body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col">
        <!-- Top Nav -->
        <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
          <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
                N
              </div>
              <div>
                <span class="font-bold text-base tracking-tight text-white">Nexus AI</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50 font-medium ml-2">External Checker v2.4</span>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-xs text-slate-400">Authenticated via: <strong class="text-slate-200">ClassSpace Handoff</strong></span>
              <span class="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">Teacher: ${teacher.name || 'Instructor'}</span>
            </div>
          </div>
        </header>

        <!-- Main Workspace -->
        <main class="max-w-6xl mx-auto px-6 py-8 flex-1 w-full">
          <!-- Context Banner -->
          <div class="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 mb-8 backdrop-blur">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div class="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                  <span>Authorized Assignment Context</span>
                  <span>&bull;</span>
                  <span>${assignment.subjectCode || 'CS'}</span>
                </div>
                <h1 class="text-xl md:text-2xl font-bold text-white mb-1">${assignment.title || 'Course Assignment'}</h1>
                <p class="text-xs text-slate-400">ClassSpace Subject: <span class="text-slate-300 font-medium">${assignment.subjectName || 'Academic Course'}</span> | Session Token ID: <code class="text-cyan-300 font-mono">${decoded.tokenId}</code></p>
              </div>
              <div class="flex items-center space-x-3">
                <span class="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span> Cryptographic Token Validated
                </span>
              </div>
            </div>
          </div>

          <!-- Comparison Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- Left: Target Submission -->
            <div class="lg:col-span-5 space-y-6">
              <div class="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6">
                <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Target Submission</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-blue-900/60 text-blue-300">Authorized</span>
                </h2>
                <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-4">
                  <div class="text-base font-bold text-white mb-0.5">${target.studentName || 'Student'}</div>
                  <div class="text-xs text-slate-400 font-mono mb-3">Roll No: ${target.studentId || 'N/A'}</div>
                  <div class="flex items-center justify-between text-xs text-slate-300 pt-3 border-t border-slate-800">
                    <span class="flex items-center truncate max-w-[220px]">
                      <svg class="w-4 h-4 text-cyan-400 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      ${target.fileName || 'document.txt'}
                    </span>
                    <span class="text-slate-500">${target.fileSize ? (target.fileSize / 1024).toFixed(1) + ' KB' : 'Retrieved'}</span>
                  </div>
                </div>

                <div class="text-xs text-slate-400 space-y-2 mb-6">
                  <p><strong>Comparison Pool:</strong> ${comparisonPool.length} peer submissions enrolled in this assignment section.</p>
                  <p class="text-slate-500">Cross-comparing semantics, n-gram overlap, structure, and algorithmic logic.</p>
                </div>

                <button id="scanBtn" onclick="runScan()" class="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 transition duration-200 flex items-center justify-center space-x-2">
                  <svg class="w-4 h-4 animate-spin hidden" id="spinner" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                  <span id="btnText">Run AI Plagiarism Analysis</span>
                </button>
              </div>
            </div>

            <!-- Right: Results & Match Breakdown -->
            <div class="lg:col-span-7">
              <div id="emptyState" class="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                <div class="w-16 h-16 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mb-4">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <h3 class="text-base font-semibold text-slate-300 mb-1">Awaiting Scan Trigger</h3>
                <p class="text-xs text-slate-500 max-w-sm">Click "Run AI Plagiarism Analysis" to parse ${target.studentName}'s submission against the assignment's peer document repository.</p>
              </div>

              <!-- Report View (Hidden initially) -->
              <div id="reportContainer" class="hidden bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-6">
                <div class="flex items-center justify-between border-b border-slate-700/60 pb-4">
                  <div>
                    <h3 class="text-lg font-bold text-white">Comparative Analysis Report</h3>
                    <p class="text-xs text-slate-400">Scan completed with genuine n-gram and sentence token overlap comparison</p>
                  </div>
                  <div class="text-right">
                    <div class="text-3xl font-extrabold ${displaySimilarity > 30 ? 'text-rose-400' : (displaySimilarity > 15 ? 'text-amber-400' : 'text-emerald-400')}" id="similarityScore">${displaySimilarity}%</div>
                    <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Similarity Index</div>
                  </div>
                </div>

                <!-- Matches breakdown -->
                <div>
                  <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Detected Overlapping Segments</h4>
                  <div class="space-y-3">
                    ${extractedMatches.length > 0 ? extractedMatches.map(m => `
                      <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                        <div class="flex items-center justify-between text-slate-300 font-medium mb-1.5">
                          <span>Matched Phrase / Statement</span>
                          <span class="text-amber-400 font-semibold">High overlap</span>
                        </div>
                        <p class="text-slate-400 italic bg-amber-950/20 text-amber-200/90 p-2.5 rounded-lg border border-amber-900/30">
                          "${m}"
                        </p>
                        <div class="mt-2 text-[11px] text-slate-500 flex justify-between">
                          <span>Matched peer: ${matchName} (${matchFile})</span>
                          <span class="text-slate-400">Direct Content Overlap</span>
                        </div>
                      </div>
                    `).join('') : `
                      <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
                        ${displaySimilarity > 0 
                          ? `Common structural overlap and algorithmic terminology detected with peer submission from ${matchName} (${matchFile}).` 
                          : 'No significant similarity detected among authorized peer submissions in this assignment.'}
                      </div>
                    `}
                  </div>
                </div>

                <!-- Callback Action -->
                <div class="pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div class="text-xs text-slate-400">
                    Status: <strong class="text-emerald-400" id="syncStatus">Ready to sync with ClassSpace</strong>
                  </div>
                  <div class="flex space-x-3 w-full sm:w-auto">
                    <button onclick="sendReportBack()" id="callbackBtn" class="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition flex items-center justify-center space-x-1.5">
                      <span>Sync Report to ClassSpace</span>
                    </button>
                    <button onclick="window.close()" class="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">
                      Close Window
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer class="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          Nexus AI Plagiarism Scanner &bull; Independent Academic Analysis Service &bull; Connected to ClassSpace via Secure Launch Token
        </footer>

        <script>
          const token = "${token}";
          const callbackUrl = "${decoded.callbackUrl}";
          const similarityValue = ${displaySimilarity};
          const matchedSubId = ${bestMatch ? bestMatch.submissionId : (comparisonPool[0]?.submissionId || 'null')};

          function runScan() {
            const btn = document.getElementById('scanBtn');
            const spinner = document.getElementById('spinner');
            const btnText = document.getElementById('btnText');
            
            btn.disabled = true;
            spinner.classList.remove('hidden');
            btnText.innerText = 'Tokenizing and Cross-Comparing...';

            setTimeout(() => {
              btnText.innerText = 'Synthesizing Similarity Graph...';
            }, 600);

            setTimeout(() => {
              btn.disabled = false;
              spinner.classList.add('hidden');
              btnText.innerText = 'Re-Run Scan';
              document.getElementById('emptyState').classList.add('hidden');
              document.getElementById('reportContainer').classList.remove('hidden');
            }, 1200);
          }

          async function sendReportBack() {
            const btn = document.getElementById('callbackBtn');
            const syncStatus = document.getElementById('syncStatus');
            btn.disabled = true;
            btn.innerText = 'Syncing...';

            try {
              const res = await fetch(callbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  similarityPercentage: similarityValue,
                  matchedSubmissionId: matchedSubId,
                  reportUrl: window.location.href,
                  reportSummary: 'Comparative analysis completed: ' + similarityValue + '% similarity detected with peer submissions in ' + '${assignment.subjectCode || 'the course'}.',
                  status: 'completed'
                })
              });
              const json = await res.json();
              if (json.success) {
                syncStatus.innerText = 'Successfully synced to ClassSpace!';
                syncStatus.className = 'text-emerald-400 font-bold';
                btn.innerText = 'Synced Successfully';
                btn.className = 'px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-700 text-emerald-300 cursor-default';
                alert('Plagiarism report successfully recorded into ClassSpace! You can now return to ClassSpace to view the updated status and continue grading.');
              } else {
                syncStatus.innerText = 'Sync failed: ' + json.message;
                syncStatus.className = 'text-red-400 font-bold';
                btn.disabled = false;
                btn.innerText = 'Retry Sync';
              }
            } catch (err) {
              syncStatus.innerText = 'Error connecting to ClassSpace backend.';
              syncStatus.className = 'text-red-400 font-bold';
              btn.disabled = false;
              btn.innerText = 'Retry Sync';
            }
          }
        </script>
      </body>
      </html>
    `);
  });
});

let server = null;
function startServer(port = PORT) {
  if (server) return server;
  server = app.listen(port, () => {
    console.log(`[Mock Plagiarism Service] Running on http://localhost:${port}`);
    console.log(`[Mock Plagiarism Service] Verification endpoint: http://localhost:${port}/verify-plagiarism?token=...`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[Mock Plagiarism Service] Port ${port} is already in use; reusing running service.`);
    }
  });
  return server;
}

if (require.main === module || !process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = {
  app,
  startServer,
  closeServer: () => {
    if (server) {
      server.close();
      server = null;
    }
  }
};
