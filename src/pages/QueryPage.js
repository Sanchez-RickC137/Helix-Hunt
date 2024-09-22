// pages/QueryPage.js
import React, { useState, useEffect } from 'react';
import GeneSelection from '../components/GeneSelection';
import QueryParameters from '../components/QueryParameters';
import ReviewModal from '../components/ReviewModal';
import DownloadPrompt from '../components/DownloadPrompt';
import QueryHistory from '../components/QueryHistory';
import { getQueryHistory, addQueryToHistory, getUserById } from '../database/db';

const QueryPage = ({ isDarkMode, user }) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [geneVariationIDs, setGeneVariationIDs] = useState([]);
  const [clinicalSignificance, setClinicalSignificance] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [queryHistory, setQueryHistory] = useState([]);

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
    };

    fetchHistory();
  }, [user]);

  const handleReviewClick = () => {
    setShowReviewModal(true);
  };

  const handleSubmit = async () => {
    const query = { selectedGenes, geneVariationIDs, clinicalSignificance, outputFormat, startDate, endDate };
    console.log('Query submitted', query);
    
    if (user) {
      try {
        const updatedHistory = await addQueryToHistory(user.id, query);
        setQueryHistory(updatedHistory);
      } catch (error) {
        console.error("Error adding query to history:", error);
      }
    }
    
    setShowReviewModal(false);
    setShowDownloadPrompt(true);
  };

  const handleSelectHistoricalQuery = (query) => {
    setSelectedGenes(query.selectedGenes || []);
    setGeneVariationIDs(query.geneVariationIDs || []);
    setClinicalSignificance(query.clinicalSignificance || '');
    setOutputFormat(query.outputFormat || '');
    setStartDate(query.startDate || '');
    setEndDate(query.endDate || '');
  };

  const handleLoadPreferences = async () => {
    if (user && user.id) {
      try {
        const userData = await getUserById(user.id);
        if (userData && userData.genePreferences) {
          setSelectedGenes(userData.genePreferences);
        }
      } catch (error) {
        console.error("Error loading gene preferences:", error);
      }
    }
  };

  return (
    <div className="container mx-auto mt-8 p-4">
      <h1 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Create Your Query
      </h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className={`w-full md:w-1/3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 transition-colors duration-200`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Select Genes</h2>
            {user && (
              <button
                onClick={handleLoadPreferences}
                className="px-4 py-2 rounded text-sm bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200"
              >
                Load My Gene Preferences
              </button>
            )}
          </div>
          <GeneSelection
            isDarkMode={isDarkMode}
            selectedGenes={selectedGenes}
            setSelectedGenes={setSelectedGenes}
          />
        </div>
        <div className={`w-full md:w-2/3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 transition-colors duration-200`}>
          <QueryParameters
            isDarkMode={isDarkMode}
            selectedGenes={selectedGenes}
            clinicalSignificance={clinicalSignificance}
            setClinicalSignificance={setClinicalSignificance}
            outputFormat={outputFormat}
            setOutputFormat={setOutputFormat}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            geneVariationIDs={geneVariationIDs}
            setGeneVariationIDs={setGeneVariationIDs}
            handleReviewClick={handleReviewClick}
          />
        </div>
      </div>
      {user && queryHistory.length > 0 && (
        <div className="mt-8">
          <QueryHistory 
            queryHistory={queryHistory}
            isDarkMode={isDarkMode}
            onSelectQuery={handleSelectHistoricalQuery}
          />
        </div>
      )}
      {showReviewModal && (
        <ReviewModal
          isDarkMode={isDarkMode}
          setShowReviewModal={setShowReviewModal}
          selectedGenes={selectedGenes}
          geneVariationIDs={geneVariationIDs}
          clinicalSignificance={clinicalSignificance}
          startDate={startDate}
          endDate={endDate}
          outputFormat={outputFormat}
          handleSubmit={handleSubmit}
        />
      )}
      {showDownloadPrompt && (
        <DownloadPrompt
          isDarkMode={isDarkMode}
          setShowDownloadPrompt={setShowDownloadPrompt}
        />
      )}
    </div>
  );
};

export default QueryPage;