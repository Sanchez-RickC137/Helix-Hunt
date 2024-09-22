// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import AccountPage from './pages/AccountPage';
import QueryPage from './pages/QueryPage';
import { getUserById } from './database/db';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser && storedUser.id) {
        try {
          const userData = await getUserById(storedUser.id);
          setUser(userData);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <Header 
          isDarkMode={isDarkMode} 
          setIsDarkMode={setIsDarkMode} 
          user={user}
          onLogout={logout}
          onLogin={login}
        />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage isDarkMode={isDarkMode} />} />
            <Route path="/about" element={<AboutPage isDarkMode={isDarkMode} />} />
            <Route path="/help" element={<HelpPage isDarkMode={isDarkMode} />} />
            <Route path="/account" element={<AccountPage isDarkMode={isDarkMode} user={user} setUser={setUser} />} />
            <Route path="/query" element={<QueryPage isDarkMode={isDarkMode} user={user} />} />
          </Routes>
        </main>
        <Footer isDarkMode={isDarkMode} />
      </div>
    </Router>
  );
}

export default App;