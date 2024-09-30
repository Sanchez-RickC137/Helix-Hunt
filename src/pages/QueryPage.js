import React, { useState, useEffect } from 'react';
import GeneSelection from '../components/Query/GeneSelection';
import DNAChangeSelection from '../components/Query/DNAChangeSelection';
import ProteinChangeSelection from '../components/Query/ProteinChangeSelection';
import VariationIDSelection from '../components/Query/VariationIDSelection';
import QueryParameters from '../components/Query/QueryParameters';
import ReviewModal from '../components/Modals/ReviewModal';
import DownloadPrompt from '../components/Modals/DownloadPrompt';
import ResultsPreview from '../components/Modals/ResultsPreview';
import QueryHistory from '../components/Query/QueryHistory';
import { getQueryHistory, addQueryToHistory, getUserById } from '../database/db';
import { useThemeConstants } from '../components/Page/ThemeConstants';
import { refinedClinvarHtmlTableToJson } from '../utils/clinvarUtils';

const QueryPage = ({ user }) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showResultsPreview, setShowResultsPreview] = useState(false);
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [selectedDNAChanges, setSelectedDNAChanges] = useState([]);
  const [selectedProteinChanges, setSelectedProteinChanges] = useState([]);
  const [selectedVariationIDs, setSelectedVariationIDs] = useState([]);
  const [clinicalSignificance, setClinicalSignificance] = useState([]);
  const [outputFormat, setOutputFormat] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [queryHistory, setQueryHistory] = useState([]);
  const [queryResults, setQueryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  const themeConstants = useThemeConstants();

  useEffect(() => {
    const fetchHistory = async () => {
      if (user && user.id) {
        try {
          const history = await getQueryHistory(user.id);
          setQueryHistory(history);
        } catch (error) {
          console.error("Error fetching query history:", error);
          setDebugInfo(prev => prev + "\nError fetching query history: " + error.message);
        }
      }
    };

    fetchHistory();
  }, [user]);

  const handleReviewClick = () => {
    setShowReviewModal(true);
    setDebugInfo("Review modal opened");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo("Query submission started");

    const query = { 
      selectedGenes, 
      selectedDNAChanges, 
      selectedProteinChanges, 
      selectedVariationIDs,
      clinicalSignificance, 
      outputFormat, 
      startDate, 
      endDate 
    };

    try {
      if (selectedVariationIDs.length === 0) {
        throw new Error("Please select at least one Variation ID");
      }
      if (selectedProteinChanges.length === 0) {
        throw new Error("Please select at least one Protein Change");
      }

      const variantId = selectedVariationIDs[0];
      const proteinChange = selectedProteinChanges[0];
      setDebugInfo(prev => prev + `\nFetching data for Variant ID: ${variantId} and Protein Change: ${proteinChange}`);

      const url = `http://localhost:5000/api/clinvar?id=${variantId}&term=${encodeURIComponent(proteinChange)}`;
      setDebugInfo(prev => prev + `\nMaking request to: ${url}`);
      
      const response = await fetch(url);
      
      setDebugInfo(prev => prev + `\nResponse status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      setDebugInfo(prev => prev + `\nReceived data: ${responseText.substring(0, 100)}...`);

      const jsonData = refinedClinvarHtmlTableToJson(responseText);
      setDebugInfo(prev => prev + `\nConverted HTML to JSON: ${jsonData.substring(0, 100)}...`);

      setQueryResults({
        summary: null,
        detail: JSON.parse(jsonData),
        html: responseText
      });

      if (user) {
        try {
          const updatedHistory = await addQueryToHistory(user.id, query);
          setQueryHistory(updatedHistory);
          setDebugInfo(prev => prev + "\nQuery added to history");
        } catch (error) {
          console.error("Error adding query to history:", error);
          setDebugInfo(prev => prev + "\nError adding query to history: " + error.message);
        }
      }
    
      setShowReviewModal(false);
      setShowDownloadPrompt(true);
      setDebugInfo(prev => prev + "\nQuery completed successfully");
    } catch (error) {
      console.error("Error performing ClinVar query:", error);
      setError(error.message || "An error occurred while fetching data");
      setDebugInfo(prev => prev + "\nError performing query: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistoricalQuery = (query) => {
    setSelectedGenes(query.selectedGenes || []);
    setSelectedDNAChanges(query.selectedDNAChanges || []);
    setSelectedProteinChanges(query.selectedProteinChanges || []);
    setSelectedVariationIDs(query.selectedVariationIDs || []);
    setClinicalSignificance(query.clinicalSignificance || []);
    setOutputFormat(query.outputFormat || '');
    setStartDate(query.startDate || '');
    setEndDate(query.endDate || '');
    setDebugInfo("Historical query selected");
  };

  const handleLoadPreferences = async () => {
    if (user && user.id) {
      try {
        const userData = await getUserById(user.id);
        if (userData && userData.genePreferences) {
          setSelectedGenes(userData.genePreferences);
          setDebugInfo("User preferences loaded");
        }
      } catch (error) {
        console.error("Error loading gene preferences:", error);
        setDebugInfo(prev => prev + "\nError loading gene preferences: " + error.message);
      }
    }
  };

  const handlePreviewResults = () => {
    setShowResultsPreview(true);
    setDebugInfo("Results preview opened");
  };

  const handleClosePreview = () => {
    setShowResultsPreview(false);
    // We don't set showDownloadPrompt to false here, so it remains accessible
  };

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      <h1 className={`text-3xl font-bold mb-6 ${themeConstants.headingTextColor}`}>
        Create Your Query
      </h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className={`w-full md:w-1/3 ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg p-6 transition-colors duration-200`}>
          {user && (
            <button
              onClick={handleLoadPreferences}
              className={`mb-4 px-4 py-2 rounded text-sm ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
            >
              Load My Gene Preferences
            </button>
          )}
          <GeneSelection
            selectedGenes={selectedGenes}
            setSelectedGenes={setSelectedGenes}
          />
          <DNAChangeSelection
            selectedDNAChanges={selectedDNAChanges}
            setSelectedDNAChanges={setSelectedDNAChanges}
          />
          <ProteinChangeSelection
            selectedProteinChanges={selectedProteinChanges}
            setSelectedProteinChanges={setSelectedProteinChanges}
          />
        </div>
        <div className={`w-full md:w-2/3 ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg p-6 transition-colors duration-200`}>
          <VariationIDSelection
            selectedVariationIDs={selectedVariationIDs}
            setSelectedVariationIDs={setSelectedVariationIDs}
          />
          <QueryParameters
            clinicalSignificance={clinicalSignificance}
            setClinicalSignificance={setClinicalSignificance}
            outputFormat={outputFormat}
            setOutputFormat={setOutputFormat}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            handleReviewClick={handleReviewClick}
            selectedGenes={selectedGenes}
            selectedDNAChanges={selectedDNAChanges}
            selectedProteinChanges={selectedProteinChanges}
            selectedVariationIDs={selectedVariationIDs}
          />
        </div>
      </div>
      {user && queryHistory.length > 0 && (
        <div className="mt-8">
          <QueryHistory 
            queryHistory={queryHistory}
            onSelectQuery={handleSelectHistoricalQuery}
          />
        </div>
      )}
      {showReviewModal && (
        <ReviewModal
          setShowReviewModal={setShowReviewModal}
          selectedGenes={selectedGenes}
          selectedDNAChanges={selectedDNAChanges}
          selectedProteinChanges={selectedProteinChanges}
          selectedVariationIDs={selectedVariationIDs}
          clinicalSignificance={clinicalSignificance}
          startDate={startDate}
          endDate={endDate}
          outputFormat={outputFormat}
          handleSubmit={handleSubmit}
        />
      )}
      {showDownloadPrompt && (
        <DownloadPrompt
          setShowDownloadPrompt={setShowDownloadPrompt}
          onPreviewResults={handlePreviewResults}
          themeConstants={themeConstants}
        />
      )}
      {showResultsPreview && (
        <ResultsPreview
          results={queryResults}
          onClose={handleClosePreview}
        />
      )}
      {loading && <div className="mt-4 text-center">Loading...</div>}
      {error && <div className="mt-4 text-center text-red-500">{error}</div>}
      
      {/* Debug Information */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Debug Information:</h3>
        <pre className="whitespace-pre-wrap">{debugInfo}</pre>
      </div>
    </div>
  );
};

export default QueryPage;