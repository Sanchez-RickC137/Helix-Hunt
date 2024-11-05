/**
 * Combined login and registration modal component
 * Handles user authentication and new account creation
 * Provides smooth transition between login and registration views
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onForgotPassword - Handler for forgot password action
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';
import { useUser } from '../../contexts/UserContext';
import axiosInstance from '../../utils/axiosInstance';

const LoginRegisterModal = ({ isOpen, onClose, onForgotPassword }) => {
  // State management
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useUser();
  const themeConstants = useThemeConstants();

  /**
   * Reset form state when modal closes
   */
  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setEmail('');
      setPassword('');
      setError('');
      setIsLoginView(true);
    }
  }, [isOpen]);

  /**
   * Handles form submission for both login and registration
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLoginView) {
        // Handle login
        const response = await axiosInstance.post('/api/login', { username, password });
        await login(response.data.user, response.data.token);
        onClose();
      } else {
        // Handle registration
        await axiosInstance.post('/api/register', { username, email, password });
        const loginResponse = await axiosInstance.post('/api/login', { username, password });
        await login(loginResponse.data.user, loginResponse.data.token);
        onClose();
      }
    } catch (error) {
      console.error('Error during login/register:', error);
      setError(error.response?.data?.error || 'An error occurred. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`relative w-full max-w-2xl ${themeConstants.modalBackgroundColor} backdrop-blur-md rounded-lg shadow-lg overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
        >
          <X size={24} />
        </button>
        <div className="flex transition-transform duration-300 ease-in-out" style={{ width: '200%', transform: isLoginView ? 'translateX(0)' : 'translateX(-50%)' }}>
          <div className="w-1/2 flex-shrink-0">
            <form onSubmit={handleSubmit} className="p-12 space-y-6">
              <h2 className={`text-3xl font-bold mb-6 ${themeConstants.headingTextColor}`}>
                {isLoginView ? 'Login' : 'Register'}
              </h2>
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor} ${themeConstants.inputPlaceholderColor} backdrop-blur-sm`}
                  required
                />
              </div>
              {!isLoginView && (
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor} ${themeConstants.inputPlaceholderColor} backdrop-blur-sm`}
                    required
                  />
                </div>
              )}
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor} ${themeConstants.inputPlaceholderColor} backdrop-blur-sm`}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className={`w-full ${themeConstants.buttonBackgroundColor} text-white py-3 rounded-lg hover:${themeConstants.buttonHoverColor} transition-colors text-lg font-semibold`}
              >
                {isLoginView ? 'Login' : 'Register'}
              </button>
              {isLoginView && onForgotPassword && (
                <div className="text-center">
                  <button 
                    type="button"
                    onClick={onForgotPassword}
                    className={`text-sm ${themeConstants.linkTextColor} ${themeConstants.linkHoverColor} font-semibold`}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </form>
          </div>
          <div className="w-1/2 flex-shrink-0">
            {/* Register form content (if needed) */}
          </div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <button 
            onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
            className={`text-sm ${themeConstants.linkTextColor} ${themeConstants.linkHoverColor} font-semibold`}
          >
            {isLoginView ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRegisterModal;