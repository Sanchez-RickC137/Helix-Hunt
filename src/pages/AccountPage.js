import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';  // Add this import
import { useUser } from '../contexts/UserContext';
import FullNamePreferences from '../components/User/FullNamePreferences';
import VariationIDPreferences from '../components/User/VariationIDPreferences';
import PasswordChangeModal from '../components/User/PasswordChangeModal';
import QueryHistory from '../components/Query/QueryHistory';
import { useThemeConstants } from '../components/Page/ThemeConstants';

const AccountPage = () => {
  const { user, preferences, updatePreferences, savePreferences, loading } = useUser();
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [queryHistory, setQueryHistory] = useState([]);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const themeConstants = useThemeConstants();

  useEffect(() => {
    if (user) {
      fetchQueryHistory();
    }
  }, [user]);

  useEffect(() => {
    console.log('Preferences in AccountPage:', preferences);
    setLocalPreferences(preferences);
  }, [preferences]);

  const fetchQueryHistory = async () => {
    try {
      const response = await axiosInstance.get('/api/query-history');
      setQueryHistory(response.data);
    } catch (error) {
      console.error("Error fetching query history:", error);
      setDebugInfo(prev => prev + "\nError fetching query history: " + error.message);
    }
  };

  const handleUpdateFullNamePreferences = (newFullNamePreferences) => {
    setLocalPreferences(prev => ({ ...prev, fullNamePreferences: newFullNamePreferences }));
  };

  const handleUpdateVariationIDPreferences = (newVariationIDPreferences) => {
    setLocalPreferences(prev => ({ ...prev, variationIDPreferences: newVariationIDPreferences }));
  };

  const handleSavePreferences = async () => {
    try {
      await savePreferences(localPreferences);
      updatePreferences(localPreferences);
      console.log('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Account</h1>
        <button
          onClick={() => setIsPasswordModalOpen(true)}
          className={`px-4 py-2 rounded ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
        >
          Change Password
        </button>
      </div>
      <p className="mb-6">Welcome, {user.username}!</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className={`${themeConstants.sectionBackgroundColor} p-4 rounded-lg shadow`}>
          <h2 className="text-2xl font-bold mb-4">Full Name Preferences</h2>
          <FullNamePreferences
            preferences={localPreferences.fullNamePreferences}
            onUpdatePreferences={handleUpdateFullNamePreferences}
          />
        </div>
        
        <div className={`${themeConstants.sectionBackgroundColor} p-4 rounded-lg shadow`}>
          <h2 className="text-2xl font-bold mb-4">Variation ID Preferences</h2>
          <VariationIDPreferences
            preferences={localPreferences.variationIDPreferences}
            onUpdatePreferences={handleUpdateVariationIDPreferences}
          />
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <button
          onClick={handleSavePreferences}
          className={`px-6 py-3 rounded ${themeConstants.primaryButtonBackgroundColor} hover:${themeConstants.primaryButtonHoverColor} text-white transition-colors duration-200`}
        >
          Save Preferences
        </button>
      </div>

      {queryHistory.length > 0 && (
        <div className="mb-8">
          <QueryHistory
            queryHistory={queryHistory}
            onSelectQuery={() => {}} // No action needed on account page
          />
        </div>
      )}

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        username={user ? user.username : ''}
      />

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Debug Information:</h3>
        <pre className="whitespace-pre-wrap">{debugInfo}</pre>
      </div>
    </div>
  );
};

export default AccountPage;