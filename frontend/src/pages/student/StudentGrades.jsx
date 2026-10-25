import React, { useState, useEffect } from 'react';
import { Award, BookOpen, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';

export default function StudentGrades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/student/grades');
        if (res.data.success) {
          setGrades(res.data.grades || []);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalPointsEarned = grades.reduce((acc, curr) => acc + curr.marks_obtained, 0);
  const totalPointsPossible = grades.reduce((acc, curr) => acc + curr.max_marks, 0);
  const averagePercentage =
    totalPointsPossible > 0 ? Math.round((totalPointsEarned / totalPointsPossible) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          My Academic Grades & Feedback
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Officially published assignment grades and instructor rubric evaluations.
        </p>
      </div>

      {/* Aggregate Overview Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Overall Average
          </span>
          <div className="text-3xl font-black text-slate-900">{averagePercentage}%</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Cumulative Average</span>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Total Points Earned
          </span>
          <div className="text-3xl font-black text-slate-900">
            {totalPointsEarned} <span className="text-sm font-semibold text-slate-400">/ {totalPointsPossible}</span>
          </div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">Published Coursework</span>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Evaluations Completed
          </span>
          <div className="text-3xl font-black text-slate-900">{grades.length}</div>
          <span className="text-[11px] text-purple-600 font-semibold mt-1 block">Graded Assignments</span>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Assignment</th>
                <th className="py-3 px-4">Instructor</th>
                <th className="py-3 px-4">Marks Obtained</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400">Loading your grades...</td>
                </tr>
              ) : grades.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    No grades published yet. Once instructors publish your grades, they will appear here.
                  </td>
                </tr>
              ) : (
                grades.map((g) => {
                  const pct = Math.round((g.marks_obtained / g.max_marks) * 100);
                  return (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{g.code}</span>
                        <div className="text-[10px] text-slate-400">{g.subject_name}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs">{g.assignment_title}</td>
                      <td className="py-3 px-4 text-slate-600">{g.teacher_name}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {g.marks_obtained} <span className="text-slate-400 font-normal">/ {g.max_marks}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">{pct}%</td>
                      <td className="py-3 px-4 text-slate-600 italic max-w-xs">
                        {g.feedback ? `"${g.feedback}"` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

