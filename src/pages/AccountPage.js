import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import GenePreferences from '../components/Query/GenePreferences';
import QueryHistory from '../components/Query/QueryHistory';
import { getQueryHistory, updateGenePreferences } from '../database/db';
import { useThemeConstants } from '../components/Page/ThemeConstants';

const AccountPage = ({ user, setUser }) => {
  // State for query history and loading status
  const [queryHistory, setQueryHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get theme-related constants
  const themeConstants = useThemeConstants();

  // Example list of all available genes
  const allGenes = ['BRCA1', 'BRCA2', 'TP53', 'EGFR', 'KRAS', 'APC', 'PTEN', 'RB1', 'VEGF', 'MDM2'];

  // Fetch query history on component mount or when user changes
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

  // Handle updating user's gene preferences
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
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      <h1 className="text-3xl font-bold mb-4">My Account</h1>
      <p className="mb-6">Welcome, {user.username}!</p>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Gene Preferences</h2>
        <GenePreferences 
          userId={user.id} 
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
            onSelectQuery={() => {}} // No action needed on account page
          />
        </div>
      )}
    </div>
  );
};

export default AccountPage;