import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';
import timeOperation from '../utils/timing';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({ fullNamePreferences: [], variationIDPreferences: [] });
  const [queryHistory, setQueryHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const login = async (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await fetchPreferences();
    await fetchQueryHistory();
  };

  const logout = () => {
    setUser(null);
    setPreferences({ fullNamePreferences: [], variationIDPreferences: [] });
    setQueryHistory([]);
    localStorage.removeItem('token');
    delete axiosInstance.defaults.headers.common['Authorization'];
  };

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

  const updatePreferences = (newPreferences) => {
    setPreferences(newPreferences);
  };

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

  useEffect(() => {
    if (user) {
      fetchPreferences();
      fetchQueryHistory();
    }
  }, [user, fetchPreferences, fetchQueryHistory]);

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

export const useUser = () => useContext(UserContext);

export default UserProvider;