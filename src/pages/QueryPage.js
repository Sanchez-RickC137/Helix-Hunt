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
import SearchTypeToggle from '../components/Search/SearchTypeToggle';
import QuerySourceToggle from '../components/Search/QuerySourceToggle.js';
import GeneralSearchInput from '../components/Search/GeneralSearchInput';
import GeneralQueryParameters from '../components/Search/GeneralQueryParameters';

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
  const [searchType, setSearchType] = useState('targeted');
  const [searchGroups, setSearchGroups] = useState([]);
  const [querySource, setQuerySource] = useState('web');

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

  const InlineQueryToggle = React.memo(function InlineQueryToggle({ querySource, setQuerySource }) {
    return (
      <div className="flex items-center justify-center relative">
      <div className={`inline-flex rounded-lg p-1 ${themeConstants.unselectedItemBackgroundColor}`}>
        <div className="relative">
          <button
            onClick={() => setQuerySource('web')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center ${
              querySource === 'web'
                ? `${themeConstants.buttonBackgroundColor} text-white`
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Web Query
          </button>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setQuerySource('database')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center ${
              querySource === 'database'
                ? `${themeConstants.buttonBackgroundColor} text-white`
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Database Query
            
          </button>
        </div>
      </div>
    </div>
    );
  });
  
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

  /**
   * Add a search group to the query list
   * @param {Array} group 
   */
  const handleAddSearchGroup = (group) => {
    setSearchGroups(prev => [...prev, group]);
  };
  
  /**
   * Removes a search group to the query list
   * @param {Array} group 
   */
  const handleRemoveSearchGroup = (index) => {
    setSearchGroups(prev => prev.filter((_, i) => i !== index));
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
    if (searchType === 'targeted') {
      setSelectedGene('');
      setSelectedDNAChange('');
      setSelectedProteinChange('');
      setFullName('');
      setAddedFullNames([]);
      setAddedVariationIDs([]);
    } else {
      setSearchGroups([]);
    }
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
  
    const queryType = `(${searchType}, ${querySource})`;
    const start = performance.now();
  
    try {
      let response;
      
      if (querySource === 'web') {
        // Web-based queries
        if (searchType === 'targeted') {
          const queryParams = {
            fullNames: addedFullNames,
            variationIDs: addedVariationIDs,
            clinicalSignificance,
            startDate,
            endDate
          };
          response = await axiosInstance.post('/api/clinvar', queryParams);
        } else {
          const queryParams = {
            searchGroups,
            clinicalSignificance,
            startDate,
            endDate
          };
          response = await axiosInstance.post('/api/clinvar/general', queryParams);
        }
      } else {
        // Database queries
        if (searchType === 'targeted') {
          if (addedVariationIDs.length > 0) {
            response = await axiosInstance.post('/api/database/variation-id', {
              variationId: addedVariationIDs[0]
            });
          } else if (addedFullNames.length > 0) {
            response = await axiosInstance.post('/api/database/full-name', {
              fullName: addedFullNames[0]
            });
          } else {
            throw new Error('No valid search criteria provided');
          }
        } else {
          response = await axiosInstance.post('/api/database/general-search', {
            searchGroups: searchGroups.map(group => ({
              geneSymbol: group.geneSymbol || null,
              dnaChange: group.dnaChange || null,
              proteinChange: group.proteinChange || null
            }))
          });
        }
      }
  
      const end = performance.now();
      const duration = (end - start) / 1000; // Convert to seconds
      console.log(`Query ${queryType} completed in ${duration.toFixed(2)} seconds`);
  
      const filteredResults = processAndFilterResults(response.data, {
        clinicalSignificance,
        startDate,
        endDate
      });
  
      setQueryResults(filteredResults);
      setShowReviewModal(false);
      setShowDownloadPrompt(true);
  
      if (user) {
        const queryToSave = {
          search_type: searchType,
          query_source: querySource,
          full_names: searchType === 'targeted' ? addedFullNames : [],
          variation_ids: searchType === 'targeted' ? addedVariationIDs : [],
          search_groups: searchType === 'general' ? searchGroups : [],
          clinical_significance: clinicalSignificance,
          start_date: startDate,
          end_date: endDate
        };
        await saveQuery(queryToSave);
      }
  
    } catch (error) {
      console.error(`Error performing ${queryType} query:`, error);
      let errorMessage = 'Error fetching data: ';
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.response?.data?.details) {
        errorMessage += error.response.data.details;
      } else {
        errorMessage += error.message;
      }
      setErrors([errorMessage]);
      setDebugInfo(prev => `${prev}\nError performing query: ${errorMessage}`);
    } finally {
      setLoading(false);
      setDebugInfo(prev => `${prev}\nQuery completed`);
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
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-3xl font-bold ${themeConstants.headingTextColor}`}>
          Query Builder
        </h1>
        
        {/* Center SearchTypeToggle */}
        <div className="flex-grow flex justify-center">
          <SearchTypeToggle 
            searchType={searchType}
            setSearchType={setSearchType}
          />
        </div>
        
        {/* Right-aligned QuerySourceToggle */}
        <div className="flex items-center">
          <InlineQueryToggle 
            querySource={querySource}
            setQuerySource={setQuerySource}
          />
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-8">
        <div className={`w-full md:w-1/3 ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg p-6`}>
          {searchType === 'targeted' ? (
          <>
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
          </>
        ) : (
          // General search input
          <GeneralSearchInput onAddSearchGroup={handleAddSearchGroup} />
        )}
      </div>

      <div className={`w-full md:w-2/3 ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg p-6`}>
        {searchType === 'targeted' ? (
          // Original query parameters
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
        ) : (
          // General query parameters
          <GeneralQueryParameters
            searchGroups={searchGroups}
            removeSearchGroup={handleRemoveSearchGroup}
            clinicalSignificance={clinicalSignificance}
            setClinicalSignificance={setClinicalSignificance}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            handleReviewClick={handleReviewClick}
            handleResetClick={resetQuery}
          />
        )}
      </div>
    </div>

    {/* Keep the existing query history section */}
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
          searchType={searchType}  // Add this line
          addedFullNames={searchType === 'targeted' ? addedFullNames : []}
          addedVariationIDs={searchType === 'targeted' ? addedVariationIDs : []}
          searchGroups={searchType === 'general' ? searchGroups : []}
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
      
      {debugInfo && (
      <div className={`mt-8 p-4 ${themeConstants.sectionBackgroundColor} rounded-lg`}>
        <h3 className={`text-lg font-semibold mb-2 ${themeConstants.headingTextColor}`}>Debug Information:</h3>
        <pre className={`whitespace-pre-wrap ${themeConstants.mainTextColor}`}>{debugInfo}</pre>
      </div>
    )}
    </div>
  );
};

export default QueryPage;