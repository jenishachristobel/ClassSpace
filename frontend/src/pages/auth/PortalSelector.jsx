import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Users, Shield, ArrowRight, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PortalSelector() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'teacher') navigate('/teacher/dashboard');
      else if (user.role === 'student') navigate('/student/dashboard');
    }
  }, [user, navigate]);

  const portals = [
    {
      title: 'Student Portal',
      desc: 'Access your enrolled courses, submit assignment documents, review feedback, and check published grades.',
      path: '/login/student',
      icon: GraduationCap,
      color: 'from-blue-600 to-cyan-600',
      badge: '@karunya.edu.in Verified',
    },
    {
      title: 'Teacher Portal',
      desc: 'Manage your authorized subjects, publish assignments, review submissions, and run AI plagiarism analysis.',
      path: '/login/teacher',
      icon: Users,
      color: 'from-indigo-600 to-purple-600',
      badge: 'Authorized Faculty Only',
    },
    {
      title: 'Administrator Portal',
      desc: 'Central control: Manage accounts, subjects, teacher assignments, student enrollments, and audit logs.',
      path: '/login/admin',
      icon: Shield,
      color: 'from-slate-800 to-slate-900',
      badge: 'Central Administrator',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-blue-500/20">
              C
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">ClassSpace</span>
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block -mt-1">Centralized Academic Portal</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/login/student"
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              Sign In
            </Link>
            <Link
              to="/login/admin"
              className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition"
            >
              Admin Gateway
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Academic Pairing: Centralized Classroom + AI Plagiarism Checker</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight max-w-3xl leading-tight sm:leading-tight mb-4">
          Centralized Classroom Management with Role-Based Architecture
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mb-12">
          Select your portal to log in using your registered institutional email. Role permissions, course ownership, and document access are enforced directly by the backend.
        </p>

        {/* 3 Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl text-left">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.title}
                className="bg-white rounded-3xl border border-slate-200 p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${portal.color} flex items-center justify-center text-white shadow-md shadow-blue-500/10`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
                      {portal.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition">
                    {portal.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    {portal.desc}
                  </p>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 mb-3 flex items-center">
                    <span className="font-semibold text-slate-700 mr-1.5">Authorized Domain:</span>
                    <span className="text-slate-600 font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {portal.badge}
                    </span>
                  </div>

                  <Link
                    to={portal.path}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-blue-600 hover:text-white transition flex items-center justify-center space-x-1.5 group-hover:bg-blue-600 group-hover:text-white shadow-sm"
                  >
                    <span>Enter {portal.title.replace(' Portal', '')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        ClassSpace Centralized Academic Platform &bull; Academic Pairing Demo &bull; Node.js + Express + React + SQLite/PostgreSQL
      </footer>
    </div>
  );
}

