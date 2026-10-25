import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileSearch, ArrowRight, ExternalLink, AlertCircle, CheckCircle2, Clock, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import api from '../../api/client';
import { useNotification } from '../../context/NotificationContext';

export default function PlagiarismCheckerCard({
  assignment,
  selectedSubmission,
  onPlagiarismInitiated,
  existingReport
}) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [latestReport, setLatestReport] = useState(existingReport || null);

  // Read destination URL from Vite environment variable
  const configuredAppUrl = (import.meta.env.VITE_PLAGIARISM_APP_URL || '').trim();
  const isConfigured = Boolean(configuredAppUrl);

  // Synchronize when existingReport or selectedSubmission changes
  useEffect(() => {
    setLatestReport(existingReport || null);
    setErrorMsg(null);
    setActiveSession(null);
  }, [selectedSubmission?.id, existingReport?.report_url, existingReport?.similarity]);

  // Handle checking plagiarism & launching external application
  const handleLaunchPlagiarism = async () => {
    if (!selectedSubmission) {
      showToast('Please select a student submission from the table below first.', 'error');
      return;
    }

    if (!isConfigured) {
      const msg = 'External Plagiarism Checker URL is not configured. Please define VITE_PLAGIARISM_APP_URL in your frontend .env file.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Backend validates teacher authorization, file physical existence, and external service availability
      const res = await api.post('/plagiarism/launch-token', {
        assignmentId: assignment.id,
        submissionId: selectedSubmission.id,
        destinationUrl: configuredAppUrl
      });

      if (res.data.success) {
        setActiveSession({
          tokenId: res.data.tokenId,
          studentName: selectedSubmission.student_name,
          launchedAt: new Date()
        });

        showToast(
          `Launch token authorized for ${selectedSubmission.student_name}. Opening external plagiarism scanner in a new tab...`,
          'success'
        );

        // Open the external AI Plagiarism Checker website in a separate browser tab
        // Keeping the original ClassSpace GCR submission page intact and available
        const newTab = window.open(res.data.launchUrl, '_blank', 'noopener,noreferrer');
        if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
          showToast('Popup blocker may have blocked the new tab. Please allow popups or use the link below.', 'warning');
        }

        if (onPlagiarismInitiated) {
          onPlagiarismInitiated(res.data.tokenId);
        }
      } else {
        // Backend returned failure - do NOT simulate analysis
        const msg = res.data.message || 'Failed to initiate plagiarism scan.';
        setErrorMsg(msg);
        showToast(msg, 'error');
      }
    } catch (err) {
      // Handle network errors, service offline, or inaccessible documents gracefully
      const status = err.response?.status;
      const data = err.response?.data;
      let msg = data?.message;

      if (!msg) {
        if (status === 503) {
          msg = `External AI Plagiarism Checker service at '${configuredAppUrl}' is unreachable or offline. Verification cannot be performed.`;
        } else if (status === 404) {
          msg = 'The document for this student submission is missing or inaccessible on server storage.';
        } else if (status === 403) {
          msg = 'Access Denied: You are not authorized to check plagiarism for this assignment.';
        } else {
          msg = `External service connection failed (${err.message || 'Unknown network error'}). Analysis cannot be simulated.`;
        }
      }

      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manually refresh report status after external scan is synced
  const handleRefreshReport = async () => {
    if (!selectedSubmission) return;
    setRefreshing(true);
    try {
      const res = await api.get(`/plagiarism/reports/${selectedSubmission.id}`);
      if (res.data.success && res.data.check) {
        const check = res.data.check;
        setLatestReport({
          report_url: check.report_url,
          similarity: check.similarity_percentage,
          status: check.status,
          matched_student_name: check.matched_student_name
        });
        showToast('Plagiarism status updated from database.', 'success');
        if (onPlagiarismInitiated) onPlagiarismInitiated();
      } else {
        showToast('No updated plagiarism report found yet.', 'info');
      }
    } catch (err) {
      showToast('Failed to refresh report status.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden mb-8">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
              <FileSearch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg md:text-xl font-bold tracking-tight text-white">
                  AI Plagiarism Checker
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  External Service
                </span>
                {!isConfigured && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Not Configured
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Compare a selected student's assignment against other submissions in the same assignment.
              </p>
            </div>
          </div>

          {/* Submission Selection Status Indicator */}
          <div className="flex items-center space-x-2">
            {selectedSubmission ? (
              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Selected: <strong>{selectedSubmission.student_name}</strong>
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Select a submission below to scan
              </span>
            )}
          </div>
        </div>

        {/* Informational Workflow Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 text-xs text-slate-300">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="font-semibold text-blue-300 block mb-1">1. Select Student Work</span>
            Click "Select for Plagiarism" on any row in the submission review table.
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="font-semibold text-indigo-300 block mb-1">2. Secure Signed Launch</span>
            ClassSpace generates a 5-minute single-use token restricting comparisons only to authorized course submissions.
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="font-semibold text-emerald-300 block mb-1">3. Automated Sync Back</span>
            The external analysis tool renders the comparison report and posts results back into your gradebook.
          </div>
        </div>

        {/* Missing Configuration Banner */}
        {!isConfigured && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong className="block text-amber-300 font-semibold mb-0.5">Configuration Notice: External Service URL Missing</strong>
              <span>
                <code>VITE_PLAGIARISM_APP_URL</code> is not defined in the frontend environment. Plagiarism redirect is currently disabled until this URL is configured.
              </span>
            </div>
          </div>
        )}

        {/* Error message banner (Service failure, missing document, unauthorized) */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <strong className="block text-rose-300 font-semibold mb-0.5">Plagiarism Handoff Notice</strong>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Active Handoff Banner */}
        {activeSession && !errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                Session active for <strong>{activeSession.studentName}</strong> in a new browser tab. Your submission review page remains open here.
              </span>
            </div>
            <button
              onClick={handleRefreshReport}
              disabled={refreshing}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/50 hover:bg-indigo-600 text-[11px] font-semibold text-white transition flex items-center space-x-1 shrink-0 ml-3"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>
        )}

        {/* Action Controls & Report Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">
              Destination: <code className="text-slate-300 font-mono text-[11px]">{isConfigured ? configuredAppUrl : 'Unconfigured'}</code>
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {/* View Previous / Current Report button if available */}
            {latestReport && latestReport.similarity !== null && latestReport.similarity !== undefined && (
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                  latestReport.similarity > 30
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : latestReport.similarity > 15
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {latestReport.similarity}% Match
                </span>
                {latestReport.report_url && (
                  <a
                    href={latestReport.report_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition flex items-center space-x-1.5"
                  >
                    <span>View Report</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            <button
              onClick={handleLaunchPlagiarism}
              disabled={loading || !selectedSubmission || !isConfigured}
              title={
                !isConfigured
                  ? 'VITE_PLAGIARISM_APP_URL is not configured'
                  : !selectedSubmission
                  ? 'Select a submission from the table first'
                  : 'Launch AI Plagiarism Checker in new tab'
              }
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg ${
                selectedSubmission && isConfigured
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authorizing Handoff...</span>
                </>
              ) : (
                <>
                  <span>Check Plagiarism</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
