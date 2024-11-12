/**
 * Theme context provider and hook
 * Manages application-wide theme state (light/dark mode)
 * Provides theme toggle functionality
 */

import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

/**
 * Theme provider component
 * Wraps application to provide theme state and toggle function
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  /**
   * Toggles between light and dark mode
   */
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook to use theme context
 * Provides access to theme state and toggle function
 * 
 * @returns {Object} Theme context value
 * @throws {Error} If used outside ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};