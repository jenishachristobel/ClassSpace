import React from 'react';
import { NavLink } from 'react-router-dom';
import { GraduationCap, Users, Shield, Sparkles, BookOpen, Award, CheckCircle2, BookmarkCheck } from 'lucide-react';

export default function AuthLayout({ title, subtitle, portal, children }) {
  const portals = [
    { name: 'Student Portal', path: '/login/student', icon: GraduationCap, key: 'student' },
    { name: 'Faculty Portal', path: '/login/teacher', icon: Users, key: 'teacher' },
    { name: 'Admin Portal', path: '/login/admin', icon: Shield, key: 'admin' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/60 via-slate-50 to-purple-50/50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-100 relative overflow-hidden">
      
      {/* Decorative Subtle Academic SVG Elements in Background */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-indigo-100/30 rounded-full blur-2xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-200/80 overflow-hidden max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 min-h-[620px] relative z-10">
        
        {/* Left Academic Showcase Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          
          {/* Subtle Educational Pattern Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
              <defs>
                <pattern id="academic-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                  <circle cx="20" cy="20" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#academic-grid)" />
            </svg>
          </div>

          <div className="relative z-10">
            {/* ClassSpace Brand */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center font-black text-2xl shadow-inner text-white">
                C
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white block">
                  ClassSpace
                </span>
                <span className="text-[11px] font-medium tracking-wide text-blue-100 uppercase">
                  Educational Platform
                </span>
              </div>
            </div>

            {/* Platform Highlights */}
            <div className="space-y-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-blue-50 border border-white/20 backdrop-blur">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-200" />
                Next-Gen Academic Hub
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
                Empowering connected classrooms with real-time academic workflows.
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Persistent database records, institutional authentication, course management, digital submissions, and AI plagiarism analysis.
              </p>
            </div>
          </div>

          {/* Academic Features Badges */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/20 space-y-2.5">
            <div className="flex items-center space-x-2 text-xs text-blue-100">
              <CheckCircle2 className="w-4 h-4 text-blue-300 shrink-0" />
              <span>Institutional Single Sign-On (@karunya.edu.in)</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-blue-100">
              <BookmarkCheck className="w-4 h-4 text-blue-300 shrink-0" />
              <span>Submission Version Control & Timestamps</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-blue-100">
              <Award className="w-4 h-4 text-blue-300 shrink-0" />
              <span>Role-Isolated Student, Faculty & Admin Portals</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          
          {/* Portal Switcher Tabs */}
          <div className="flex rounded-2xl bg-slate-100/90 p-1.5 mb-7 border border-slate-200/70">
            {portals.map((p) => {
              const Icon = p.icon;
              const isActive = portal === p.key;
              return (
                <NavLink
                  key={p.key}
                  to={p.path}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{p.name}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Child Form Content */}
          <div>
            {children}
          </div>

          {/* Footer Institutional Assurance */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-400">
            <span>ClassSpace Educational Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}
