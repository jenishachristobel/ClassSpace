import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileCheck,
  RefreshCw,
  Download,
  X,
  Trash2,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import { useNotification } from '../../context/NotificationContext';

export default function StudentAssignmentDetail() {
  const { assignmentId } = useParams();
  const { showToast, lastRealtimeEvent } = useNotification();

  const fileInputRef = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [submissionConfirmation, setSubmissionConfirmation] = useState(null);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/student/assignments/${assignmentId}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Access Denied: You cannot access this assignment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [assignmentId]);

  // Real-time listener for grades or resubmission requests
  useEffect(() => {
    if (lastRealtimeEvent && (lastRealtimeEvent.type === 'GRADE_PUBLISHED' || lastRealtimeEvent.type === 'RESUBMISSION_REQUESTED')) {
      fetchDetail();
    }
  }, [lastRealtimeEvent]);

  const validateAndSetFile = (file) => {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.docx', '.doc', '.txt'];
    if (!allowed.includes(ext)) {
      showToast(`Invalid file format '${ext}'. Please upload a PDF, DOCX, or TXT file.`, 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('File size exceeds the 15 MB limit. Please select a smaller document.', 'error');
      return;
    }
    setSelectedFile(file);
    setSubmissionConfirmation(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a document to upload.', 'error');
      return;
    }

    setSubmitting(true);
    setUploadProgress(10);
    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('remarks', remarks);

    try {
      const res = await api.post(`/student/assignments/${assignmentId}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });

      if (res.data.success) {
        setUploadProgress(100);
        showToast(res.data.message || 'Work submitted successfully!', 'success');
        setSubmissionConfirmation({
          submittedAt: res.data.submittedAt,
          isLate: res.data.isLate,
          message: res.data.message
        });
        setSelectedFile(null);
        setRemarks('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchDetail();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Submission failed. Please check network and file size.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const token = localStorage.getItem('token');

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading assignment details...</div>;
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-rose-200 max-w-lg mx-auto mt-10">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Enrollment Restriction</h2>
        <p className="text-xs text-slate-600 mt-2 mb-6">{error}</p>
        <Link
          to="/student/subjects"
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Return to Courses</span>
        </Link>
      </div>
    );
  }

  const assignment = data?.assignment || {};
  const submission = data?.submission;
  const submissionFile = data?.submissionFile;
  const versions = data?.versions || [];
  const grade = data?.grade;
  const isPastDue = new Date() > new Date(assignment.due_date);
  const canResubmit = !submission || assignment.allow_resubmission === 1 || submission?.status === 'resubmission_requested';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to={`/student/subjects/${assignment.subject_id}`}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to {assignment.subject_name || 'Subject'}</span>
        </Link>
      </div>

      {/* Assignment Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>{assignment.subject_code}</span>
              <span>&bull;</span>
              <span>Instructor: {assignment.teacher_name}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {assignment.title}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              {assignment.max_marks} Maximum Points
            </span>
          </div>
        </div>

        {/* Due Date & Submission Guidelines */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/70">
            <Clock className="w-4 h-4 mr-1.5 text-amber-600" />
            Due: {new Date(assignment.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
          <span className="text-slate-400">&bull;</span>
          <span>Allowed Formats: <strong>{assignment.allowed_file_types || 'PDF, DOCX, TXT'}</strong></span>
          <span className="text-slate-400">&bull;</span>
          <span>Max File Size: <strong>{assignment.max_file_size_mb || 15} MB</strong></span>
          <span className="text-slate-400">&bull;</span>
          <span>Resubmission: <strong>{assignment.allow_resubmission ? 'Permitted' : 'Not Permitted'}</strong></span>
        </div>

        {/* Instructions Body */}
        <div className="pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Assignment Instructions & Rubric
          </h3>
          <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100 whitespace-pre-line font-sans">
            {assignment.description}
          </div>
        </div>
      </div>

      {/* Submission Confirmation Banner (if just submitted) */}
      {submissionConfirmation && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between animate-in fade-in duration-200">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-emerald-900">
                {submissionConfirmation.message || 'Assignment submitted successfully!'}
              </h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Verified Server Timestamp: <strong>{new Date(submissionConfirmation.submittedAt).toLocaleString()}</strong> &bull; Status: <strong>{submissionConfirmation.isLate ? 'Late Submission' : 'On-Time Submission'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubmissionConfirmation(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Submission & Grading Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Submission Status / Upload Form */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center justify-between">
              <span>Your Submission</span>
              {submission ? (
                <Badge variant={submission.status === 'late' ? 'warning' : submission.status === 'resubmission_requested' ? 'danger' : 'success'}>
                  {submission.status === 'late' ? 'Submitted Late' : submission.status === 'resubmission_requested' ? 'Resubmission Requested' : 'Submitted on time'}
                </Badge>
              ) : (
                <Badge variant="warning">Not Yet Submitted</Badge>
              )}
            </h2>

            {submission?.status === 'resubmission_requested' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Resubmission Requested by Faculty</strong>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">
                    {submission.remarks || 'Your instructor requested an updated draft for this assignment.'}
                  </p>
                </div>
              </div>
            )}

            {/* Active Submitted Document Card */}
            {submission && submissionFile && (
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileCheck className="w-8 h-8 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">{submissionFile.file_name}</div>
                      <div className="text-[11px] text-slate-500">
                        Active Version {submission.version || 1} &bull; {(submissionFile.file_size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <a
                    href={`/api/submissions/${submission.id}/file?download=true&token=${encodeURIComponent(token)}`}
                    download={submissionFile.file_name}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition"
                    title="Download active submitted file"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>

                <div className="text-[11px] text-slate-500 pt-2 border-t border-blue-100 flex justify-between">
                  <span>Server Timestamp: {new Date(submission.submitted_at).toLocaleString()}</span>
                  <span className="font-semibold text-emerald-600">Saved to Database</span>
                </div>
              </div>
            )}

            {/* Submission Version History Timeline */}
            {versions && versions.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Version History ({versions.length} {versions.length === 1 ? 'version' : 'versions'})
                  </span>
                  <span className="text-[10px] text-slate-400">Database-backed audit</span>
                </div>
                <div className="space-y-1.5">
                  {versions.map((ver) => (
                    <div
                      key={ver.id || ver.version_number}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 flex items-center justify-between text-xs transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800">
                            Version {ver.version_number}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            ver.status === 'resubmitted' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {ver.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                          <span>{ver.file_name}</span>
                          <span>&bull;</span>
                          <span>{new Date(ver.submitted_at).toLocaleString()}</span>
                        </div>
                        {ver.remarks && (
                          <div className="text-[10px] text-slate-600 italic">
                            Student remarks: "{ver.remarks}"
                          </div>
                        )}
                      </div>
                      <a
                        href={`/api/submissions/${submission.id}/file?download=true&version=${ver.version_number}&token=${encodeURIComponent(token)}`}
                        download={ver.file_name}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition"
                        title={`Download version ${ver.version_number} file`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload / Resubmit Form */}
            {canResubmit && (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {submission ? 'Upload Replacement Document (Resubmission)' : 'Upload Assignment Document'}
                  </label>

                  {/* Drag and Drop Zone or Selected File Card */}
                  {!selectedFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition bg-slate-50/50 ${
                        isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.doc,.txt"
                        className="hidden"
                      />
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700 mb-1">
                        Drag and drop your assignment document here, or
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm mt-1"
                      >
                        <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                        <span>Browse Files</span>
                      </button>
                      <span className="text-[10px] text-slate-400 block mt-2">
                        Supported: PDF, DOCX, TXT &bull; Maximum file size: 15 MB
                      </span>
                    </div>
                  ) : (
                    /* Selected File Details & Removal Action */
                    <div className="p-4 rounded-2xl border-2 border-blue-300 bg-blue-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-8 h-8 text-blue-600 shrink-0" />
                          <div>
                            <div className="font-bold text-xs text-slate-900">{selectedFile.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready for upload
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition"
                          title="Remove selected file before submission"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-blue-100">
                        <span>Format: {selectedFile.name.split('.').pop()?.toUpperCase()}</span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Choose Different File
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Progress Indicator */}
                {submitting && (
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Uploading document and timestamping...</span>
                      <span className="font-bold text-blue-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Remarks Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Submission Remarks (Optional)
                  </label>
                  <textarea
                    rows="2"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add notes for your instructor (e.g. 'Completed bonus section 4')..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={submitting || !selectedFile}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing Submission & Timestamp...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>{submission ? 'Submit Updated Version' : 'Submit Assignment'}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {submission && !canResubmit && (
              <p className="text-xs text-slate-500 italic text-center py-2">
                Resubmission has been disabled by the instructor for this assignment.
              </p>
            )}
          </div>
        </div>

        {/* Right: Grade & Feedback Card */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Award className="w-5 h-5 text-purple-600" />
              <span>Assessment & Grade</span>
            </h2>

            {grade ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-center">
                  <span className="text-xs text-purple-800 font-semibold uppercase tracking-wider block mb-1">
                    Score Received
                  </span>
                  <div className="text-4xl font-black text-purple-900 tracking-tight">
                    {grade.marks_obtained} <span className="text-lg font-bold text-purple-400">/ {assignment.max_marks}</span>
                  </div>
                  <span className="text-[11px] text-purple-700 font-semibold block mt-1">
                    {Math.round((grade.marks_obtained / assignment.max_marks) * 100)}% Grade
                  </span>
                </div>

                {grade.feedback && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Teacher Feedback
                    </h4>
                    <p className="text-xs text-slate-700 italic bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                      "{grade.feedback}"
                    </p>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  Published on: {new Date(grade.published_at).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">Awaiting Grade Publication</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Your instructor will review your submitted document and publish your score and rubric feedback here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
