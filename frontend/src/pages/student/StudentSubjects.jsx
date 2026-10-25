import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, FileText, Clock, Bell, ArrowRight } from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';

export default function StudentSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/student/subjects');
        if (res.data.success) {
          setSubjects(res.data.subjects || []);
        }
      } catch (err) {
        console.error('Error fetching student subjects:', err);
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
          My Enrolled Subjects
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Courses assigned to you by the platform administrator. Click any card to view lecture notes, announcements, and submit assignments.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading your subjects...</div>
      ) : subjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No Enrolled Courses Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Please contact the central administrator to enroll in your semester subjects.
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
                  style={{ backgroundColor: sub.color || '#3B82F6' }}
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

                {/* Body Details */}
                <div className="p-5 space-y-4">
                  {/* Teacher Info */}
                  <div className="flex items-center text-xs text-slate-600">
                    <Users className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Instructor: <strong className="text-slate-800">{sub.teacher_name || 'Department Faculty'}</strong>
                    </span>
                  </div>

                  {/* Counts */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Assignments</span>
                      <span className="font-bold text-slate-800">{sub.assignment_count || 0}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                      <span className="text-amber-700 text-[11px] font-medium">Pending</span>
                      <span className="font-extrabold text-amber-700">{sub.pending_count || 0}</span>
                    </div>
                  </div>

                  {/* Latest Announcement */}
                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs">
                    <div className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      <Bell className="w-3 h-3 text-blue-500" />
                      <span>Latest Announcement</span>
                    </div>
                    <p className="text-slate-700 font-medium line-clamp-2">
                      {sub.latest_announcement || 'No announcements posted yet for this course.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* View Subject Button */}
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <Link
                  to={`/student/subjects/${sub.id}`}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center space-x-2 shadow-sm"
                >
                  <span>View Subject Materials & Work</span>
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

