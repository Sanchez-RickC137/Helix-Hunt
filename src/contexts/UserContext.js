/**
 * UserContext provides global user state management and authentication
 * Handles user login, logout, preferences, and query history
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';
import timeOperation from '../utils/timing';

// Create context for user data
const UserContext = createContext();

/**
 * UserProvider component that wraps the application and provides user-related state and functions
 * 
 * Features:
 * - User authentication state
 * - User preferences management
 * - Query history tracking
 * - Token-based authentication
 * 
 * @param {object} props - Component props
 * @param {ReactNode} props.children - Child components to wrap
 */
export const UserProvider = ({ children }) => {
  // State management
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({ fullNamePreferences: [], variationIDPreferences: [] });
  const [queryHistory, setQueryHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetches user details from the server
   * Called after authentication or when user data needs refresh
   */
  const fetchUserDetails = useCallback(async () => {
    if (!user) return;
    try {
      const userData = await timeOperation('Fetch user details', () => 
        axiosInstance.get('/api/user')
      );
      setUser(userData.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  }, [user]);

  /**
   * Fetches user preferences from the server
   * Includes full name and variation ID preferences
   */
  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    try {
      const response = await timeOperation('Fetch user preferences', () => 
        axiosInstance.get('/api/user-preferences')
      );
      console.log('Fetched preferences:', response.data);
      setPreferences(response.data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  }, [user]);

  /**
   * Fetches user's query history
   * Limited to most recent queries
   */
  const fetchQueryHistory = useCallback(async () => {
    if (!user) return;
    try {
      const response = await timeOperation('Fetch query history', () => 
        axiosInstance.get('/api/query-history')
      );
      console.log('Fetched query history:', response.data);
      setQueryHistory(response.data);
    } catch (error) {
      console.error('Error fetching query history:', error);
    }
  }, [user]);

  /**
   * Handles user login
   * Sets up authentication token and fetches user data
   * 
   * @param {object} userData - User information
   * @param {string} token - JWT authentication token
   */
  const login = async (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await fetchPreferences();
    await fetchQueryHistory();
  };

  /**
   * Handles user logout
   * Clears all user-related state and local storage
   */
  const logout = () => {
    setUser(null);
    setPreferences({ fullNamePreferences: [], variationIDPreferences: [] });
    setQueryHistory([]);
    localStorage.removeItem('token');
    delete axiosInstance.defaults.headers.common['Authorization'];
  };

  /**
   * Saves a new query to history
   * 
   * @param {object} query - Query details to save
   */
  const saveQuery = async (query) => {
    try {
      await timeOperation('Save query to history', () => 
        axiosInstance.post('/api/save-query', query)
      );
      await fetchQueryHistory();
    } catch (error) {
      console.error('Error saving query:', error);
    }
  };

  /**
   * Updates user preferences in state
   * 
   * @param {object} newPreferences - Updated preferences object
   */
  const updatePreferences = (newPreferences) => {
    setPreferences(newPreferences);
  };

  /**
   * Saves updated preferences to the server
   * 
   * @param {object} newPreferences - Updated preferences to save
   */
  const savePreferences = async (newPreferences) => {
    try {
      await timeOperation('Update user preferences', () => 
        axiosInstance.put('/api/user-preferences', newPreferences)
      );
      setPreferences(newPreferences);
      console.log('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  // Initialize user session from stored token
  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await axiosInstance.get('/api/user');
          setUser(response.data);
        } catch (error) {
          console.error('Error fetching user data:', error);
          localStorage.removeItem('token');
          delete axiosInstance.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    initializeUser();
  }, []);

  // Fetch user data when user state changes
  useEffect(() => {
    if (user) {
      fetchPreferences();
      fetchQueryHistory();
    }
  }, [user, fetchPreferences, fetchQueryHistory]);

  // Provide context value to children
  return (
    <UserContext.Provider value={{
      user,
      preferences,
      queryHistory,
      login,
      logout,
      loading,
      fetchQueryHistory,
      fetchPreferences,
      updatePreferences,
      savePreferences,
      saveQuery,
      fetchUserDetails
    }}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Custom hook to use user context
 * Provides access to user state and functions
 * 
 * @returns {object} User context value
 * @throws {Error} If used outside of UserProvider
 */
export const useUser = () => useContext(UserContext);

export default UserProvider;