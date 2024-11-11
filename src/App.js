/**
 * Main application component that handles routing and global context providers.
 * This component serves as the root of the application, wrapping all other components
 * with necessary providers and routing configuration.
 */

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
import { HelpProvider } from './contexts/HelpContext';

/**
 * AppContent component handles the main layout and routing of the application.
 * It uses the theme context to apply consistent styling across the application.
 * 
 * @returns {JSX.Element} The main application layout with routing
 */
function AppContent() {
  // Get theme-related styling constants
  const themeConstants = useThemeConstants();

  return (
    <div className={`min-h-screen flex flex-col ${themeConstants.mainBackgroundColor}`}>
      {/* Global navigation header */}
      <Header />
      
      {/* Main content area with routes */}
      <main className={`flex-grow ${themeConstants.mainTextColor}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/query" element={<QueryPage />} />
        </Routes>
      </main>
      
      {/* Global footer */}
      <Footer />
    </div>
  );
}

/**
 * App component serves as the application root, providing necessary context providers
 * for theme management and user authentication/data.
 * 
 * Component Hierarchy:
 * - ThemeProvider: Manages application-wide theme state (light/dark mode)
 * - UserProvider: Manages user authentication and user-related data
 * - Router: Enables application routing
 * - AppContent: Main application layout and route configuration
 * 
 * @returns {JSX.Element} The complete application wrapped in necessary providers
 */
function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <HelpProvider>
          <Router>
            <AppContent />
          </Router>
        </HelpProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;