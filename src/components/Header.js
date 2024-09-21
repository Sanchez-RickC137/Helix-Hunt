import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, HelpCircle, Dna, Sun, Moon, LogOut } from 'lucide-react';
import LoginRegisterModal from './LoginRegisterModal';

const Header = ({ isDarkMode, setIsDarkMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(localStorage.getItem('username'));
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('username');
    setLoggedInUser(null);
    navigate('/');
  };

  const handleLoginSuccess = (username) => {
    localStorage.setItem('username', username);
    setLoggedInUser(username);
    navigate('/account');
  };

  return (
    <>
      <header className={`${isDarkMode ? 'bg-indigo-900' : 'bg-indigo-600'} text-white p-4 transition-colors duration-200`} style={{zIndex: 1}}>
        <div className="container mx-auto flex justify-between items-center">
          
          <Link to="/" className="hover:text-indigo-300 transition-colors text-lg">
            <h1 className="text-4xl font-bold flex items-center">
            <Dna className="mr-2" size={36} />
            HelixHunt
            </h1>
          </Link>
          <div className="flex items-center space-x-6">
            <nav>
              <ul className="flex space-x-4">
                <li><Link to="/" className="hover:text-indigo-300 transition-colors text-lg">Home</Link></li>
                <li><Link to="/about" className="hover:text-indigo-300 transition-colors text-lg">About</Link></li>
                <li><Link to="/help" className="hover:text-indigo-300 transition-colors flex items-center text-lg">
                  <HelpCircle className="mr-1" size={18} />
                  Help/Tutorial
                </Link></li>
              </ul>
            </nav>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-indigo-700 transition-colors">
              {isDarkMode ? <Sun size={20} /> : <Moon size={24} />}
            </button>
            {loggedInUser ? (
              <div className="flex space-x-2">
                <Link 
                  to="/account"
                  className={`${isDarkMode ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-indigo-500 hover:bg-indigo-400'} px-4 py-2 rounded transition-colors flex items-center text-lg`}
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
                onClick={() => setIsModalOpen(true)}
                className={`${isDarkMode ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-indigo-500 hover:bg-indigo-400'} px-4 py-2 rounded transition-colors flex items-center text-lg`}
              >
                <User className="mr-2" size={24} />
                Login/Register
              </button>
            )}
          </div>
        </div>
      </header>
      <LoginRegisterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        isDarkMode={isDarkMode} 
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default Header;