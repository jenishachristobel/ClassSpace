import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Building2,
  KeyRound,
  ShieldCheck,
  Send,
  RefreshCw
} from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import ForgotPasswordModal from './ForgotPasswordModal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../api/client';

export default function StudentLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useNotification();

  // Mode: 'institutional' (Karunya Google / OTP) or 'password' (Registered credentials)
  const [authMode, setAuthMode] = useState('institutional');

  // Institutional Login States
  const [instEmail, setInstEmail] = useState('');
  const [instStep, setInstStep] = useState('email'); // 'email' or 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState(null);

  // Standard Password Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Common States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const institutionalDomain = import.meta.env.VITE_INSTITUTIONAL_DOMAIN || 'karunya.edu.in';

  // Initialize official Google Identity Services (GIS) if client ID is configured
  useEffect(() => {
    if (!googleClientId || googleClientId.includes('your-google-oauth-client-id')) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      try {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCallback,
            hosted_domain: institutionalDomain
          });
          const btnDiv = document.getElementById('googleSignInBtn');
          if (btnDiv) {
            window.google.accounts.id.renderButton(btnDiv, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              shape: 'rectangular',
              text: 'continue_with'
            });
          }
        }
      } catch (e) {
        console.warn('Google Identity Services notice:', e);
      }
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, [googleClientId, authMode]);

  const handleGoogleCallback = async (response) => {
    if (!response?.credential) {
      setErrorMessage('Google authentication did not return a valid credential.');
      return;
    }
    await processGoogleLogin(response.credential);
  };

  const processGoogleLogin = async (idToken) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/google-student-login', { idToken });

      if (res.data.success) {
        localStorage.setItem('classspace_token', res.data.token);
        localStorage.setItem('classspace_user', JSON.stringify(res.data.user));

        if (res.data.isNewUser) {
          showToast(`Welcome to ClassSpace, ${res.data.user.name}! Your student profile has been provisioned.`, 'success');
        } else {
          showToast(`Welcome back, ${res.data.user.firstName}!`, 'success');
        }

        window.location.href = res.data.redirectUrl || '/student/dashboard';
      } else {
        setErrorMessage(res.data.message || 'Google authentication failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication failed. Please ensure your account belongs to @karunya.edu.in.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Institutional Verification: Request 6-digit Code
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = instEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your institutional email address.');
      return;
    }

    // Client-side instant domain feedback
    if (!cleanEmail.endsWith(`@${institutionalDomain}`)) {
      setErrorMessage(`Personal or unauthorized email domains are rejected. Please use your official Karunya email ending in @${institutionalDomain}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/request-institutional-otp', { email: cleanEmail });
      if (res.data.success) {
        setInstStep('otp');
        if (res.data.devCode) {
          setDevCodeHint(res.data.devCode);
        }
        showToast('Verification code generated. Please enter the code below to complete sign-in.', 'success');
      } else {
        setErrorMessage(res.data.message || 'Failed to generate verification code.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error requesting verification code.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Institutional Verification: Validate Code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-institutional-otp', {
        email: instEmail.trim().toLowerCase(),
        code: otpCode.trim()
      });

      if (res.data.success) {
        localStorage.setItem('classspace_token', res.data.token);
        localStorage.setItem('classspace_user', JSON.stringify(res.data.user));

        if (res.data.isNewUser) {
          showToast(`Welcome to ClassSpace, ${res.data.user.name}! Student account provisioned.`, 'success');
        } else {
          showToast(`Welcome back, ${res.data.user.firstName}!`, 'success');
        }

        window.location.href = res.data.redirectUrl || '/student/dashboard';
      } else {
        setErrorMessage(res.data.message || 'Verification failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired verification code.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Standard Password Login Handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your registered student email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password, 'student');
      if (result.success) {
        showToast(`Welcome back, ${result.user.firstName}!`, 'success');
        navigate(result.redirectUrl || '/student/dashboard');
      } else {
        setErrorMessage(result.message || 'Authentication failed. Please verify your credentials.');
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
      title="Student Portal Login"
      subtitle="Sign in with your verified institutional email or academic credentials to access your enrolled courses."
      portal="student"
    >
      {/* Mode Selector Tabs */}
      <div className="flex rounded-xl bg-slate-100/90 p-1 mb-5 border border-slate-200/80">
        <button
          type="button"
          onClick={() => {
            setAuthMode('institutional');
            setErrorMessage(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            authMode === 'institutional'
              ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Institutional Account (@karunya.edu.in)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('password');
            setErrorMessage(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            authMode === 'password'
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-slate-500" />
          <span>Academic Password</span>
        </button>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span className="font-medium leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* MODE 1: REAL INSTITUTIONAL STUDENT LOGIN (@karunya.edu.in) */}
      {authMode === 'institutional' ? (
        <div className="space-y-4">
          {/* Institution Domain Callout */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs flex items-center space-x-3">
            <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="text-[11px] leading-tight">
              <strong className="text-slate-900 font-bold">Institutional Single Sign-On</strong>
              <div className="text-blue-700 font-medium mt-0.5">Approved student domain: <span className="font-mono font-bold">@karunya.edu.in</span></div>
            </div>
          </div>

          {/* Official Google Identity Services Container if client ID is configured */}
          {googleClientId && !googleClientId.includes('your-google-oauth-client-id') && (
            <div className="space-y-2">
              <div id="googleSignInBtn" className="w-full flex justify-center"></div>
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Or Sign In via Institutional Code
                </span>
              </div>
            </div>
          )}

          {/* Step 1: Request 6-digit verification code */}
          {instStep === 'email' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={instEmail}
                    onChange={(e) => setInstEmail(e.target.value)}
                    placeholder="e.g. jenishachristobel@karunya.edu.in"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Must end in @karunya.edu.in. Personal domains (@gmail.com, etc.) are strictly rejected.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Institutional Domain...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Step 2: Enter 6-digit verification code */
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Verifying account:</span>
                  <strong className="text-blue-900 font-mono text-xs">{instEmail}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInstStep('email');
                    setOtpCode('');
                    setDevCodeHint(null);
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                >
                  Change Email
                </button>
              </div>

              {devCodeHint && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                  <span>Development Verification Code: <strong>{devCodeHint}</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devCodeHint)}
                    className="text-xs font-bold text-amber-900 underline"
                  >
                    Insert Code
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="w-full text-center tracking-[0.4em] font-mono font-bold text-base bg-slate-50 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying & Loading Courses...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Complete Institutional Sign In</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      ) : (
        /* MODE 2: REGISTERED ACADEMIC PASSWORD LOGIN */
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Registered Student Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex.student@classspace.edu"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition"
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
                placeholder="Enter account password"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Student Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In with Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Security Assurance Callout */}
      <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-2.5 text-[11px] text-slate-500">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          Eligible students authenticating with valid @karunya.edu.in accounts are automatically provisioned with student privileges. Role isolation is cryptographically verified on every request.
        </span>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </AuthLayout>
  );
}
