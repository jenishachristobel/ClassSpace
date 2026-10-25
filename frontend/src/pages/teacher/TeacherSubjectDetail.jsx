import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  FileText,
  Plus,
  Bell,
  Download,
  Clock,
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Upload,
  AlertCircle
} from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useNotification } from '../../context/NotificationContext';

export default function TeacherSubjectDetail() {
  const { subjectId } = useParams();
  const { showToast } = useNotification();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'roster' | 'materials' | 'announcements'

  // Modals
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showPostAnnouncement, setShowPostAnnouncement] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  // Forms
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxMarks: 100,
    allowResubmission: true
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: ''
  });

  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: ''
  });
  const [materialFile, setMaterialFile] = useState(null);

  const fetchSubject = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/teacher/subjects/${subjectId}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Access Denied: You are not assigned to manage this subject.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubject();
  }, [subjectId]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/teacher/assignments', {
        ...assignmentForm,
        subjectId
      });
      if (res.data.success) {
        showToast('Assignment published successfully.', 'success');
        setShowCreateAssignment(false);
        setAssignmentForm({
          title: '',
          description: '',
          dueDate: '',
          maxMarks: 100,
          allowResubmission: true
        });
        fetchSubject();
      }
    } catch (err) {
      showToast('Error creating assignment.', 'error');
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/teacher/announcements', {
        ...announcementForm,
        subjectId
      });
      if (res.data.success) {
        showToast('Announcement posted to enrolled students.', 'success');
        setShowPostAnnouncement(false);
        setAnnouncementForm({ title: '', content: '' });
        fetchSubject();
      }
    } catch (err) {
      showToast('Error posting announcement.', 'error');
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('subjectId', subjectId);
    fd.append('title', materialForm.title);
    fd.append('description', materialForm.description);
    if (materialFile) {
      fd.append('material', materialFile);
    }

    try {
      const res = await api.post('/teacher/materials', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        showToast('Learning material uploaded.', 'success');
        setShowAddMaterial(false);
        setMaterialForm({ title: '', description: '' });
        setMaterialFile(null);
        fetchSubject();
      }
    } catch (err) {
      showToast('Error uploading material.', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading subject details...</div>;
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-rose-200 max-w-lg mx-auto mt-10">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Faculty Authorization Error</h2>
        <p className="text-xs text-slate-600 mt-2 mb-6">{error}</p>
        <Link
          to="/teacher/subjects"
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Return to My Authorized Subjects</span>
        </Link>
      </div>
    );
  }

  const subject = data?.subject || {};
  const roster = data?.roster || [];
  const announcements = data?.announcements || [];
  const materials = data?.materials || [];
  const assignments = data?.assignments || [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/teacher/subjects"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to My Subjects</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div
        className="rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden"
        style={{ backgroundColor: subject.color || '#6366F1' }}
      >
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
            <span>{subject.code}</span>
            <span>&bull;</span>
            <span>{subject.department}</span>
            <span>&bull;</span>
            <span>{roster.length} Enrolled Students</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            {subject.name}
          </h1>
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-2xl">
            {subject.description || 'Authorized teaching course curriculum and assessment.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setShowCreateAssignment(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-indigo-700 hover:bg-white/95 transition shadow-sm flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
            <button
              onClick={() => setShowPostAnnouncement(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/20 hover:bg-white/30 text-white backdrop-blur transition flex items-center space-x-1.5"
            >
              <Bell className="w-4 h-4" />
              <span>Post Announcement</span>
            </button>
            <button
              onClick={() => setShowAddMaterial(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/20 hover:bg-white/30 text-white backdrop-blur transition flex items-center space-x-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Add Resource</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'assignments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Assignments ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'roster'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Roster ({roster.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'materials'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Course Resources ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'announcements'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Announcements ({announcements.length})</span>
        </button>
      </div>

      {/* Tab: Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-xs text-slate-400">
              No assignments published yet. Click "Create Assignment" to post coursework.
            </div>
          ) : (
            assignments.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition">
                      {a.title}
                    </h3>
                    <Badge variant="default" size="xs">
                      Max {a.max_marks} pts
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{a.description}</p>
                  <div className="text-[11px] text-slate-400 flex items-center space-x-3 pt-1">
                    <span className="flex items-center text-amber-600 font-medium">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Due: {new Date(a.due_date).toLocaleDateString()}
                    </span>
                    <span>&bull;</span>
                    <span>Received: <strong>{a.submission_count || 0} Submissions</strong></span>
                    <span>&bull;</span>
                    <span>Graded: <strong>{a.graded_count || 0}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Link
                    to={`/teacher/assignments/${a.id}/submissions`}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Review Submissions</span>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Student Roster */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Department & Term</th>
                  <th className="py-3 px-4">Class Section</th>
                  <th className="py-3 px-4">Enrollment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{stu.first_name} {stu.last_name}</div>
                      <div className="text-[11px] text-slate-400">{stu.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">{stu.student_id}</td>
                    <td className="py-3 px-4 text-slate-600">{stu.department} (Sem {stu.semester})</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{stu.section || 'Sec-A'}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(stu.enrolled_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Materials */}
      {activeTab === 'materials' && (
        <div className="space-y-3">
          {materials.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-xs text-slate-400">
              No learning materials uploaded yet.
            </div>
          ) : (
            materials.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">{m.title}</h4>
                  <p className="text-[11px] text-slate-500">{m.description || 'Uploaded course document'}</p>
                  <div className="text-[10px] text-slate-400 mt-1">{m.file_name} &bull; {(m.file_size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
                <a
                  href={`/uploads/${m.file_name}`}
                  download={m.file_name}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Announcements */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {announcements.map((an) => (
            <div key={an.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">{an.title}</h3>
                <span className="text-[11px] text-slate-400 font-mono">{new Date(an.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{an.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Assignment */}
      <Modal isOpen={showCreateAssignment} onClose={() => setShowCreateAssignment(false)} title="Publish New Course Assignment">
        <form onSubmit={handleCreateAssignment} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Title</label>
            <input
              type="text"
              required
              value={assignmentForm.title}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
              placeholder="e.g. Lab 3: Deep Neural Network Architecture"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Instructions & Rubric</label>
            <textarea
              rows="4"
              required
              value={assignmentForm.description}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
              placeholder="State the assignment goals, required deliverables (PDF/DOCX), code requirements, and scoring metrics..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Submission Due Date</label>
              <input
                type="datetime-local"
                required
                value={assignmentForm.dueDate}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Points</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={assignmentForm.maxMarks}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, maxMarks: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="allowResubmit"
              checked={assignmentForm.allowResubmission}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, allowResubmission: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="allowResubmit" className="text-xs text-slate-700 font-medium">
              Permit student to replace or resubmit document before deadline
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowCreateAssignment(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Publish Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Post Announcement */}
      <Modal isOpen={showPostAnnouncement} onClose={() => setShowPostAnnouncement(false)} title="Broadcast Course Announcement">
        <form onSubmit={handlePostAnnouncement} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={announcementForm.title}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              placeholder="e.g. Midterm Exam Topics and Office Hours"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
            <textarea
              rows="4"
              required
              value={announcementForm.content}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
              placeholder="Write announcement text..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowPostAnnouncement(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Post Announcement
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Learning Material */}
      <Modal isOpen={showAddMaterial} onClose={() => setShowAddMaterial(false)} title="Upload Learning Resource">
        <form onSubmit={handleAddMaterial} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={materialForm.title}
              onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
              placeholder="e.g. Lecture 4: Tree Traversal Notes.pdf"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
            <input
              type="text"
              value={materialForm.description}
              onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
              placeholder="Supplementary reading notes"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Upload File (PDF / Slides)</label>
            <input
              type="file"
              onChange={(e) => setMaterialFile(e.target.files[0])}
              className="w-full text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddMaterial(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Upload Material
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

