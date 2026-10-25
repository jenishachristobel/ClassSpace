import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Users,
  GraduationCap,
  Layers,
  FileText,
  Palette
} from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useNotification } from '../../context/NotificationContext';

export default function ManageSubjects() {
  const { showToast } = useNotification();
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    department: 'Computer Science',
    description: '',
    credits: 4,
    color: '#3B82F6',
    icon: 'BookOpen',
    teacherId: ''
  });

  const colorOptions = [
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Indigo', hex: '#6366F1' },
    { name: 'Emerald', hex: '#10B981' },
    { name: 'Purple', hex: '#8B5CF6' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Pink', hex: '#EC4899' },
  ];

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/subjects');
      if (res.data.success) {
        setSubjects(res.data.subjects || []);
      }
    } catch (err) {
      showToast('Failed to load subjects.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/admin/teachers');
      if (res.data.success) {
        setTeachers(res.data.teachers || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/subjects', formData);
      if (res.data.success) {
        showToast('Subject created successfully.', 'success');
        setShowCreateModal(false);
        setFormData({
          code: '',
          name: '',
          department: 'Computer Science',
          description: '',
          credits: 4,
          color: '#3B82F6',
          icon: 'BookOpen',
          teacherId: ''
        });
        fetchSubjects();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating subject.', 'error');
    }
  };

  const handleOpenEdit = (sub) => {
    setSelectedSubject(sub);
    setFormData({
      code: sub.code,
      name: sub.name,
      department: sub.department,
      description: sub.description || '',
      credits: sub.credits || 4,
      color: sub.color || '#3B82F6',
      icon: sub.icon || 'BookOpen',
      teacherId: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/admin/subjects/${selectedSubject.id}`, formData);
      if (res.data.success) {
        showToast('Subject updated successfully.', 'success');
        setShowEditModal(false);
        fetchSubjects();
      }
    } catch (err) {
      showToast('Error updating subject.', 'error');
    }
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete subject '${name}'? This will remove all associated assignments and enrollments.`)) return;
    try {
      const res = await api.delete(`/admin/subjects/${id}`);
      if (res.data.success) {
        showToast('Subject deleted.', 'success');
        fetchSubjects();
      }
    } catch (err) {
      showToast('Error deleting subject.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Manage Academic Subjects Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic database-driven curriculum catalog. Configure subject codes, credit hours, and instructor assignments.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center space-x-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Subject</span>
        </button>
      </div>

      {/* Subjects Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading academic subjects...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Colored Header Banner */}
                <div
                  className="p-5 text-white flex items-center justify-between"
                  style={{ backgroundColor: sub.color || '#3B82F6' }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-lg">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-mono font-bold text-xs uppercase tracking-wider block opacity-90">
                        {sub.code}
                      </span>
                      <h3 className="font-extrabold text-base leading-tight">{sub.name}</h3>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-black/20 backdrop-blur">
                    {sub.credits} Credits
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4">
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {sub.description || 'No description provided.'}
                  </p>

                  <div className="space-y-2 text-xs pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="flex items-center">
                        <Users className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        Assigned Faculty:
                      </span>
                      <span className="font-bold text-slate-800 text-right max-w-[160px] truncate">
                        {sub.assigned_teachers || 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500">
                      <span className="flex items-center">
                        <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        Enrolled Students:
                      </span>
                      <span className="font-bold text-slate-800">{sub.enrolled_count || 0}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500">
                      <span className="flex items-center">
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        Active Assignments:
                      </span>
                      <span className="font-bold text-slate-800">{sub.assignment_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {sub.department}
                </span>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleOpenEdit(sub)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white transition"
                    title="Edit subject"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(sub.id, sub.name)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-white transition"
                    title="Delete subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Subject */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Course Subject"
      >
        <form onSubmit={handleCreateSubject} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CS501"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Credits</label>
              <input
                type="number"
                min="1"
                max="6"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Cloud Computing & Distributed Systems"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Syllabus & Course Description</label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Overview of core paradigms, learning outcomes, and prerequisites..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Theme Accent Color</label>
            <div className="flex space-x-2 pt-1">
              {colorOptions.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c.hex })}
                  className={`w-7 h-7 rounded-full transition-all border-2 ${
                    formData.color === c.hex ? 'border-slate-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Initial Instructor (Optional)</label>
            <select
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
            >
              <option value="">Select an instructor...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.department})
                </option>
              ))}
            </select>
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
              Save Subject
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Subject */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Subject Details"
      >
        <form onSubmit={handleUpdateSubject} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Credits</label>
              <input
                type="number"
                min="1"
                max="6"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Card Theme Color</label>
            <div className="flex space-x-2 pt-1">
              {colorOptions.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c.hex })}
                  className={`w-7 h-7 rounded-full transition-all border-2 ${
                    formData.color === c.hex ? 'border-slate-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
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
    </div>
  );
}

