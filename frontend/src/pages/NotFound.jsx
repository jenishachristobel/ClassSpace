import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="bg-white rounded-3xl p-10 max-w-md w-full border border-slate-200 shadow-sm space-y-4">
        <div className="text-5xl font-black text-slate-800 tracking-tight">404</div>
        <h1 className="text-lg font-bold text-slate-900">Page Not Found</h1>
        <p className="text-xs text-slate-500">
          The requested classroom workspace or page does not exist or has been relocated.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Return to ClassSpace Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

