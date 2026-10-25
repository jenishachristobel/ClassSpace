import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  BookOpen,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useNotification } from '../../context/NotificationContext';

export default function ManageStudents() {
  const { showToast } = useNotification();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
    department: 'Computer Science',
    semester: 3,
    password: 'Student@123',
    phone: '',
    status: 'active'
  });

  // Enrollments for selected student
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSubjectToEnroll, setSelectedSubjectToEnroll] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/students', {
        params: { search, department, status }
      });
      if (res.data.success) {
        setStudents(res.data.students || []);
      }
    } catch (err) {
      showToast('Failed to load students.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/admin/subjects');
      if (res.data.success) {
        setAllSubjects(res.data.subjects || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
  }, [search, department, status]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/students', formData);
      if (res.data.success) {
        showToast('Student account created successfully.', 'success');
        setShowCreateModal(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          studentId: '',
          department: 'Computer Science',
          semester: 3,
          password: 'Student@123',
          phone: '',
          status: 'active'
        });
        fetchStudents();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating student.', 'error');
    }
  };

  const handleOpenEdit = (stu) => {
    setSelectedStudent(stu);
    setFormData({
      firstName: stu.first_name,
      lastName: stu.last_name,
      email: stu.email,
      studentId: stu.student_id,
      department: stu.department,
      semester: stu.semester,
      phone: stu.phone || '',
      status: stu.status
    });
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/admin/students/${selectedStudent.id}`, formData);
      if (res.data.success) {
        showToast('Student updated successfully.', 'success');
        setShowEditModal(false);
        fetchStudents();
      }
    } catch (err) {
      showToast('Error updating student.', 'error');
    }
  };

  const handleToggleStatus = async (stu) => {
    const newStatus = stu.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/admin/students/${stu.id}`, { status: newStatus });
      showToast(`Account ${newStatus === 'active' ? 'activated' : 'deactivated'}.`, 'success');
      fetchStudents();
    } catch (err) {
      showToast('Error updating account status.', 'error');
    }
  };

  const handleOpenEnrollments = async (stu) => {
    setSelectedStudent(stu);
    try {
      const res = await api.get(`/admin/students/${stu.id}/enrollments`);
      if (res.data.success) {
        setStudentEnrollments(res.data.enrollments || []);
      }
      setShowEnrollModal(true);
    } catch (err) {
      showToast('Failed to load student enrollments.', 'error');
    }
  };

  const handleEnrollInSubject = async (e) => {
    e.preventDefault();
    if (!selectedSubjectToEnroll) return;
    try {
      const res = await api.post(`/admin/students/${selectedStudent.id}/enrollments`, {
        subjectId: selectedSubjectToEnroll
      });
      if (res.data.success) {
        showToast('Student successfully enrolled.', 'success');
        setSelectedSubjectToEnroll('');
        // Refresh enrollments modal list and student list
        const refreshed = await api.get(`/admin/students/${selectedStudent.id}/enrollments`);
        setStudentEnrollments(refreshed.data.enrollments || []);
        fetchStudents();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error enrolling student.', 'error');
    }
  };

  const handleUnenroll = async (subjectId) => {
    if (!window.confirm('Are you sure you want to remove this student from this subject?')) return;
    try {
      const res = await api.delete(`/admin/students/${selectedStudent.id}/enrollments/${subjectId}`);
      if (res.data.success) {
        showToast('Enrollment removed.', 'success');
        const refreshed = await api.get(`/admin/students/${selectedStudent.id}/enrollments`);
        setStudentEnrollments(refreshed.data.enrollments || []);
        fetchStudents();
      }
    } catch (err) {
      showToast('Error removing enrollment.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Manage Student Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create student records, manage course enrollments, and toggle account activation status.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center space-x-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Student</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or Student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="AI & Data Science">AI & Data Science</option>
            <option value="Information Systems">Information Systems</option>
            <option value="Software Engineering">Software Engineering</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Department & Term</th>
                <th className="py-3 px-4">Enrolled Subjects</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400">
                    Loading student directory...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    No student records match your query.
                  </td>
                </tr>
              ) : (
                students.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {stu.first_name} {stu.last_name}
                      </div>
                      <div className="text-[11px] text-slate-400">{stu.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {stu.student_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-700">{stu.department}</div>
                      <div className="text-[10px] text-slate-400">Semester {stu.semester}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleOpenEnrollments(stu)}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 transition"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{stu.enrolled_subjects_count || 0} Subjects</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={stu.status === 'active' ? 'success' : 'default'} size="xs">
                        {stu.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(stu)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                        title="Edit details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(stu)}
                        className={`p-1.5 rounded-lg transition ${
                          stu.status === 'active'
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={stu.status === 'active' ? 'Deactivate account' : 'Activate account'}
                      >
                        {stu.status === 'active' ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Student */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New Student Account"
      >
        <form onSubmit={handleCreateStudent} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Institutional Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="name.student@classspace.edu"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student ID / Roll No</label>
              <input
                type="text"
                required
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                placeholder="STU-2024-007"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
              <input
                type="number"
                min="1"
                max="8"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="Computer Science">Computer Science</option>
              <option value="AI & Data Science">AI & Data Science</option>
              <option value="Information Systems">Information Systems</option>
              <option value="Software Engineering">Software Engineering</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
            <input
              type="text"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Student Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Student */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Student Information"
      >
        <form onSubmit={handleUpdateStudent} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="AI & Data Science">AI & Data Science</option>
                <option value="Information Systems">Information Systems</option>
                <option value="Software Engineering">Software Engineering</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
              <input
                type="number"
                min="1"
                max="8"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
            >
              <option value="active">Active (Permitted to log in)</option>
              <option value="inactive">Inactive (Deactivated)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manage Student Subject Enrollments */}
      <Modal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        title={`Enrollments for ${selectedStudent?.first_name} ${selectedStudent?.last_name}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Enroll in new subject control */}
          <form onSubmit={handleEnrollInSubject} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row gap-2">
            <select
              required
              value={selectedSubjectToEnroll}
              onChange={(e) => setSelectedSubjectToEnroll(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a subject to enroll...</option>
              {allSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code}: {sub.name} ({sub.department})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 transition"
            >
              Enroll Student
            </button>
          </form>

          {/* Currently Enrolled Subjects List */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Currently Enrolled Subjects ({studentEnrollments.length})
            </h4>

            {studentEnrollments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                This student is not enrolled in any subjects yet.
              </p>
            ) : (
              <div className="space-y-2">
                {studentEnrollments.map((enr) => (
                  <div
                    key={enr.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-800">
                          {enr.subject_code}: {enr.subject_name}
                        </span>
                        <Badge variant="primary" size="xs">
                          {enr.credits} Credits
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Teacher: {enr.teacher_names || 'Not assigned'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleUnenroll(enr.subject_id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="Remove enrollment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setShowEnrollModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-900"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

