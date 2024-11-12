/**
 * Main application header component
 * Provides navigation, authentication controls, and theme toggle
 * Responsive design with mobile menu support
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, HelpCircle, Dna, Sun, Moon, LogOut, Menu, X } from 'lucide-react';
import LoginRegisterModal from '../Modals/LoginRegisterModal';
import ForgotPasswordModal from '../User/ForgotPasswordModal';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

const Header = () => {
  // State management
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Hooks
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { user, login, logout } = useUser();

  /**
   * Toggles mobile menu visibility
   */
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  /**
   * Handles successful login
   * Navigates to account page and closes modal
   * @param {Object} userData - User authentication data
   */
  const handleLoginSuccess = (userData) => {
    login(userData.user, userData.token);
    setIsLoginModalOpen(false);
    navigate('/account');
  };

  /**
   * Handles user logout
   * Clears authentication and navigates to home
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
    navigate('/');
  };

  /**
   * Handles forgot password action
   * Switches from login to forgot password modal
   */
  const handleForgotPassword = () => {
    setIsLoginModalOpen(false);
    setIsForgotPasswordModalOpen(true);
  };

  return (
    <>
      {/* Main Header */}
      <header className="bg-indigo-600 text-white p-4 transition-colors duration-200" style={{zIndex: 10}}>
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo and Brand */}
          <Link to="/" className="hover:text-indigo-200 transition-colors text-lg">
            <h1 className="text-4xl font-bold flex items-center">
              <Dna className="mr-2" size={36} />
              HelixHunt
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <nav>
              <ul className="flex space-x-4">
                <li><Link to="/" className="hover:text-indigo-200 transition-colors text-lg">Home</Link></li>
                <li><Link to="/about" className="hover:text-indigo-200 transition-colors text-lg">About</Link></li>
                <li>
                  <Link to="/help" className="hover:text-indigo-200 transition-colors flex items-center text-lg">
                    Help/Tutorial
                    <HelpCircle className="ml-1" size={18} />
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Theme Toggle */}
            <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-indigo-500 transition-colors">
              {isDarkMode ? <Sun size={20} /> : <Moon size={24} />}
            </button>

            {/* Authentication Controls */}
            {user ? (
              <div className="flex space-x-2">
                <Link 
                  to="/account"
                  className="bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded transition-colors flex items-center text-lg"
                >
                  <User className="mr-2" size={24} />
                  Account
                </Link>
                <button 
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition-colors flex items-center text-lg"
                >
                  <LogOut className="mr-2" size={24} />
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded transition-colors flex items-center text-lg"
              >
                <User className="mr-2" size={24} />
                Login/Register
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={toggleMenu}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-16 right-0 left-0 bottom-0 z-50">
          <div className="bg-indigo-600 bg-opacity-70 backdrop-blur-lg p-4 overflow-y-auto">
            {/* Mobile Navigation Links */}
            <nav>
              <ul className="space-y-4 text-center">
                <li><Link to="/" className="block text-white hover:text-indigo-200 transition-colors text-lg" onClick={toggleMenu}>Home</Link></li>
                <li><Link to="/about" className="block text-white hover:text-indigo-200 transition-colors text-lg" onClick={toggleMenu}>About</Link></li>
                <li>
                  <Link to="/help" className="block text-white justify-center hover:text-indigo-200 transition-colors flex items-center text-lg" onClick={toggleMenu}>
                    <HelpCircle className="mr-2" size={20}/>
                    Help/Tutorial
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Mobile Theme Toggle */}
            <button onClick={toggleDarkMode} className="w-full text-left text-white hover:bg-indigo-500 p-3 rounded transition-colors flex justify-center items-center text-lg">
              {isDarkMode ? <Sun size={20} className="mr-2" /> : <Moon size={24} className="mr-2" />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            {/* Mobile Authentication Controls */}
            {user ? (
              <div className="flex space-evenly">
                <Link 
                  to="/account"
                  className="block w-full m-4 bg-indigo-500 hover:bg-indigo-400 px-4 py-3 rounded transition-colors text-white text-lg"
                  onClick={toggleMenu}
                >
                  Account
                </Link>
                <button 
                  onClick={() => { handleLogout(); toggleMenu(); }}
                  className="w-full m-4 bg-red-500 hover:bg-red-600 px-4 py-3 rounded transition-colors text-left text-white text-lg"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setIsLoginModalOpen(true); toggleMenu(); }}
                className="w-full bg-indigo-500 hover:bg-indigo-400 px-4 py-3 rounded transition-colors text-left text-white text-lg"
              >
                Login/Register
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <LoginRegisterModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess}
        onForgotPassword={handleForgotPassword}
      />
      
      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
      />
    </>
  );
};

export default Header;