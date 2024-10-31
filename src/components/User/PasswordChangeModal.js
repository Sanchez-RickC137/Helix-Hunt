/**
 * Password change modal component
 * Allows users to securely update their password
 * Includes validation and success/error feedback
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Function to close the modal
 * @param {string} props.username - Current user's username
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';
import axiosInstance from '../../utils/axiosInstance';

const PasswordChangeModal = ({ isOpen, onClose, username }) => {
  // State management
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const themeConstants = useThemeConstants();

  /**
   * Handles password change form submission
   * Validates passwords and sends update request
   * @param {Event} e - Form submission event
   */
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // Validate password match
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    try {
      const response = await axiosInstance.post('/api/change-password', {
        username,
        currentPassword,
        newPassword
      });
      console.log('Password change response:', response);
      
      // Show success message and reset form
      setMessage(response.data.message || 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Close modal after delay
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Password change error:', err);
      setError(err.response?.data?.error || 'Failed to update password. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeConstants.sectionBackgroundColor} p-6 rounded-lg shadow-xl max-w-md w-full`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Change Password</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block mb-1">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border`}
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block mb-1">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border`}
              required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block mb-1">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border`}
              required
            />
          </div>
          <button
            type="submit"
            className={`w-full px-4 py-2 rounded ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
          >
            Change Password
          </button>
        </form>
        {message && <p className="mt-4 text-green-500">{message}</p>}
        {error && <p className="mt-4 text-red-500">{error}</p>}
      </div>
    </div>
  );
};

export default PasswordChangeModal;