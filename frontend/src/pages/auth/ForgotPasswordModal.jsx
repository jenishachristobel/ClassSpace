import React, { useState } from 'react';
import Modal from '../../components/common/Modal';
import api from '../../api/client';
import { useNotification } from '../../context/NotificationContext';

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const { showToast } = useNotification();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setResultMessage(null);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setResultMessage(res.data.message);
        showToast('Password reset instructions generated.', 'success');
      }
    } catch (err) {
      showToast('Error processing request.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Account Password">
      <p className="text-xs text-slate-500 mb-4">
        Enter your registered institutional email. In this academic environment, password reset requests are recorded in the central audit log.
      </p>

      {resultMessage ? (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 text-xs space-y-2">
          <p className="font-semibold">{resultMessage}</p>
          <p className="text-slate-600">
            For demonstration testing, you can use the standard demo credentials:
            <br />
            <strong>Student:</strong> Student@123 &bull; <strong>Teacher:</strong> Teacher@123 &bull; <strong>Admin:</strong> Admin@123
          </p>
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition"
            >
              Return to Login
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alex.student@classspace.edu"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

