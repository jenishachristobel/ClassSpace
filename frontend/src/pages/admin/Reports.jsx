import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '../../api/client';
import StatCard from '../../components/common/StatCard';

export default function Reports() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/admin/dashboard-stats');
        if (res.data.success) {
          setData(res.data);
        }
      } catch (e) {}
    }
    load();
  }, []);

  const stats = data?.stats || {};
  const enrollment = data?.enrollmentDistribution || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Academic Analytics & Platform Reports
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          High-level reporting on student enrollment distribution, grading turnaround, and platform engagement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Enrollment Saturation</h3>
              <p className="text-[11px] text-slate-400">Total course seats filled</p>
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-2">
            {enrollment.reduce((acc, curr) => acc + (curr.enrolled_count || 0), 0)} Seats
          </div>
          <p className="text-xs text-slate-500">
            Across {enrollment.length} dynamic curriculum subjects.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Submission Volume</h3>
              <p className="text-[11px] text-slate-400">All submitted assignment files</p>
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-2">
            {stats.totalSubmissions || 0} Files
          </div>
          <p className="text-xs text-slate-500">
            Tracked with timestamped submission versions.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Plagiarism Integrity</h3>
              <p className="text-[11px] text-slate-400">External AI comparative scans</p>
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-2">
            Active
          </div>
          <p className="text-xs text-slate-500">
            JWT launch token mechanism enforced.
          </p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4">Department & Subject Roster Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Subject Code</th>
                <th className="py-2.5 px-3">Subject Title</th>
                <th className="py-2.5 px-3">Enrolled Seats</th>
                <th className="py-2.5 px-3">Active Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrollment.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{sub.code}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{sub.name}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{sub.enrolled_count || 0}</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-medium">Active & Open</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

