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

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const QueryPage = ({ user }) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showResultsPreview, setShowResultsPreview] = useState(false);
  const [selectedGene, setSelectedGene] = useState(null);
  const [selectedDNAChange, setSelectedDNAChange] = useState('');
  const [selectedProteinChange, setSelectedProteinChange] = useState('');
  const [selectedVariationID, setSelectedVariationID] = useState('');
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
      geneSymbol: selectedGene, 
      dnaChange: selectedDNAChange, 
      proteinChange: selectedProteinChange, 
      variantId: selectedVariationID,
      clinicalSignificance, 
      outputFormat, 
      startDate, 
      endDate 
    };

    setDebugInfo(prev => prev + "\nQuery object: " + JSON.stringify(query, null, 2));

    try {
      if (!selectedGene && !selectedVariationID) {
        throw new Error("Please select either a Gene Symbol or a Variation ID");
      }

      setDebugInfo(prev => prev + `\nSending request to: ${SERVER_URL}/api/clinvar`);
      
      const response = await fetch(`${SERVER_URL}/api/clinvar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });
      
      setDebugInfo(prev => prev + `\nResponse status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDebugInfo(prev => prev + `\nReceived data: ${JSON.stringify(data).substring(0, 100)}...`);

      setQueryResults(data);

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
    setSelectedGene(query.geneSymbol || null);
    setSelectedDNAChange(query.dnaChange || '');
    setSelectedProteinChange(query.proteinChange || '');
    setSelectedVariationID(query.variantId || '');
    setClinicalSignificance(query.clinicalSignificance || []);
    setOutputFormat(query.outputFormat || '');
    setStartDate(query.startDate || '');
    setEndDate(query.endDate || '');
    setDebugInfo("Historical query selected");
  };

  const handlePreviewResults = () => {
    setShowResultsPreview(true);
    setDebugInfo("Results preview opened");
  };

  const handleClosePreview = () => {
    setShowResultsPreview(false);
    setDebugInfo("Results preview closed");
  };

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      <h1 className={`text-3xl font-bold mb-6 ${themeConstants.headingTextColor}`}>
        Create Your Query
      </h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className={`w-full md:w-1/3 ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg p-6 transition-colors duration-200`}>
          <GeneSelection
            selectedGene={selectedGene}
            setSelectedGene={setSelectedGene}
          />
          <DNAChangeSelection
            selectedDNAChange={selectedDNAChange}
            setSelectedDNAChange={setSelectedDNAChange}
          />
          <ProteinChangeSelection
            selectedProteinChange={selectedProteinChange}
            setSelectedProteinChange={setSelectedProteinChange}
          />
        </div>
        <div className={`w-full md:w-2/3 ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg p-6 transition-colors duration-200`}>
          <VariationIDSelection
            selectedVariationID={selectedVariationID}
            setSelectedVariationID={setSelectedVariationID}
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
            selectedGene={selectedGene}
            selectedDNAChange={selectedDNAChange}
            selectedProteinChange={selectedProteinChange}
            selectedVariationID={selectedVariationID}
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
          selectedGene={selectedGene}
          selectedDNAChange={selectedDNAChange}
          selectedProteinChange={selectedProteinChange}
          selectedVariationID={selectedVariationID}
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