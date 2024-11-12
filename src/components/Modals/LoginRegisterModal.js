import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';
import { useUser } from '../../contexts/UserContext';
import axiosInstance from '../../utils/axiosInstance';

const LoginRegisterModal = ({ isOpen, onClose, onForgotPassword }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useUser();
  const themeConstants = useThemeConstants();

  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setEmail('');
      setPassword('');
      setError('');
      setIsLoginView(true);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLoginView) {
        const response = await axiosInstance.post('/api/login', { username, password });
        await login(response.data.user, response.data.token);
        onClose();
      } else {
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

        {/* Content container with sliding animation */}
        <div className="relative w-full h-[360px]">
          {/* Sliding panels container */}
          <div 
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ transform: isLoginView ? 'translateX(0%)' : 'translateX(-100%)' }}
          >
            {/* Login Panel */}
            <div className="min-w-full flex h-full">
              {/* Left Section - Title and Register Link */}
              <div className="w-[40%] p-8 flex flex-col relative">
                <div className="flex items-center justify-center flex-1">
                  <h2 className={`text-3xl font-bold ${themeConstants.headingTextColor}`}>
                    Login
                  </h2>
                </div>
                <div className="absolute bottom-8 left-0 w-full px-8">
                  <button 
                    onClick={() => { setIsLoginView(false); setError(''); }}
                    className={`w-full text-sm ${themeConstants.linkTextColor} ${themeConstants.linkHoverColor} font-semibold text-center`}
                  >
                    Don't have an account? Register
                  </button>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="w-px bg-gray-300 dark:bg-gray-600" />

              {/* Right Section - Login Form */}
              <div className="w-[60%] p-8 flex items-center">
                <form onSubmit={handleSubmit} className="w-full space-y-6">
                  <div>
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full p-3 rounded-lg border ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor} ${themeConstants.inputPlaceholderColor}`}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full p-3 rounded-lg border ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor} ${themeConstants.inputPlaceholderColor}`}
                      required
                    />
                  </div>
                  {error && isLoginView && <p className="text-red-500 text-sm">{error}</p>}
                  <button
                    type="submit"
                    className={`w-full ${themeConstants.buttonBackgroundColor} text-white py-3 rounded-lg hover:${themeConstants.buttonHoverColor} transition-colors text-lg font-semibold`}
                  >
                    Login
                  </button>
                  {onForgotPassword && (
                    <button 
                      type="button"
                      onClick={onForgotPassword}
                      className={`w-full text-sm ${themeConstants.linkTextColor} ${themeConstants.linkHoverColor} font-semibold text-center`}
                    >
                      Forgot Password?
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* Register Panel */}
            <div className="min-w-full flex h-full">
              {/* Left Section - Register Form */}
              <div className="w-[60%] p-8 flex items-center">
                <form onSubmit={handleSubmit} className="w-full space-y-6">
                  <div>
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full p-3 rounded-lg border ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor} ${themeConstants.inputPlaceholderColor}`}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full p-3 rounded-lg border ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor} ${themeConstants.inputPlaceholderColor}`}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full p-3 rounded-lg border ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} ${themeConstants.inputTextColor} ${themeConstants.inputPlaceholderColor}`}
                      required
                    />
                  </div>
                  {error && !isLoginView && <p className="text-red-500 text-sm">{error}</p>}
                  <button
                    type="submit"
                    className={`w-full ${themeConstants.buttonBackgroundColor} text-white py-3 rounded-lg hover:${themeConstants.buttonHoverColor} transition-colors text-lg font-semibold`}
                  >
                    Register
                  </button>
                </form>
              </div>

              {/* Vertical Divider */}
              <div className="w-px bg-gray-300 dark:bg-gray-600" />

              {/* Right Section - Title and Login Link */}
              <div className="w-[40%] p-8 flex flex-col relative">
                <div className="flex items-center justify-center flex-1">
                  <h2 className={`text-3xl font-bold ${themeConstants.headingTextColor}`}>
                    Register
                  </h2>
                </div>
                <div className="absolute bottom-8 left-0 w-full px-8">
                  <button 
                    onClick={() => { setIsLoginView(true); setError(''); }}
                    className={`w-full text-sm ${themeConstants.linkTextColor} ${themeConstants.linkHoverColor} font-semibold text-center`}
                  >
                    Already have an account? Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRegisterModal;