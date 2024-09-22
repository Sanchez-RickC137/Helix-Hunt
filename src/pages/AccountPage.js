// pages/AccountPage.js
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import GenePreferences from '../components/GenePreferences';
import QueryHistory from '../components/QueryHistory';
import { getQueryHistory, updateGenePreferences } from '../database/db';

const AccountPage = ({ isDarkMode, user, setUser }) => {
  const [queryHistory, setQueryHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const allGenes = ['BRCA1', 'BRCA2', 'TP53', 'EGFR', 'KRAS', 'APC', 'PTEN', 'RB1', 'VEGF', 'MDM2'];

  useEffect(() => {
    const fetchHistory = async () => {
      if (user && user.id) {
        try {
          const history = await getQueryHistory(user.id);
          setQueryHistory(history);
        } catch (error) {
          console.error("Error fetching query history:", error);
        }
      }
      setLoading(false);
    };

    fetchHistory();
  }, [user]);

  const handleUpdatePreferences = async (newPreferences) => {
    if (user) {
      try {
        await updateGenePreferences(user.id, newPreferences);
        setUser(prevUser => ({ ...prevUser, genePreferences: newPreferences }));
      } catch (error) {
        console.error("Error updating gene preferences:", error);
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
    <div className={`container mx-auto mt-8 p-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <h1 className="text-3xl font-bold mb-4">My Account</h1>
      <p className="mb-6">Welcome, {user.username}!</p>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Gene Preferences</h2>
        <GenePreferences 
          userId={user.id} 
          isDarkMode={isDarkMode} 
          initialPreferences={user.genePreferences || []} 
          allGenes={allGenes}
          onUpdatePreferences={handleUpdatePreferences}
        />
      </div>
      
      {queryHistory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Query History</h2>
          <QueryHistory 
            queryHistory={queryHistory}
            isDarkMode={isDarkMode}
            onSelectQuery={() => {}} // No action needed on account page
          />
        </div>
      )}
    </div>
  );
};

export default AccountPage;