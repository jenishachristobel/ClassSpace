import React from 'react';
import { User, Mail, Users, School, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';

export default function TeacherProfile() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Faculty Member Profile
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Instructor credentials, employee identification, and authorized teaching load.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center uppercase shadow-md shadow-indigo-500/20">
            {user?.firstName?.[0] || 'T'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {user?.designation ? `${user.designation} ` : ''}{user?.name}
            </h2>
            <div className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</div>
            <div className="mt-2">
              <Badge variant="indigo" size="xs">
                Instructor &bull; Active Faculty Status
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Faculty Employee ID
            </span>
            <span className="font-mono font-bold text-slate-800 text-sm">{user?.employeeId || 'EMP-T-101'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Academic Department
            </span>
            <span className="font-bold text-slate-800 text-sm">{user?.department || 'Computer Science'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Academic Rank
            </span>
            <span className="font-bold text-slate-800 text-sm">{user?.designation || 'Associate Professor'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Assigned Subjects Count
            </span>
            <span className="font-bold text-slate-800 text-sm">{user?.assignedSubjectsCount || 2} Courses</span>
          </div>
        </div>
      </div>
    </div>
  );
}

