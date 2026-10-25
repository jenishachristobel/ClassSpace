import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  FileText,
  FileCheck,
  Download,
  Eye,
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  X,
  Sparkles
} from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import { useNotification } from '../../context/NotificationContext';

export default function TeacherSubmissionsOverview() {
  const { showToast, lastRealtimeEvent } = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ submissions: [], subjects: [], stats: {} });

  // Filters
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  // 1. Grade Modal
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [targetForGrading, setTargetForGrading] = useState(null);
  const [gradeForm, setGradeForm] = useState({ marksObtained: '', feedback: '', publishNow: true });

  // 2. Resubmission / Return Work Modal
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [targetForResubmit, setTargetForResubmit] = useState(null);
  const [resubmitReason, setResubmitReason] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  // 3. Document Preview Modal
  const [showViewDocModal, setShowViewDocModal] = useState(false);
  const [docToView, setDocToView] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  // 4. Submission Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsSub, setDetailsSub] = useState(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedSubject !== 'all') params.subjectId = selectedSubject;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/teacher/submissions', { params });
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load student submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [selectedSubject, selectedStatus]);

  // Handle SSE Realtime Updates
  useEffect(() => {
    if (lastRealtimeEvent && (lastRealtimeEvent.type === 'SUBMISSION_RECEIVED' || lastRealtimeEvent.type === 'GRADE_PUBLISHED')) {
      fetchSubmissions();
    }
  }, [lastRealtimeEvent]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSubmissions();
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
        showToast(res.data.message || 'Grade recorded successfully.', 'success');
        setShowGradeModal(false);
        fetchSubmissions();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record grade.', 'error');
    }
  };

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
        showToast(res.data.message || 'Work returned to student for resubmission.', 'success');
        setShowResubmitModal(false);
        fetchSubmissions();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to request resubmission.', 'error');
    } finally {
      setResubmitting(false);
    }
  };

  const handlePreviewDocument = async (sub) => {
    setDocToView(sub);
    setShowViewDocModal(true);
    setDocLoading(true);
    setPreviewUrl('');
    setPreviewContent('');

    const token = localStorage.getItem('token');
    const fileUrl = `/api/submissions/${sub.id}/file?token=${encodeURIComponent(token)}`;
    setPreviewUrl(fileUrl);

    // If it's a text/code file, fetch preview content directly
    const ext = (sub.file_name || '').toLowerCase();
    if (ext.endsWith('.txt') || ext.endsWith('.py') || ext.endsWith('.java') || ext.endsWith('.sql')) {
      try {
        const textRes = await api.get(`/submissions/${sub.id}/file`, { responseType: 'text' });
        setPreviewContent(textRes.data);
      } catch (e) {
        setPreviewContent('Unable to load document text preview.');
      }
    }
    setDocLoading(false);
  };

  const handleOpenDetails = (sub) => {
    setDetailsSub(sub);
    setShowDetailsModal(true);
  };

  const token = localStorage.getItem('token');
  const stats = data.stats || {};
  const submissions = data.submissions || [];
  const subjects = data.subjects || [];

  // Group submissions by subject
  const submissionsBySubject = subjects.map((subj) => {
    return {
      ...subj,
      items: submissions.filter((s) => s.subject_id === subj.id)
    };
  }).filter((group) => selectedSubject === 'all' || String(group.id) === String(selectedSubject));

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-indigo-100 mb-3 border border-white/15">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            Centralized Faculty Review
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Student Submissions Management
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
            Review uploaded student documents across your authorized subjects. Inspect submission timestamps, preview or download files, grade coursework, and launch AI plagiarism analysis.
          </p>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Submissions"
          value={stats.totalSubmissions || 0}
          icon={FileText}
          color="indigo"
        />
        <StatCard
          title="Awaiting Grading"
          value={stats.awaitingGrading || 0}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Graded"
          value={stats.gradedCount || 0}
          icon={Award}
          color="purple"
        />
        <StatCard
          title="Late Submissions"
          value={stats.lateCount || 0}
          icon={AlertCircle}
          color="rose"
        />
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, roll number, email, or assignment title..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Authorized Subjects ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
            >
              Search
            </button>
          </div>
        </form>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
          {[
            { key: 'all', label: `All Submissions (${submissions.length})` },
            { key: 'awaiting_grading', label: `Awaiting Grading (${stats.awaitingGrading || 0})` },
            { key: 'graded', label: `Graded (${stats.gradedCount || 0})` },
            { key: 'late', label: `Late (${stats.lateCount || 0})` },
            { key: 'resubmitted', label: 'Resubmitted' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                selectedStatus === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Section Organized by Subject */}
      <div className="space-y-8">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading authorized student submissions...</div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center text-rose-700 text-xs">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <span>{error}</span>
          </div>
        ) : submissionsBySubject.length === 0 || submissions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-xs text-slate-400">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">No Student Submissions Received</h3>
            <p className="mt-1">
              When enrolled students upload and submit assignments for your authorized courses, their documents will appear here.
            </p>
          </div>
        ) : (
          submissionsBySubject.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm space-y-0"
            >
              {/* Subject Group Header */}
              <div
                className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-2xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: group.color || '#6366F1' }}
                  >
                    {group.code.substring(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <span>{group.name}</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-slate-200/70 text-slate-700 font-semibold">
                        {group.code}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      {group.items.length} {group.items.length === 1 ? 'submission' : 'submissions'} in this course
                    </p>
                  </div>
                </div>

                <Link
                  to={`/teacher/subjects/${group.id}`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                >
                  <span>Go to Course Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Subject Submissions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Assignment</th>
                      <th className="py-3 px-4">Uploaded Document</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Marks</th>
                      <th className="py-3 px-4">Grading</th>
                      <th className="py-3 px-4">Plagiarism</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.items.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-8 text-slate-400 text-xs">
                          No submissions matching current filters for {group.name}.
                        </td>
                      </tr>
                    ) : (
                      group.items.map((sub) => (
                        <tr key={sub.id} className="hover:bg-indigo-50/30 transition">
                          {/* Student Info */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(sub)}
                              className="text-left group"
                            >
                              <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                                {sub.student_name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {sub.student_code} &bull; {sub.student_email}
                              </div>
                            </button>
                          </td>

                          {/* Assignment Title */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 max-w-[150px] truncate" title={sub.assignment_title}>
                              {sub.assignment_title}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Max {sub.max_marks} pts
                            </div>
                          </td>

                          {/* Uploaded Document */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[140px]" title={sub.file_name}>
                                {sub.file_name || 'document.pdf'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {sub.file_size ? `${(sub.file_size / 1024).toFixed(1)} KB` : 'Active version'} &bull; v{sub.version || 1}
                            </div>
                          </td>

                          {/* Submitted Timestamp */}
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            <div>{new Date(sub.submitted_at).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                sub.status === 'late'
                                  ? 'warning'
                                  : sub.status === 'resubmitted'
                                  ? 'indigo'
                                  : 'success'
                              }
                              size="xs"
                            >
                              {sub.status === 'late' ? 'Late' : sub.status === 'resubmitted' ? `Resubmitted (v${sub.version})` : 'Submitted'}
                            </Badge>
                          </td>

                          {/* Marks */}
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {sub.marks_obtained !== null && sub.marks_obtained !== undefined ? (
                              <span>
                                {sub.marks_obtained} <span className="text-slate-400 font-normal">/ {sub.max_marks}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>

                          {/* Grading Status */}
                          <td className="py-3 px-4">
                            {sub.grade_id ? (
                              sub.is_published === 1 ? (
                                <Badge variant="success" size="xs">Published</Badge>
                              ) : (
                                <Badge variant="warning" size="xs">Draft</Badge>
                              )
                            ) : (
                              <Badge variant="default" size="xs">Ungraded</Badge>
                            )}
                          </td>

                          {/* AI Plagiarism Status */}
                          <td className="py-3 px-4">
                            {sub.plagiarism_status === 'completed' ? (
                              <span className={`inline-flex items-center font-bold px-2 py-0.5 rounded-lg text-xs ${
                                sub.similarity_percentage > 25
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {sub.similarity_percentage}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Unchecked</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                            {/* Preview Document */}
                            <button
                              type="button"
                              onClick={() => handlePreviewDocument(sub)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition inline-block align-middle"
                              title="Preview Document in browser"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Download Document */}
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
                              type="button"
                              onClick={() => handleOpenGrade(sub)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 transition"
                            >
                              {sub.grade_id ? 'Regrade' : 'Grade'}
                            </button>

                            {/* Return for Resubmission */}
                            <button
                              type="button"
                              onClick={() => handleOpenResubmit(sub)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 transition"
                              title="Return work for resubmission"
                            >
                              Return
                            </button>

                            {/* Plagiarism link */}
                            <Link
                              to={`/teacher/assignments/${sub.assignment_id}/submissions`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition inline-block align-middle"
                              title="Open in Assignment Submissions Review & AI Plagiarism Scanner"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal 1: Grade Submission */}
      <Modal
        isOpen={showGradeModal}
        onClose={() => setShowGradeModal(false)}
        title={`Grade: ${targetForGrading?.student_name}`}
      >
        <form onSubmit={handleSubmitGrade} className="space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <div className="font-bold text-slate-800">{targetForGrading?.assignment_title}</div>
            <div className="text-slate-500 mt-0.5">
              Roll No: {targetForGrading?.student_code} &bull; Document: {targetForGrading?.file_name}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Marks Obtained (out of {targetForGrading?.max_marks})
            </label>
            <input
              type="number"
              required
              step="0.5"
              min="0"
              max={targetForGrading?.max_marks || 100}
              value={gradeForm.marksObtained}
              onChange={(e) => setGradeForm({ ...gradeForm, marksObtained: e.target.value })}
              placeholder="e.g. 95"
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
              id="publishToggle"
              checked={gradeForm.publishNow}
              onChange={(e) => setGradeForm({ ...gradeForm, publishNow: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="publishToggle" className="text-xs text-slate-700 font-semibold cursor-pointer">
              Publish marks & feedback immediately to student
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowGradeModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              Save Grade Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Resubmission / Return Work */}
      <Modal
        isOpen={showResubmitModal}
        onClose={() => setShowResubmitModal(false)}
        title={`Return Work for Resubmission: ${targetForResubmit?.student_name}`}
      >
        <form onSubmit={handleSubmitResubmitRequest} className="space-y-4">
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
            <strong className="block font-bold mb-0.5">Faculty Return Notice</strong>
            <span>
              Returning this submission unblocks the student to upload an updated version of their assignment document. The previous submission file and timestamp will be safely preserved in database version history.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Feedback & Instructions for Resubmission
            </label>
            <textarea
              rows="4"
              required
              value={resubmitReason}
              onChange={(e) => setResubmitReason(e.target.value)}
              placeholder="e.g. Please format Section 3 according to IEEE standards and include the unit test execution outputs."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowResubmitModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-50"
            >
              {resubmitting ? 'Returning Work...' : 'Return Work to Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Document Preview Modal */}
      <Modal
        isOpen={showViewDocModal}
        onClose={() => setShowViewDocModal(false)}
        title={`Document Preview: ${docToView?.file_name || 'Document'}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="font-bold text-slate-800">{docToView?.student_name}</span> &bull;{' '}
              <span className="text-slate-500">{docToView?.assignment_title}</span>
            </div>
            <a
              href={`/api/submissions/${docToView?.id}/file?download=true&token=${encodeURIComponent(token)}`}
              download={docToView?.file_name}
              className="px-3 py-1.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </a>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 min-h-[350px] max-h-[500px] flex items-center justify-center">
            {docLoading ? (
              <div className="text-xs text-slate-400">Loading document preview...</div>
            ) : previewContent ? (
              <pre className="p-4 text-xs font-mono text-slate-800 whitespace-pre-wrap overflow-y-auto max-h-[480px] w-full bg-white">
                {previewContent}
              </pre>
            ) : (docToView?.file_name || '').toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                title="Document PDF Preview"
                className="w-full h-[480px] border-0"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <FileCheck className="w-12 h-12 text-blue-600 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">{docToView?.file_name}</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  This document format ({docToView?.file_name?.split('.').pop()?.toUpperCase()}) is best viewed in an external desktop application.
                </p>
                <a
                  href={`/api/submissions/${docToView?.id}/file?download=true&token=${encodeURIComponent(token)}`}
                  download={docToView?.file_name}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download and Open Document</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal 4: Submission Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Submission Record Details"
      >
        {detailsSub && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Name</span>
                <span className="font-bold text-slate-900">{detailsSub.student_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Institutional Email</span>
                <span className="font-mono text-slate-800">{detailsSub.student_email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Subject</span>
                <span className="font-bold text-slate-800">{detailsSub.subject_name} ({detailsSub.subject_code})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assignment</span>
                <span className="font-bold text-slate-800">{detailsSub.assignment_title}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Server Timestamp</span>
                <span className="font-mono text-slate-700">{new Date(detailsSub.submitted_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Submission Status</span>
                <Badge variant={detailsSub.status === 'late' ? 'warning' : 'success'}>
                  {detailsSub.status === 'late' ? 'Late Submission' : 'On-Time Submission'}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Document</span>
                <span className="font-medium text-slate-800">{detailsSub.file_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Version</span>
                <span className="font-bold text-indigo-700">Version {detailsSub.version || 1}</span>
              </div>
            </div>

            {detailsSub.remarks && (
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <span className="text-blue-900 font-bold block mb-0.5">Student Remarks:</span>
                <p className="text-blue-800 italic">{detailsSub.remarks}</p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <a
                href={`/api/submissions/${detailsSub.id}/file?download=true&token=${encodeURIComponent(token)}`}
                download={detailsSub.file_name}
                className="px-4 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Document</span>
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

