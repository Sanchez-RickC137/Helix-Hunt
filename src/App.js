import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './components/Page/ThemeContext';
import { useThemeConstants } from './components/Page/ThemeConstants';
import Header from './components/Page/Header';
import Footer from './components/Page/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import AccountPage from './pages/AccountPage';
import QueryPage from './pages/QueryPage';
import { getUserById } from './database/db';

function App() {
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
    <ThemeProvider>
      <Router>
        <AppContent user={user} setUser={setUser} login={login} logout={logout} />
      </Router>
    </ThemeProvider>
  );
}

function AppContent({ user, setUser, login, logout }) {
  const themeConstants = useThemeConstants();

  return (
    <div className={`min-h-screen flex flex-col ${themeConstants.mainBackgroundColor} ${themeConstants.mainTextColor}`}>
      <Header 
        user={user}
        onLogout={logout}
        onLogin={login}
      />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/account" element={<AccountPage user={user} setUser={setUser} />} />
          <Route path="/query" element={<QueryPage user={user} />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;