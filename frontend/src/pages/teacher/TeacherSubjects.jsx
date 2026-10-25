import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, FileText, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';

export default function TeacherSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/teacher/subjects');
        if (res.data.success) {
          setSubjects(res.data.subjects || []);
        }
      } catch (err) {
        console.error('Error fetching teacher subjects:', err);
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
            My Authorized Teaching Subjects
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Displaying only subjects assigned to you by the administrator. Access to other subjects is strictly restricted by backend security policies.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="indigo" size="sm">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Backend Enforced
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading authorized subjects...</div>
      ) : subjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No Teaching Assignments Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            The administrator has not assigned you to any course subjects yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Header Banner */}
                <div
                  className="p-5 text-white flex items-center justify-between"
                  style={{ backgroundColor: sub.color || '#6366F1' }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-base">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-mono font-bold text-[11px] uppercase tracking-wider block opacity-90">
                        {sub.code}
                      </span>
                      <h3 className="font-extrabold text-base leading-tight group-hover:underline">
                        {sub.name}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/20 backdrop-blur">
                    {sub.credits} Credits
                  </span>
                </div>

                {/* Details */}
                <div className="p-5 space-y-4">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {sub.description || 'Authorized teaching course curriculum and assessment.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Enrolled Students</span>
                      <span className="font-bold text-slate-800">{sub.student_count || 0}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                      <span className="text-amber-700 text-[11px] font-medium">Pending Grading</span>
                      <span className="font-extrabold text-amber-700">{sub.pending_grading_count || 0}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                    <span>Active Assignments: <strong className="text-slate-800">{sub.assignment_count || 0}</strong></span>
                    <span className="text-[10px] text-slate-400">{sub.department}</span>
                  </div>
                </div>
              </div>

              {/* View Subject Button */}
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <Link
                  to={`/teacher/subjects/${sub.id}`}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center justify-center space-x-2 shadow-sm"
                >
                  <span>Manage Subject & Roster</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

