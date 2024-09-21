import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, HelpCircle, Dna, Sun, Moon, LogOut, Menu, X } from 'lucide-react';
import LoginRegisterModal from './LoginRegisterModal';

const Header = ({ isDarkMode, setIsDarkMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(localStorage.getItem('username'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('username');
    setLoggedInUser(null);
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleLoginSuccess = (username) => {
    localStorage.setItem('username', username);
    setLoggedInUser(username);
    navigate('/account');
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  const headerClass = isDarkMode ? 'bg-indigo-900' : 'bg-indigo-600';
  const hoverClass = isDarkMode ? 'hover:bg-indigo-800' : 'hover:bg-indigo-500';
  const dividerClass = isDarkMode ? 'border-indigo-800' : 'border-indigo-500';

  return (
    <>
      <header className={`${headerClass} text-white p-4 transition-colors duration-200`} style={{zIndex: 10}}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <Dna className="mr-2" size={24} />
            HelixHunt
          </h1>
          <div className="hidden md:flex items-center space-x-6">
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
          <button className="md:hidden" onClick={toggleMenu}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
      {isMenuOpen && (
        <div ref={menuRef} className={`md:hidden ${headerClass} text-white absolute w-full z-50`}>
          <nav className="container mx-auto py-4">
            <ul className="space-y-2">
              <li><Link to="/" className={`block ${hoverClass} transition-colors text-lg py-2 px-4 rounded`} onClick={toggleMenu}>Home</Link></li>
              <li><Link to="/about" className={`block ${hoverClass} transition-colors text-lg py-2 px-4 rounded`} onClick={toggleMenu}>About</Link></li>
              <li><Link to="/help" className={`block ${hoverClass} transition-colors text-lg py-2 px-4 rounded`} onClick={toggleMenu}>Help/Tutorial</Link></li>
              
              {/* Divider 1 - Between nav links and dark mode toggle */}
              <li className={`border-t ${dividerClass} my-2`}></li>

              <li>
                <button onClick={() => { setIsDarkMode(!isDarkMode); toggleMenu(); }} className={`w-full text-left ${hoverClass} transition-colors text-lg py-2 px-4 rounded flex items-center`}>
                  {isDarkMode ? <Sun size={18} className="mr-2" /> : <Moon size={18} className="mr-2" />}
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </li>

              {/* Divider 2 - Between dark mode toggle and user-related actions */}
              <li className={`border-t ${dividerClass} my-2`}></li>

              {loggedInUser ? (
                <>
                  <li>
                    <Link 
                      to="/account"
                      className={`block ${hoverClass} transition-colors text-lg py-2 px-4 rounded flex items-center`}
                      onClick={toggleMenu}
                    >
                      <User size={18} className="mr-2" />
                      Account
                    </Link>
                  </li>
                  <li>
                    <button 
                      onClick={handleLogout}
                      className={`w-full text-left ${hoverClass} transition-colors text-lg py-2 px-4 rounded flex items-center`}
                    >
                      <LogOut size={18} className="mr-2" />
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <button 
                    onClick={() => { setIsModalOpen(true); toggleMenu(); }}
                    className={`w-full text-left ${hoverClass} transition-colors text-lg py-2 px-4 rounded flex items-center`}
                  >
                    <User size={18} className="mr-2" />
                    Login/Register
                  </button>
                </li>
              )}

              {/* Divider 3 - Before close button */}
              <li className={`border-t ${dividerClass} my-2`}></li>

              <li>
                <button 
                  onClick={toggleMenu}
                  className={`w-full text-left ${hoverClass} transition-colors text-lg py-2 px-4 rounded flex items-center`}
                >
                  <X size={18} className="mr-2" />
                  Close Menu
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
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