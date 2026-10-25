import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Briefcase
} from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useNotification } from '../../context/NotificationContext';

export default function ManageTeachers() {
  const { showToast } = useNotification();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    employeeId: '',
    department: 'Computer Science',
    designation: 'Associate Professor',
    officeRoom: '',
    password: 'Teacher@123',
    phone: '',
    status: 'active'
  });

  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSubjectToAssign, setSelectedSubjectToAssign] = useState('');

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/teachers', {
        params: { search, department, status }
      });
      if (res.data.success) {
        setTeachers(res.data.teachers || []);
      }
    } catch (err) {
      showToast('Failed to load teachers.', 'error');
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
    fetchTeachers();
    fetchSubjects();
  }, [search, department, status]);

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/teachers', formData);
      if (res.data.success) {
        showToast('Teacher account created successfully.', 'success');
        setShowCreateModal(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          employeeId: '',
          department: 'Computer Science',
          designation: 'Associate Professor',
          officeRoom: '',
          password: 'Teacher@123',
          phone: '',
          status: 'active'
        });
        fetchTeachers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating teacher.', 'error');
    }
  };

  const handleOpenEdit = (t) => {
    setSelectedTeacher(t);
    setFormData({
      firstName: t.first_name,
      lastName: t.last_name,
      email: t.email,
      employeeId: t.employee_id,
      department: t.department,
      designation: t.designation,
      officeRoom: t.office_room || '',
      phone: t.phone || '',
      status: t.status
    });
    setShowEditModal(true);
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/admin/teachers/${selectedTeacher.id}`, formData);
      if (res.data.success) {
        showToast('Teacher updated successfully.', 'success');
        setShowEditModal(false);
        fetchTeachers();
      }
    } catch (err) {
      showToast('Error updating teacher.', 'error');
    }
  };

  const handleToggleStatus = async (t) => {
    const newStatus = t.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/admin/teachers/${t.id}`, { status: newStatus });
      showToast(`Account ${newStatus === 'active' ? 'activated' : 'deactivated'}.`, 'success');
      fetchTeachers();
    } catch (err) {
      showToast('Error updating account status.', 'error');
    }
  };

  const handleOpenAssign = async (t) => {
    setSelectedTeacher(t);
    try {
      const res = await api.get(`/admin/teachers/${t.id}/assignments`);
      if (res.data.success) {
        setTeacherAssignments(res.data.assignments || []);
      }
      setShowAssignModal(true);
    } catch (err) {
      showToast('Failed to load assignments.', 'error');
    }
  };

  const handleAssignSubject = async (e) => {
    e.preventDefault();
    if (!selectedSubjectToAssign) return;
    try {
      const res = await api.post(`/admin/teachers/${selectedTeacher.id}/assignments`, {
        subjectId: selectedSubjectToAssign
      });
      if (res.data.success) {
        showToast('Teacher assigned to subject successfully.', 'success');
        setSelectedSubjectToAssign('');
        const refreshed = await api.get(`/admin/teachers/${selectedTeacher.id}/assignments`);
        setTeacherAssignments(refreshed.data.assignments || []);
        fetchTeachers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error assigning teacher.', 'error');
    }
  };

  const handleRemoveAssignment = async (subjectId) => {
    if (!window.confirm('Remove teacher from this subject?')) return;
    try {
      const res = await api.delete(`/admin/teachers/${selectedTeacher.id}/assignments/${subjectId}`);
      if (res.data.success) {
        showToast('Subject assignment removed.', 'success');
        const refreshed = await api.get(`/admin/teachers/${selectedTeacher.id}/assignments`);
        setTeacherAssignments(refreshed.data.assignments || []);
        fetchTeachers();
      }
    } catch (err) {
      showToast('Error removing assignment.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Manage Faculty & Teacher Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorize instructor subject assignments, update employee profiles, and control grading access.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center space-x-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Teacher</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by instructor name, email, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Instructor</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department & Rank</th>
                <th className="py-3 px-4">Assigned Subjects</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400">
                    Loading faculty directory...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    No teacher records found.
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {t.first_name} {t.last_name}
                      </div>
                      <div className="text-[11px] text-slate-400">{t.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {t.employee_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-700">{t.department}</div>
                      <div className="text-[10px] text-slate-400">{t.designation}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleOpenAssign(t)}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[200px]">
                          {t.assigned_subjects_summary || 'Assign Subjects'}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={t.status === 'active' ? 'success' : 'default'} size="xs">
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                        title="Edit details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(t)}
                        className={`p-1.5 rounded-lg transition ${
                          t.status === 'active'
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={t.status === 'active' ? 'Deactivate account' : 'Activate account'}
                      >
                        {t.status === 'active' ? (
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

      {/* Modal: Create Teacher */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New Faculty Account"
      >
        <form onSubmit={handleCreateTeacher} className="space-y-3.5">
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="prof.name@classspace.edu"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
              <input
                type="text"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="EMP-T-105"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Associate Professor"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>

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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
            <input
              type="text"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
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
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Create Teacher Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Teacher */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Teacher Information"
      >
        <form onSubmit={handleUpdateTeacher} className="space-y-3.5">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Subjects to Teacher */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Subject Assignments for ${selectedTeacher?.first_name} ${selectedTeacher?.last_name}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Assign new subject */}
          <form onSubmit={handleAssignSubject} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row gap-2">
            <select
              required
              value={selectedSubjectToAssign}
              onChange={(e) => setSelectedSubjectToAssign(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select subject to assign to this teacher...</option>
              {allSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code}: {sub.name} ({sub.department})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 transition"
            >
              Assign Subject
            </button>
          </form>

          {/* Currently Assigned Subjects */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Authorized Teaching Subjects ({teacherAssignments.length})
            </h4>

            {teacherAssignments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                This teacher is not currently assigned to any subjects.
              </p>
            ) : (
              <div className="space-y-2">
                {teacherAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-800">
                          {a.subject_code}: {a.subject_name}
                        </span>
                        <Badge variant="indigo" size="xs">
                          {a.enrolled_count || 0} Students Enrolled
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Class Section: {a.class_name || 'All Sections'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveAssignment(a.subject_id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="Remove teaching assignment"
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
              onClick={() => setShowAssignModal(false)}
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

