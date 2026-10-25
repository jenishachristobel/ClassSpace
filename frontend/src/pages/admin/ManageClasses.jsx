import React, { useState, useEffect } from 'react';
import { School, Plus, Search, BookOpen, Users, Copy, Check } from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useNotification } from '../../context/NotificationContext';

export default function ManageClasses() {
  const { showToast } = useNotification();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const [formData, setFormData] = useState({
    subjectId: '',
    name: '',
    section: 'Sec-A',
    academicTerm: 'Fall 2024',
    classCode: ''
  });

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/classes');
      if (res.data.success) {
        setClasses(res.data.classes || []);
      }
    } catch (err) {
      showToast('Failed to load class sections.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/admin/subjects');
      if (res.data.success) {
        setSubjects(res.data.subjects || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  const handleSubjectSelect = (subId) => {
    const sub = subjects.find(s => s.id === Number(subId));
    if (sub) {
      const generatedCode = `${sub.code}-SEC-${Date.now().toString().slice(-4)}`;
      setFormData({
        ...formData,
        subjectId: subId,
        name: `${sub.name} - Section ${formData.section}`,
        classCode: generatedCode
      });
    } else {
      setFormData({ ...formData, subjectId: subId });
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/classes', formData);
      if (res.data.success) {
        showToast('Class section created successfully.', 'success');
        setShowModal(false);
        fetchClasses();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating class.', 'error');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Class code ${code} copied to clipboard!`, 'info');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Manage Class Sections & Rosters
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section breakdowns for enrolled courses with unique class join codes and assigned faculty.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center space-x-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Class Section</span>
        </button>
      </div>

      {/* Classes Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Subject & Section</th>
                <th className="py-3 px-4">Class Code</th>
                <th className="py-3 px-4">Term</th>
                <th className="py-3 px-4">Assigned Teachers</th>
                <th className="py-3 px-4">Enrolled Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-400">Loading class sections...</td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">No classes registered yet.</td>
                </tr>
              ) : (
                classes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.color || '#3B82F6' }}
                        />
                        <span className="font-bold text-slate-900">{c.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 pl-4">{c.subject_code} &bull; Section {c.section}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleCopyCode(c.class_code)}
                        className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center space-x-1.5"
                        title="Click to copy class code"
                      >
                        <span>{c.class_code}</span>
                        {copiedCode === c.class_code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">{c.academic_term}</td>
                    <td className="py-3 px-4 text-slate-700">{c.teachers || 'Unassigned'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="primary" size="xs">
                        {c.enrolled_count || 0} Students
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Class */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Class Section">
        <form onSubmit={handleCreateClass} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Subject</label>
            <select
              required
              value={formData.subjectId}
              onChange={(e) => handleSubjectSelect(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
            >
              <option value="">Select subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section Identifier</label>
              <input
                type="text"
                required
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="Sec-A"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Term</label>
              <input
                type="text"
                required
                value={formData.academicTerm}
                onChange={(e) => setFormData({ ...formData, academicTerm: e.target.value })}
                placeholder="Fall 2024"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Section Display Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Artificial Intelligence - Section A"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Class Code (Unique)</label>
            <input
              type="text"
              required
              value={formData.classCode}
              onChange={(e) => setFormData({ ...formData, classCode: e.target.value })}
              placeholder="AI-SEC-A-01"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono uppercase"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Class Section
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

