/**
 * Forgot password modal component
 * Handles password reset workflow
 * Includes email verification and new password setup
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Callback to close modal
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { useThemeConstants } from '../Page/ThemeConstants';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('email'); // email -> verify -> reset
  
  const themeConstants = useThemeConstants();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await axiosInstance.post('/api/check-email', { email });
      if (response.data.exists) {
        setStep('verify');
        setMessage('A verification code has been sent to your email.');
      } else {
        setError('No account found with this email.');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'An error occurred. Please try again.');
    }
  };

  const handleCodeVerification = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      await axiosInstance.post('/api/verify-reset-code', { 
        email, 
        code: verificationCode 
      });
      setStep('reset');
      setMessage('Code verified. Please enter your new password.');
    } catch (error) {
      setError(error.response?.data?.error || 'Invalid or expired code.');
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
      await axiosInstance.post('/api/reset-password', {
        email,
        code: verificationCode,
        newPassword
      });
      setMessage('Password has been reset successfully.');
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to reset password.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`relative w-full max-w-md ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg p-8`}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>

        <h2 className={`text-2xl font-bold mb-6 ${themeConstants.headingTextColor}`}>
          {step === 'email' && 'Reset Password'}
          {step === 'verify' && 'Enter Verification Code'}
          {step === 'reset' && 'Set New Password'}
        </h2>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={`w-full p-3 rounded-lg ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor}`}
              required
            />
            <button
              type="submit"
              className={`w-full ${themeConstants.buttonBackgroundColor} text-white py-3 rounded-lg hover:${themeConstants.buttonHoverColor} transition-colors`}
            >
              Send Reset Code
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleCodeVerification} className="space-y-4">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className={`w-full p-3 rounded-lg ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor}`}
              required
              maxLength={6}
            />
            <button
              type="submit"
              className={`w-full ${themeConstants.buttonBackgroundColor} text-white py-3 rounded-lg hover:${themeConstants.buttonHoverColor} transition-colors`}
            >
              Verify Code
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className={`w-full p-3 rounded-lg ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor}`}
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={`w-full p-3 rounded-lg ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor}`}
              required
            />
            <button
              type="submit"
              className={`w-full ${themeConstants.buttonBackgroundColor} text-white py-3 rounded-lg hover:${themeConstants.buttonHoverColor} transition-colors`}
            >
              Reset Password
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-red-500 text-sm">{error}</p>
        )}
        {message && (
          <p className="mt-4 text-green-500 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordModal;