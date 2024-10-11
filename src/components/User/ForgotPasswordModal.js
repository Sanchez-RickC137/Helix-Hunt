import React, { useState } from 'react';
import { X } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { useThemeConstants } from '../Page/ThemeConstants';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const themeConstants = useThemeConstants();

  const handleEmailCheck = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await axiosInstance.post('/api/check-email', { email });
      if (response.data.exists) {
        setEmailVerified(true);
        setMessage('Email verified. Please enter your new password.');
      } else {
        setError('No account found with this email.');
      }
    } catch (error) {
      setError('An error occurred. Please try again later.');
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    try {
      await axiosInstance.post('/api/reset-password', { email, newPassword });
      setMessage('Password has been reset successfully.');
      setTimeout(() => onClose(), 3000);
    } catch (error) {
      setError('Failed to reset password. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`relative w-full max-w-md ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg overflow-hidden`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
        <form onSubmit={emailVerified ? handlePasswordReset : handleEmailCheck} className="p-8 space-y-4">
          <h2 className={`text-2xl font-bold mb-4 ${themeConstants.headingTextColor}`}>
            {emailVerified ? 'Reset Password' : 'Verify Email'}
          </h2>
          {!emailVerified && (
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor}`}
                required
              />
            </div>
          )}
          {emailVerified && (
            <>
              <div>
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor}`}
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor}`}
                  required
                />
              </div>
            </>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-500 text-sm">{message}</p>}
          <button
            type="submit"
            className={`w-full ${themeConstants.buttonBackgroundColor} text-white py-2 rounded hover:${themeConstants.buttonHoverColor} transition-colors`}
          >
            {emailVerified ? 'Reset Password' : 'Verify Email'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;