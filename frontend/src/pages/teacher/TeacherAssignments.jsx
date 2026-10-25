import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, ClipboardList, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';

export default function TeacherAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/teacher/subjects');
        if (res.data.success) {
          const subs = res.data.subjects || [];
          let allA = [];
          for (const s of subs) {
            const subRes = await api.get(`/teacher/subjects/${s.id}`);
            if (subRes.data.success) {
              const enriched = (subRes.data.assignments || []).map(a => ({
                ...a,
                subjectCode: s.code,
                subjectName: s.name,
                subjectColor: s.color
              }));
              allA = [...allA, ...enriched];
            }
          }
          setAssignments(allA);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Assignments Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Course assignments published across your authorized teaching subjects. Select an assignment to review student submissions or run plagiarism checks.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Assignment Title</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Max Marks</th>
                <th className="py-3 px-4">Submissions Received</th>
                <th className="py-3 px-4">Grading Progress</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">Loading assignments...</td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">No assignments created yet.</td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">{a.title}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{a.subjectCode}</div>
                      <div className="text-[10px] text-slate-400">{a.subjectName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(a.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{a.max_marks} pts</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {a.submission_count || 0} Submissions
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="indigo" size="xs">
                        {a.graded_count || 0} / {a.submission_count || 0} Graded
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/teacher/assignments/${a.id}/submissions`}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition inline-flex items-center space-x-1.5 shadow-sm"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Review & Plagiarism</span>
                      </Link>
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

