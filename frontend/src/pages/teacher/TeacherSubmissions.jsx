import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ClipboardList,
  FileText,
  FileCheck,
  Download,
  Eye,
  Award,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Users,
  Search,
  Filter,
  Check
} from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import PlagiarismCheckerCard from '../../components/plagiarism/PlagiarismCheckerCard';
import { useNotification } from '../../context/NotificationContext';

export default function TeacherSubmissions() {
  const { assignmentId } = useParams();
  const { showToast, lastRealtimeEvent } = useNotification();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'submitted' | 'not_submitted' | 'late' | 'awaiting_grading' | 'graded'
  const [searchTerm, setSearchTerm] = useState('');

  // Selected student for Plagiarism Checker Card
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Grade Modal
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [targetForGrading, setTargetForGrading] = useState(null);
  const [gradeForm, setGradeForm] = useState({
    marksObtained: '',
    feedback: '',
    publishNow: true
  });

  // Resubmission Modal
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [targetForResubmit, setTargetForResubmit] = useState(null);
  const [resubmitReason, setResubmitReason] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  // Version History Modal
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [targetForVersions, setTargetForVersions] = useState(null);

  // View Document Modal (preview)
  const [showViewDocModal, setShowViewDocModal] = useState(false);
  const [docToView, setDocToView] = useState(null);
  const [docContent, setDocContent] = useState('');
  const [docPreviewUrl, setDocPreviewUrl] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/teacher/assignments/${assignmentId}/submissions`);
      if (res.data.success) {
        setData(res.data);
        const subs = res.data.submissions || [];
        // Pre-select first submitted student if none selected
        const firstSubmitted = subs.find((s) => s.id) || subs[0];
        if (firstSubmitted && !selectedSubmission) {
          setSelectedSubmission(firstSubmitted);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Access Denied: You are not authorized to review this assignment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  // Real-time automatic data refresh on SSE events
  useEffect(() => {
    if (lastRealtimeEvent && (lastRealtimeEvent.type === 'SUBMISSION_RECEIVED' || lastRealtimeEvent.type === 'ASSIGNMENT_PUBLISHED' || lastRealtimeEvent.type === 'GRADE_PUBLISHED')) {
      fetchSubmissions();
    }
  }, [lastRealtimeEvent]);

  const handleOpenResubmit = (sub) => {
    setTargetForResubmit(sub);
    setResubmitReason('');
    setShowResubmitModal(true);
  };

  const handleSubmitResubmitRequest = async (e) => {
    e.preventDefault();
    if (!targetForResubmit) return;

    setResubmitting(true);
    try {
      const res = await api.post(`/teacher/submissions/${targetForResubmit.id}/request-resubmission`, {
        reason: resubmitReason
      });

      if (res.data.success) {
        showToast(res.data.message || 'Work returned for resubmission.', 'success');
        setShowResubmitModal(false);
        fetchSubmissions();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to request resubmission.', 'error');
    } finally {
      setResubmitting(false);
    }
  };

  const handleOpenGrade = (sub) => {
    setTargetForGrading(sub);
    setGradeForm({
      marksObtained: sub.marks_obtained !== null && sub.marks_obtained !== undefined ? sub.marks_obtained : '',
      feedback: sub.feedback || '',
      publishNow: true
    });
    setShowGradeModal(true);
  };

  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    if (!targetForGrading) return;

    try {
      const res = await api.post(`/teacher/submissions/${targetForGrading.id}/grade`, {
        marksObtained: Number(gradeForm.marksObtained),
        feedback: gradeForm.feedback,
        publishNow: gradeForm.publishNow
      });

      if (res.data.success) {
        showToast(res.data.message || 'Grade saved.', 'success');
        setShowGradeModal(false);
        fetchSubmissions();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record grade.', 'error');
    }
  };

  const token = localStorage.getItem('token');

  const handleViewDocument = async (sub) => {
    setDocToView(sub);
    setShowViewDocModal(true);
    setDocLoading(true);
    setDocContent('');
    const previewUrl = `/api/submissions/${sub.id}/file?token=${encodeURIComponent(token)}`;
    setDocPreviewUrl(previewUrl);

    const ext = (sub.file_name || '').toLowerCase();
    if (ext.endsWith('.txt') || ext.endsWith('.py') || ext.endsWith('.java') || ext.endsWith('.sql')) {
      try {
        const res = await api.get(`/submissions/${sub.id}/file`, { responseType: 'text' });
        setDocContent(res.data);
      } catch (err) {
        setDocContent('Unable to preview document text inline.');
      }
    }
    setDocLoading(false);
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading student submissions...</div>;
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-rose-200 max-w-lg mx-auto mt-10">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Faculty Authorization Error</h2>
        <p className="text-xs text-slate-600 mt-2 mb-6">{error}</p>
        <Link
          to="/teacher/assignments"
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Return to Assignments</span>
        </Link>
      </div>
    );
  }

  const assignment = data?.assignment || {};
  const stats = data?.stats || {};
  const allSubmissions = data?.submissions || [];

  // Filter roster
  const filteredSubmissions = allSubmissions.filter((s) => {
    // Status filter
    if (filterStatus === 'submitted' && !s.id) return false;
    if (filterStatus === 'not_submitted' && s.id) return false;
    if (filterStatus === 'late' && s.status !== 'late') return false;
    if (filterStatus === 'awaiting_grading' && (!s.id || (s.grade_id && s.is_published === 1))) return false;
    if (filterStatus === 'graded' && s.is_published !== 1) return false;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = s.student_name.toLowerCase().includes(term);
      const matchCode = (s.student_code || '').toLowerCase().includes(term);
      const matchEmail = (s.student_email || '').toLowerCase().includes(term);
      if (!matchName && !matchCode && !matchEmail) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/teacher/subjects/${assignment.subject_id}`}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to {assignment.subject_name || 'Subject'}</span>
        </Link>
      </div>

      {/* Assignment Header Info */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>{assignment.subject_code}</span>
            <span>&bull;</span>
            <span>Due: {new Date(assignment.due_date).toLocaleString()}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {assignment.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submissions Review Table &bull; Maximum Points: <strong>{assignment.max_marks} pts</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="indigo" size="md">
            {stats.submittedCount || 0} / {stats.totalEnrolled || 0} Submissions Received
          </Badge>
        </div>
      </div>

      {/* Assignment-Level Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">Total Enrolled</span>
          <div className="text-2xl font-black text-slate-900">{stats.totalEnrolled || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-bold text-blue-600 block mb-1">Submissions</span>
          <div className="text-2xl font-black text-blue-700">{stats.submittedCount || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-bold text-amber-600 block mb-1">Not Submitted</span>
          <div className="text-2xl font-black text-amber-700">{stats.notSubmittedCount || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-bold text-rose-600 block mb-1">Late Submissions</span>
          <div className="text-2xl font-black text-rose-700">{stats.lateCount || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-bold text-indigo-600 block mb-1">Awaiting Grading</span>
          <div className="text-2xl font-black text-indigo-700">{stats.awaitingGradingCount || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-bold text-emerald-600 block mb-1">Graded</span>
          <div className="text-2xl font-black text-emerald-700">{stats.gradedCount || 0}</div>
        </div>
      </div>

      {/* SECTION 7 REQUIREMENT: DEDICATED PROMINENT AI PLAGIARISM CHECKER CARD */}
      <PlagiarismCheckerCard
        assignment={assignment}
        selectedSubmission={selectedSubmission}
        existingReport={selectedSubmission ? {
          report_url: selectedSubmission.report_url,
          similarity: selectedSubmission.similarity_percentage
        } : null}
        onPlagiarismInitiated={() => {
          fetchSubmissions();
        }}
      />

      {/* Submissions Review Table with Filters & Search */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">Student Submission Roster</h2>
            <p className="text-xs text-slate-400">
              Complete class roster for this assignment, including students who have and have not submitted yet.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name or ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex flex-wrap gap-2 text-xs">
          {[
            { key: 'all', label: `All Students (${allSubmissions.length})` },
            { key: 'submitted', label: `Submitted (${stats.submittedCount || 0})` },
            { key: 'not_submitted', label: `Not Submitted (${stats.notSubmittedCount || 0})` },
            { key: 'late', label: `Late (${stats.lateCount || 0})` },
            { key: 'awaiting_grading', label: `Awaiting Grading (${stats.awaitingGradingCount || 0})` },
            { key: 'graded', label: `Graded (${stats.gradedCount || 0})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1 rounded-xl font-bold transition text-xs ${
                filterStatus === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Submitted Document</th>
                <th className="py-3 px-4">Submission Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Marks</th>
                <th className="py-3 px-4">Grading Status</th>
                <th className="py-3 px-4">AI Plagiarism Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400 text-xs">
                    No students matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isSelected = selectedSubmission?.id === sub.id && sub.id !== null;
                  const hasSubmitted = sub.id !== null;

                  return (
                    <tr
                      key={sub.id || `not-sub-${sub.student_id}`}
                      className={`transition ${
                        isSelected
                          ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600'
                          : !hasSubmitted
                          ? 'bg-slate-50/40 text-slate-500'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Student Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{sub.student_name}</div>
                        <div className="text-[10px] text-slate-400">{sub.student_email}</div>
                      </td>

                      {/* Student ID */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {sub.student_code}
                      </td>

                      {/* Submitted Filename */}
                      <td className="py-3 px-4">
                        {hasSubmitted ? (
                          <>
                            <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[140px]" title={sub.file_name}>
                                {sub.file_name || 'No file'}
                              </span>
                            </div>
                            {sub.versions && sub.versions.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetForVersions(sub);
                                  setShowVersionsModal(true);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center space-x-1 mt-0.5"
                                title="Click to view all submission versions"
                              >
                                <span>v{sub.version || 1} ({sub.versions.length} versions)</span>
                              </button>
                            ) : (
                              sub.file_size && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {(sub.file_size / 1024).toFixed(1)} KB (v{sub.version || 1})
                                </span>
                              )
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No file submitted yet</span>
                        )}
                      </td>

                      {/* Submission Date & Time */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {hasSubmitted ? (
                          <>
                            <div>{new Date(sub.submitted_at).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Submission Status */}
                      <td className="py-3 px-4">
                        {!hasSubmitted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Not Submitted
                          </span>
                        ) : (
                          <Badge
                            variant={
                              sub.status === 'late'
                                ? 'warning'
                                : sub.status === 'resubmission_requested'
                                ? 'danger'
                                : sub.status === 'resubmitted'
                                ? 'indigo'
                                : 'success'
                            }
                            size="xs"
                          >
                            {sub.status === 'late'
                              ? 'Late'
                              : sub.status === 'resubmission_requested'
                              ? 'Resubmit Requested'
                              : sub.status === 'resubmitted'
                              ? `Resubmitted (v${sub.version})`
                              : 'On Time'}
                          </Badge>
                        )}
                      </td>

                      {/* Marks */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {sub.marks_obtained !== null && sub.marks_obtained !== undefined ? (
                          <span>
                            {sub.marks_obtained} <span className="text-slate-400 font-normal">/ {assignment.max_marks}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* Grading Status */}
                      <td className="py-3 px-4">
                        {!hasSubmitted ? (
                          <span className="text-slate-400 text-[10px]">Pending Work</span>
                        ) : sub.grade_id ? (
                          sub.is_published === 1 ? (
                            <Badge variant="success" size="xs">Published</Badge>
                          ) : (
                            <Badge variant="warning" size="xs">Draft (Unpublished)</Badge>
                          )
                        ) : (
                          <Badge variant="default" size="xs">Ungraded</Badge>
                        )}
                      </td>

                      {/* Plagiarism Status */}
                      <td className="py-3 px-4">
                        {!hasSubmitted ? (
                          <span className="text-slate-400 text-[10px]">—</span>
                        ) : sub.plagiarism_status === 'completed' ? (
                          <span className={`inline-flex items-center font-bold px-2 py-0.5 rounded-lg text-xs ${
                            sub.similarity_percentage > 25
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {sub.similarity_percentage}% Match
                          </span>
                        ) : sub.plagiarism_status === 'initiated' ? (
                          <span className="inline-flex items-center text-xs text-blue-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse mr-1.5" />
                            Scan Running
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Unchecked</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {hasSubmitted ? (
                          <>
                            {/* Select for plagiarism button */}
                            <button
                              onClick={() => setSelectedSubmission(sub)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 hover:bg-indigo-100 text-indigo-700'
                              }`}
                              title="Select student work for AI Plagiarism Scanner card"
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>

                            {/* View document */}
                            <button
                              onClick={() => handleViewDocument(sub)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition inline-block align-middle"
                              title="Preview Document in browser"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Download document */}
                            <a
                              href={`/api/submissions/${sub.id}/file?download=true&token=${encodeURIComponent(token)}`}
                              download={sub.file_name}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition inline-block align-middle"
                              title={`Download original file: ${sub.file_name}`}
                            >
                              <Download className="w-4 h-4" />
                            </a>

                            {/* Grade */}
                            <button
                              onClick={() => handleOpenGrade(sub)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 transition"
                            >
                              {sub.grade_id ? 'Regrade' : 'Grade'}
                            </button>

                            {/* Request Resubmission */}
                            <button
                              onClick={() => handleOpenResubmit(sub)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 transition"
                              title="Return work and request resubmission"
                            >
                              Return
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Awaiting upload</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Grade Submission */}
      <Modal
        isOpen={showGradeModal}
        onClose={() => setShowGradeModal(false)}
        title={`Grade: ${targetForGrading?.student_name}`}
      >
        <form onSubmit={handleSubmitGrade} className="space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <div className="font-bold text-slate-800">{assignment.title}</div>
            <div className="text-slate-500 mt-0.5">
              Roll No: {targetForGrading?.student_code} &bull; Document: {targetForGrading?.file_name}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Marks Obtained (out of {assignment.max_marks})
            </label>
            <input
              type="number"
              required
              step="0.5"
              min="0"
              max={assignment.max_marks}
              value={gradeForm.marksObtained}
              onChange={(e) => setGradeForm({ ...gradeForm, marksObtained: e.target.value })}
              placeholder="e.g. 92"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instructor Rubric Feedback & Comments
            </label>
            <textarea
              rows="4"
              value={gradeForm.feedback}
              onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
              placeholder="Provide constructive feedback, praise strong implementation aspects, or suggest improvements..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="publishNowToggle"
              checked={gradeForm.publishNow}
              onChange={(e) => setGradeForm({ ...gradeForm, publishNow: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="publishNowToggle" className="text-xs text-slate-700 font-semibold cursor-pointer">
              Publish marks & feedback immediately to student
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowGradeModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              Save Grade
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Document Preview */}
      <Modal
        isOpen={showViewDocModal}
        onClose={() => setShowViewDocModal(false)}
        title={`Preview Document: ${docToView?.file_name}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
            <span>Author: <strong>{docToView?.student_name}</strong> ({docToView?.student_code})</span>
            <a
              href={`/api/submissions/${docToView?.id}/file?download=true&token=${encodeURIComponent(token)}`}
              download={docToView?.file_name}
              className="text-blue-600 font-semibold hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Raw File</span>
            </a>
          </div>

          {docLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading document stream...</div>
          ) : docContent ? (
            <div className="bg-slate-900 text-slate-100 font-mono text-xs p-4 rounded-2xl max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {docContent}
            </div>
          ) : (docToView?.file_name || '').toLowerCase().endsWith('.pdf') ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-100">
              <iframe
                src={`${docPreviewUrl}#toolbar=0`}
                title="Document PDF Preview"
                className="w-full h-[450px] border-0"
              />
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
              <FileCheck className="w-12 h-12 text-blue-600 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">{docToView?.file_name}</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                This document is ready to review. Use the button below to download the file directly.
              </p>
              <a
                href={`/api/submissions/${docToView?.id}/file?download=true&token=${encodeURIComponent(token)}`}
                download={docToView?.file_name}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Document</span>
              </a>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowViewDocModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-900"
            >
              Close Preview
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Request Resubmission */}
      <Modal
        isOpen={showResubmitModal}
        onClose={() => setShowResubmitModal(false)}
        title={`Request Resubmission: ${targetForResubmit?.student_name}`}
      >
        <form onSubmit={handleSubmitResubmitRequest} className="space-y-4">
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs">
            <div className="font-bold text-amber-900">{assignment.title}</div>
            <div className="text-amber-800 mt-0.5">
              Roll No: {targetForResubmit?.student_code} &bull; Active Version: v{targetForResubmit?.version || 1}
            </div>
            <p className="text-[11px] text-amber-700 mt-2">
              Returning this submission will allow the student to upload an updated document and submit again.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Feedback & Reason for Resubmission
            </label>
            <textarea
              rows="3"
              required
              value={resubmitReason}
              onChange={(e) => setResubmitReason(e.target.value)}
              placeholder="Explain what parts need improvement (e.g., 'Please format charts in Section 2 and check conclusion proofs')..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowResubmitModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resubmitting || !resubmitReason.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-50"
            >
              {resubmitting ? 'Returning Work...' : 'Return Work for Resubmission'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Version History */}
      <Modal
        isOpen={showVersionsModal}
        onClose={() => setShowVersionsModal(false)}
        title={`Submission History: ${targetForVersions?.student_name}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-3">
          <div className="text-xs text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Assignment: <strong>{assignment.title}</strong></span>
            <span>Roll No: <strong>{targetForVersions?.student_code}</strong></span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {targetForVersions?.versions && targetForVersions.versions.length > 0 ? (
              targetForVersions.versions.map((v) => (
                <div
                  key={v.id || v.version_number}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">Version {v.version_number}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        v.status === 'resubmitted' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>{v.file_name}</span>
                      {v.file_size && <span>&bull; {(v.file_size / 1024).toFixed(1)} KB</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Uploaded: {new Date(v.submitted_at).toLocaleString()}
                    </div>
                    {v.remarks && (
                      <div className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-150 mt-1 italic">
                        "{v.remarks}"
                      </div>
                    )}
                  </div>

                  <a
                    href={`/api/submissions/${targetForVersions.id}/file?download=true&version=${v.version_number}&token=${encodeURIComponent(token)}`}
                    download={v.file_name}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition border border-blue-200"
                    title="Download version file"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Only active submission recorded.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowVersionsModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
