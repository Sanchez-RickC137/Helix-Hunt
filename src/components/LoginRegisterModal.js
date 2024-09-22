import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { addUser, getUser } from '../database/db';

const LoginRegisterModal = ({ isOpen, onClose, isDarkMode, onLoginSuccess }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset fields when modal is closed
      setUsername('');
      setPassword('');
      setError('');
      setIsLoginView(true);
    }
  }, [isOpen]);

  const validateUsername = (value) => {
    if (value.length < 6 || value.length > 20) {
      return 'Username must be between 6 and 20 characters';
    }
    return '';
  };

  const validatePassword = (value) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
    if (!regex.test(value)) {
      return 'Password must be 8-16 characters and include uppercase, lowercase, number, and symbol';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);

    if (usernameError || passwordError) {
      setError(usernameError || passwordError);
      return;
    }

    try {
      if (isLoginView) {
        const user = await getUser(username);
        if (user && user.password === password) { // In a real app, use proper password comparison
          console.log("Login successful");
          onLoginSuccess(user); // Pass the entire user object
          onClose();
        } else {
          setError('Invalid username or password');
        }
      } else {
        const existingUser = await getUser(username);
        if (existingUser) {
          setError('Username already exists');
        } else {
          const userId = await addUser(username, password);
          const newUser = { id: userId, username, password };
          console.log("Registration successful");
          onLoginSuccess(newUser); // Pass the new user object
          onClose();
        }
      }
    } catch (error) {
      console.error('Error during login/register:', error);
      setError('An error occurred. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`relative w-full max-w-2xl ${isDarkMode ? 'bg-gray-800/40' : 'bg-white/40'} backdrop-blur-md rounded-lg shadow-lg overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
        >
          <X size={24} />
        </button>
        <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: isLoginView ? 'translateX(0)' : 'translateX(-100%)' }}>
          <div className="w-full flex-shrink-0">
            <form onSubmit={handleSubmit} className="p-12 space-y-6">
              <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {isLoginView ? 'Login' : 'Register'}
              </h2>
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700/30 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white/30 border-gray-300 text-gray-800 placeholder-gray-500'
                  } backdrop-blur-sm`}
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700/30 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white/30 border-gray-300 text-gray-800 placeholder-gray-500'
                  } backdrop-blur-sm`}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors text-lg font-semibold"
              >
                {isLoginView ? 'Login' : 'Register'}
              </button>
            </form>
          </div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <button 
            onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
            className={`text-sm ${isDarkMode ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-800'} font-semibold`}
          >
            {isLoginView ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRegisterModal;