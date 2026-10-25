import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import ForgotPasswordModal from './ForgotPasswordModal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function TeacherLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your registered instructor email and password.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email.trim().toLowerCase(), password, 'teacher');
      if (result.success) {
        showToast(`Welcome back, Professor ${result.user.lastName || result.user.name}!`, 'success');
        navigate(result.redirectUrl || '/teacher/dashboard');
      } else {
        setErrorMessage(result.message || 'Authentication failed. Please verify your faculty credentials.');
      }
    } catch (err) {
      let msg = err.response?.data?.message;
      if (!msg) {
        if (!err.response || err.code === 'ERR_NETWORK' || err.response?.status === 502 || err.response?.status === 504 || (err.response?.status === 500 && (typeof err.response?.data === 'string' || !err.response?.data?.message))) {
          msg = 'Backend server is unreachable. Please ensure the ClassSpace API is active on port 5000.';
        } else {
          msg = 'Login failed. Please verify your credentials.';
        }
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Faculty Portal Login"
      subtitle="Sign in with your authorized faculty credentials to manage your assigned courses, review submissions, and publish grades."
      portal="teacher"
    >
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span className="font-medium leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Registered Faculty Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. prof.vance@classspace.edu"
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Account Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer mt-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying Faculty Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to Faculty Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Information Callout */}
      <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-2.5 text-[11px] text-slate-500">
        <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          Faculty accounts are managed and provisioned centrally. If you require course reassignments or password resets, contact your department administrator.
        </span>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </AuthLayout>
  );
}
