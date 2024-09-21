import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import AccountPage from './pages/AccountPage';
import QueryPage from './pages/QueryPage';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <Router>
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage isDarkMode={isDarkMode} />} />
            <Route path="/about" element={<AboutPage isDarkMode={isDarkMode} />} />
            <Route path="/help" element={<HelpPage isDarkMode={isDarkMode} />} />
            <Route path="/account" element={<AccountPage isDarkMode={isDarkMode} />} />
            <Route path="/query" element={<QueryPage isDarkMode={isDarkMode} />} />
          </Routes>
        </main>
        <Footer isDarkMode={isDarkMode} />
      </div>
    </Router>
  );
}

export default App;