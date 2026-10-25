import React, { useState, useEffect } from 'react';
import { Award, BookOpen, Users, Download } from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';

export default function TeacherGradebook() {
  const [gradebook, setGradebook] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/teacher/gradebook');
        if (res.data.success) {
          setGradebook(res.data.gradebook || []);
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
          Faculty Gradebook
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Master score matrix across all authorized subjects and students.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Assignment</th>
                <th className="py-3 px-4">Submission Status</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Publish Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">Loading gradebook...</td>
                </tr>
              ) : gradebook.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">No student enrollments found.</td>
                </tr>
              ) : (
                gradebook.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">{row.subject_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{row.student_name}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">{row.student_code}</td>
                    <td className="py-3 px-4 text-slate-700">{row.assignment_title || '—'}</td>
                    <td className="py-3 px-4">
                      {row.submission_id ? (
                        <Badge variant="success" size="xs">Submitted</Badge>
                      ) : (
                        <Badge variant="default" size="xs">Not Submitted</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {row.marks_obtained !== null && row.marks_obtained !== undefined ? (
                        <span>{row.marks_obtained} / {row.max_marks}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {row.is_published === 1 ? (
                        <span className="text-emerald-600 font-bold text-[11px]">Published</span>
                      ) : row.marks_obtained !== null && row.marks_obtained !== undefined ? (
                        <span className="text-amber-600 font-medium text-[11px]">Draft</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Ungraded</span>
                      )}
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

