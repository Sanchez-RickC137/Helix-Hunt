import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './components/Page/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import Header from './components/Page/Header';
import Footer from './components/Page/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import AccountPage from './pages/AccountPage';
import QueryPage from './pages/QueryPage';
import { useThemeConstants } from './components/Page/ThemeConstants';


function AppContent() {
  const themeConstants = useThemeConstants();

  return (
    <div className={`min-h-screen flex flex-col ${themeConstants.mainBackgroundColor}`}>
      <Header />
      <main className={`flex-grow ${themeConstants.mainTextColor}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/query" element={<QueryPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Router>
          <AppContent />
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;