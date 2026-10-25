import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Award, CheckCircle, Clock } from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';

export default function AllAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/admin/all-assignments');
        if (res.data.success) {
          setAssignments(res.data.assignments || []);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          All Platform Assignments
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Centralized overview of active coursework, due dates, submission volumes, and grading progress across all subjects.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Assignment Title</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Instructor</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Max Marks</th>
                <th className="py-3 px-4">Submissions</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">Loading assignments...</td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">No assignments created yet.</td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">{a.title}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{a.subject_code}</span>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{a.subject_name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{a.teacher_name}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(a.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{a.max_marks} pts</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{a.submission_count || 0}</span>
                      <span className="text-slate-400 text-[10px] ml-1">({a.graded_count || 0} graded)</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="success" size="xs">
                        {a.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

