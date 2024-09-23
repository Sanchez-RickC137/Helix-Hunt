import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, HelpCircle, Dna, Sun, Moon, LogOut, Menu, X } from 'lucide-react';
import LoginRegisterModal from './LoginRegisterModal';
import { useTheme } from './ThemeContext';

const Header = ({ user, onLogout, onLogin }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode, setIsDarkMode } = useTheme();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLoginSuccess = (userData) => {
    onLogin(userData);
    setIsModalOpen(false);
    navigate('/account');
  };

  return (
    <>
      <header className="bg-indigo-600 text-white p-4 transition-colors duration-200" style={{zIndex: 10}}>
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="hover:text-indigo-200 transition-colors text-lg">
            <h1 className="text-4xl font-bold flex items-center">
              <Dna className="mr-2" size={36} />
              HelixHunt
            </h1>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <nav>
              <ul className="flex space-x-4">
                <li><Link to="/" className="hover:text-indigo-200 transition-colors text-lg">Home</Link></li>
                <li><Link to="/about" className="hover:text-indigo-200 transition-colors text-lg">About</Link></li>
                <li><Link to="/help" className="hover:text-indigo-200 transition-colors flex items-center text-lg">
                  <HelpCircle className="mr-1" size={18} />
                  Help/Tutorial
                </Link></li>
              </ul>
            </nav>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-indigo-500 transition-colors">
              {isDarkMode ? <Sun size={20} /> : <Moon size={24} />}
            </button>
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
                  onClick={onLogout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition-colors flex items-center text-lg"
                >
                  <LogOut className="mr-2" size={24} />
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded transition-colors flex items-center text-lg"
              >
                <User className="mr-2" size={24} />
                Login/Register
              </button>
            )}
          </div>
          <button className="md:hidden" onClick={toggleMenu}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
      {isMenuOpen && (
        <div className="md:hidden bg-indigo-600 text-white absolute w-full z-50">
          {/* Mobile menu content */}
        </div>
      )}
      <LoginRegisterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default Header;