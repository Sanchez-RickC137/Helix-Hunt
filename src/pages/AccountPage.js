import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import FullNamePreferences from '../components/User/FullNamePreferences';
import VariationIDPreferences from '../components/User/VariationIDPreferences';
import PasswordChangeModal from '../components/User/PasswordChangeModal';
import QueryHistory from '../components/Query/QueryHistory';
import {
  getQueryHistory,
  updateFullNamePreferences,
  updateVariationIDPreferences,
  getUserPreferences
} from '../database/db';
import { useThemeConstants } from '../components/Page/ThemeConstants';

const AccountPage = ({ user, setUser }) => {
  const [queryHistory, setQueryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const themeConstants = useThemeConstants();

  useEffect(() => {
    const fetchData = async () => {
      if (user && user.id) {
        try {
          const [history, preferences] = await Promise.all([
            getQueryHistory(user.id),
            getUserPreferences(user.id)
          ]);
          setQueryHistory(history);
          setUser(prevUser => ({ ...prevUser, ...preferences }));
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user, setUser]);

  const handleUpdateFullNamePreferences = async (newPreferences) => {
    if (user) {
      try {
        await updateFullNamePreferences(user.id, newPreferences);
        setUser(prevUser => ({ ...prevUser, fullNamePreferences: newPreferences }));
      } catch (error) {
        console.error("Error updating full name preferences:", error);
      }
    }
  };

  const handleUpdateVariationIDPreferences = async (newPreferences) => {
    if (user) {
      try {
        await updateVariationIDPreferences(user.id, newPreferences);
        setUser(prevUser => ({ ...prevUser, variationIDPreferences: newPreferences }));
      } catch (error) {
        console.error("Error updating variation ID preferences:", error);
      }
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
            userId={user.id}
            initialPreferences={user.fullNamePreferences || []}
            onUpdatePreferences={handleUpdateFullNamePreferences}
          />
        </div>
        
        <div className={`${themeConstants.sectionBackgroundColor} p-4 rounded-lg shadow`}>
          <h2 className="text-2xl font-bold mb-4">Variation ID Preferences</h2>
          <VariationIDPreferences
            userId={user.id}
            initialPreferences={user.variationIDPreferences || []}
            onUpdatePreferences={handleUpdateVariationIDPreferences}
          />
        </div>
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
        userId={user.id}
      />
    </div>
  );
};

export default AccountPage;