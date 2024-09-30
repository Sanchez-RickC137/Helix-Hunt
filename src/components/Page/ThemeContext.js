import React, { createContext, useState, useContext } from 'react';

// Create a context for the theme
const ThemeContext = createContext();

// ThemeProvider component to wrap the app and provide theme context
export const ThemeProvider = ({ children }) => {
  // State to hold the current theme mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Provide the theme state and setter to all children
  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);