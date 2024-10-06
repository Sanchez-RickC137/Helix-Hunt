import React, { useState } from 'react';
import { X } from 'lucide-react';
import { resetPassword } from '../../database/db';
import { useThemeConstants } from '../Page/ThemeConstants';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const themeConstants = useThemeConstants();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await resetPassword(username, newPassword);
      setMessage('Password reset successfully. You can now login with your new password.');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      setError('Failed to reset password. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`relative w-full max-w-md ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <h2 className={`text-2xl font-bold mb-4 ${themeConstants.headingTextColor}`}>
            Reset Password
          </h2>
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor}`}
              required
            />
          </div>
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-500 text-sm">{message}</p>}
          <button
            type="submit"
            className={`w-full ${themeConstants.buttonBackgroundColor} text-white py-2 rounded hover:${themeConstants.buttonHoverColor} transition-colors`}
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;