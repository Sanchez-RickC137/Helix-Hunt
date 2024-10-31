import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useUser } from '../contexts/UserContext';
import GeneSelection from '../components/Query/GeneSelection';
import DNAChangeSelection from '../components/Query/DNAChangeSelection';
import ProteinChangeSelection from '../components/Query/ProteinChangeSelection';
import VariationIDSelection from '../components/Query/VariationIDSelection';
import QueryParameters from '../components/Query/QueryParameters';
import ReviewModal from '../components/Modals/ReviewModal';
import DownloadPrompt from '../components/Modals/DownloadPrompt';
import ResultsPreview from '../components/Modals/ResultsPreview';
import QueryHistory from '../components/Query/QueryHistory';
import timeOperation from '../utils/timing';
import { processAndFilterResults } from '../utils/resultFiltering';
import { useThemeConstants } from '../components/Page/ThemeConstants';

const QueryPage = () => {
  // User context and theme hooks
  const { user, preferences, queryHistory, saveQuery, fetchQueryHistory } = useUser();
  const themeConstants = useThemeConstants();

  // Modal state management
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showResultsPreview, setShowResultsPreview] = useState(false);

  // Query input state
  const [selectedGene, setSelectedGene] = useState('');
  const [selectedDNAChange, setSelectedDNAChange] = useState('');
  const [selectedProteinChange, setSelectedProteinChange] = useState('');
  const [fullName, setFullName] = useState('');
  const [addedFullNames, setAddedFullNames] = useState([]);
  const [addedVariationIDs, setAddedVariationIDs] = useState([]);

  // Query parameters state
  const [clinicalSignificance, setClinicalSignificance] = useState([]);
  const [outputFormat, setOutputFormat] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Results and status state
  const [queryResults, setQueryResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [debugInfo, setDebugInfo] = useState('');
  
  // Fetch query history on user login
  useEffect(() => {
    if (user) {
      fetchQueryHistory();
    }
  }, [user, fetchQueryHistory]);

  /**
   * Updates full name when gene, DNA change, or protein change selections change
   * Combines selections into a formatted full name string
   */
  useEffect(() => {
    if (selectedGene || selectedDNAChange || selectedProteinChange) {
      let newFullName = selectedGene || '';
      if (selectedDNAChange) newFullName += `:${selectedDNAChange}`;
      if (selectedProteinChange) newFullName += ` (${selectedProteinChange})`;
      setFullName(newFullName);
    } else {
      setFullName('');
    }
  }, [selectedGene, selectedDNAChange, selectedProteinChange]);

  /**
   * Adds current full name to query list
   * Clears selection fields after adding
   */
  const handleAddFullName = () => {
    if (fullName && !addedFullNames.includes(fullName)) {
      setAddedFullNames([...addedFullNames, fullName]);
      setSelectedGene('');
      setSelectedDNAChange('');
      setSelectedProteinChange('');
      setFullName('');
    }
  };

  /**
   * Adds variation ID to query list
   * @param {string} id - Variation ID to add
   */
  const handleAddVariationID = (id) => {
    if (id && !addedVariationIDs.includes(id)) {
      setAddedVariationIDs([...addedVariationIDs, id]);
    }
  };

  // Query list management functions
  const removeFullName = (nameToRemove) => {
    setAddedFullNames(addedFullNames.filter(name => name !== nameToRemove));
  };

  const removeVariationID = (idToRemove) => {
    setAddedVariationIDs(addedVariationIDs.filter(id => id !== idToRemove));
  };

  /**
   * Opens review modal and logs debug info
   */
  const handleReviewClick = () => {
    setShowReviewModal(true);
    setDebugInfo("Review modal opened");
  };

  /**
   * Resets all query inputs and parameters
   */
  const resetQuery = () => {
    setSelectedGene('');
    setSelectedDNAChange('');
    setSelectedProteinChange('');
    setFullName('');
    setAddedFullNames([]);
    setAddedVariationIDs([]);
    setClinicalSignificance([]);
    setOutputFormat('');
    setStartDate('');
    setEndDate('');
    setDebugInfo('Query reset');
  };

  /**
   * Submits query to backend and processes results
   * Handles error states and updates query history
   */
  const handleSubmit = async () => {
    setLoading(true);
    setErrors([]);
    setQueryResults(null);
    setDebugInfo("Query submission started");
  
    const query = {
      fullNames: addedFullNames,
      variationIDs: addedVariationIDs,
      clinicalSignificance,
      outputFormat,
      startDate,
      endDate
    };
  
    try {
      const response = await timeOperation('ClinVar query', () => 
        axiosInstance.post('/api/clinvar', query)
      );
      
      // Process and filter results
      const filteredResults = processAndFilterResults(response.data, {
        clinicalSignificance,
        startDate,
        endDate
      });
      
      setQueryResults(filteredResults);
      setShowReviewModal(false);
      setShowDownloadPrompt(true);
      
      // Save query to history if user is logged in
      if (user) {
        await timeOperation('Save query to history', () => 
          saveQuery(query)
        );
      }
    } catch (error) {
      console.error('Error performing ClinVar query:', error);
      setErrors([`Error fetching data: ${error.message}`]);
      setDebugInfo(prev => prev + `\nError performing query: ${error.message}`);
    } finally {
      setLoading(false);
      setDebugInfo(prev => prev + "\nQuery completed");
    }
  };

  const handleSelectHistoricalQuery = (query) => {
    setAddedFullNames(query.full_names || []);
    setAddedVariationIDs(query.variation_ids || []);
    setClinicalSignificance(query.clinical_significance || []);
    setOutputFormat(query.output_format || '');
    setStartDate(query.start_date || '');
    setEndDate(query.end_date || '');
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

  const handleLoadVariationIDPreferences = () => {
    setAddedVariationIDs(prevIDs => [...new Set([...prevIDs, ...(preferences.variationIDPreferences || [])])]);
    setDebugInfo("Variation ID preferences loaded");
  };

  const handleLoadFullNamePreferences = () => {
    setAddedFullNames(prevNames => [...new Set([...prevNames, ...(preferences.fullNamePreferences || [])])]);
    setDebugInfo("Full name preferences loaded");
  };

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      <h1 className={`text-3xl font-bold mb-6 ${themeConstants.headingTextColor}`}>
        Query Builder
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
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Generated Gene Full Name</h3>
            <div className="flex">
              <input
                type="text"
                value={fullName}
                readOnly
                className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50`}
              />
              <button
                onClick={handleAddFullName}
                className={`px-4 py-2 rounded-r ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
              >
                Add to Query
              </button>
            </div>
          </div>
          <VariationIDSelection
            addedVariationIDs={addedVariationIDs}
            onAddVariationID={handleAddVariationID}
          />
          {user && (
            <div className="flex justify-evenly space-x-4 mb-4">
              <button
                onClick={handleLoadFullNamePreferences}
                className={`flex items-center justify-center px-3 py-2 ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white rounded transition-colors duration-200`}
              >
                <span className="ml-2">Load Full Names</span>
              </button>
              <button
                onClick={handleLoadVariationIDPreferences}
                className={`flex items-center justify-center px-3 py-2 ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white rounded transition-colors duration-200`}
              >
                <span className="ml-2">Load Variation IDs</span>
              </button>
            </div>
          )}
        </div>
        <div className={`w-full md:w-2/3 ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg p-6 transition-colors duration-200`}>
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
            handleResetClick={resetQuery}
            addedFullNames={addedFullNames}
            addedVariationIDs={addedVariationIDs}
            removeFullName={removeFullName}
            removeVariationID={removeVariationID}
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
          addedFullNames={addedFullNames}
          addedVariationIDs={addedVariationIDs}
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
          results={queryResults}
        />
      )}
      {showResultsPreview && (
        <ResultsPreview
          results={queryResults}
          onClose={handleClosePreview}
        />
      )}
      {loading && <div className="mt-4 text-center">Loading...</div>}
      {errors.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Errors:</h3>
          <ul className="list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index} className="text-red-500">{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Debug Information:</h3>
        <pre className="whitespace-pre-wrap">{debugInfo}</pre>
      </div>
    </div>
  );
};

export default QueryPage;