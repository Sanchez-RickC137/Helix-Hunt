import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useUser } from '../contexts/UserContext';
// import { useHelp } from '../contexts/HelpContext';
import { useThemeConstants } from '../components/Page/ThemeConstants';

// Component Imports
import StepByStepGuide from '../components/Help/StepByStepGuide';
// import HelpTooltip from '../components/Help/HelpTooltip';
import { getGuideSteps, getStepToSection } from '../utils/stepGuideConfig';
import FloatingHelp from '../components/Help/FloatingHelp';

import SearchTypeToggle from '../components/Toggle/SearchTypeToggle';
import QuerySourceToggle from '../components/Toggle/QuerySourceToggle';
import FullNameToggle from '../components/Toggle/FullNameToggle';

import GeneSelection from '../components/Query/GeneSelection';
import DNAChangeSelection from '../components/Query/DNAChangeSelection';
import ProteinChangeSelection from '../components/Query/ProteinChangeSelection';
import VariationIDSelection from '../components/Query/VariationIDSelection';
import QueryParameters from '../components/Query/QueryParameters';
import GeneralQueryParameters from '../components/Search/GeneralQueryParameters';
import GeneralSearchInput from '../components/Search/GeneralSearchInput';

import ReviewModal from '../components/Modals/ReviewModal';
import DownloadPrompt from '../components/Modals/DownloadPrompt';
import ResultsPreview from '../components/Modals/ResultsPreview';
import QueryHistory from '../components/Query/QueryHistory';




// const FullNameToggle = React.memo(function FullNameToggle({ isFullName, setIsFullName }) {
//   const themeConstants = useThemeConstants();
//   const [showSymbolHelp, setShowSymbolHelp] = useState(false);
//   const [showFullNameHelp, setShowFullNameHelp] = useState(false);

//   const symbolHelpText = "Build your query using a Transcript ID and Gene Symbol along with DNA change and Protein Change";
//   const fullNameHelpText = "Build your query using a Full Gene Name. If unsure of formatting use the Transcript ID / Gene Symbol option";
  
//   return (
//     <div className="flex items-center justify-center relative mb-4">
//       <div className={`inline-flex rounded-lg p-1 ${themeConstants.unselectedItemBackgroundColor}`}>
//         <div className="relative">
//           <button
//             onClick={() => {
//               setIsFullName(false);
//             }}
//             className={`px-3 sm:px-4 py-2 rounded-md text-md sm:text-md font-semibold font-medium transition-colors duration-200 flex items-center ${
//               !isFullName
//                 ? `${themeConstants.sectionBackgroundColor} border ${themeConstants.buttonBorderColor}`
//                 : `${themeConstants.unselectedItemBackgroundColor}`
//             }`}
//           >
//             <span className="hidden sm:inline">Transcript ID / Gene Symbol</span>
//             <span className="sm:hidden">Transcript ID / Gene Symbol</span>
//             <div 
//                 className="ml-1 relative"
//                 onMouseEnter={() => setShowSymbolHelp(true)}
//                 onMouseLeave={() => setShowSymbolHelp(false)}
//               >
//                 <HelpCircle size={16} className="text-current" />
//             </div>
//           </button>
//           {showSymbolHelp && (
//             <div className="absolute z-50 top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg w-64">
//               {symbolHelpText}
//             </div>
//           )}
//         </div>
//         <div className="relative">
//           <button
//             onClick={() => {
//               setIsFullName(true);
//             }}
//             className={`px-3 sm:px-4 py-2 rounded-md text-md sm:text-md font-semibold font-medium transition-colors duration-200 flex items-center ${
//               isFullName
//                 ? `${themeConstants.sectionBackgroundColor} border ${themeConstants.buttonBorderColor}`
//                 : `${themeConstants.unselectedItemBackgroundColor}`
//             }`}
//           >
//             <span className="hidden sm:inline">Full Gene Name</span>
//             <span className="sm:hidden">Full Gene Name</span>
//             <div 
//                 className="ml-1 relative"
//                 onMouseEnter={() => setShowFullNameHelp(true)}
//                 onMouseLeave={() => setShowFullNameHelp(false)}
//               >
//                 <HelpCircle size={16} className="text-current" />
//             </div>
//           </button>
//           {showFullNameHelp && (
//             <div className="absolute z-50 top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg w-64">
//               {fullNameHelpText}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// });


// const InlineQueryToggle = React.memo(function InlineQueryToggle({ querySource, setQuerySource }) {
//   const themeConstants = useThemeConstants();
//   const [showWebHelp, setShowWebHelp] = useState(false);
//   const [showDatabaseHelp, setDatabaseHelp] = useState(false);

//   const webHelpText = "Use the Clinvar website as the query source. Information will be more up to date and comprehensive but may take longer to retrieve.";
//   const databaseHelpText = "Use the local database as the query source. Information is updated weekly and will be return more quickly.";

//   return (
//     <div className="flex items-center justify-center relative">
//       <div className={`inline-flex rounded-lg p-1 ${themeConstants.unselectedItemBackgroundColor}`}>
//         <div className="relative">
//           <button
//             onClick={() => setQuerySource('web')}
//             className={`px-4 py-2 rounded-md text-md font-medium font-semibold transition-colors duration-200 flex items-center ${
//               querySource === 'web'
//                 ? `${themeConstants.sectionBackgroundColor} border ${themeConstants.buttonBorderColor}`
//                 : `${themeConstants.unselectedItemBackgroundColor}`
//             }`}
//           >
//             Web Query
//             <div 
//               className="ml-1 relative"
//               onMouseEnter={() => setShowWebHelp(true)}
//               onMouseLeave={() => setShowWebHelp(false)}
//             >
//               <HelpCircle size={16} className="text-current" />
//             </div>
//           </button>
//           {showWebHelp && (
//             <div className="absolute z-50 top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg w-64">
//               {webHelpText}
//             </div>
//           )}
//         </div>
      
//       <div className="relative">
//         <button
//           onClick={() => setQuerySource('database')}
//           className={`px-4 py-2 rounded-md text-md font-medium font-semibold transition-colors duration-200 flex items-center ${
//             querySource === 'database'
//               ? `${themeConstants.sectionBackgroundColor} border ${themeConstants.buttonBorderColor}`
//               : `${themeConstants.unselectedItemBackgroundColor}`
//           }`}
//         >
//           Database Query
//           <div 
//               className="ml-1 relative"
//               onMouseEnter={() => setDatabaseHelp(true)}
//               onMouseLeave={() => setDatabaseHelp(false)}
//             >
//               <HelpCircle size={16} className="text-current" />
//             </div>
//           </button>
//           {showDatabaseHelp && (
//             <div className="absolute z-50 top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg w-64">
//               {databaseHelpText}
//             </div>
//           )}
//       </div>
//     </div>
//   </div>
//   );
// });

const QueryPage = () => {
  const { user, preferences, queryHistory, saveQuery, fetchQueryHistory } = useUser();
  const [activeHelp, setActiveHelp] = useState(null);
  const themeConstants = useThemeConstants();

  // UI State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showResultsPreview, setShowResultsPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  // eslint-disable-next-line
  const [debugInfo, setDebugInfo] = useState(''); // Disabled eslint while debug is not being used

  // Search Configuration State
  const [searchType, setSearchType] = useState('targeted');
  const [querySource, setQuerySource] = useState('web');
  const [isFullName, setIsFullName] = useState(false);
  const [searchGroups, setSearchGroups] = useState([]);

  // Query Input State
  const [selectedGene, setSelectedGene] = useState('');
  const [selectedDNAChange, setSelectedDNAChange] = useState('');
  const [selectedProteinChange, setSelectedProteinChange] = useState('');
  const [fullName, setFullName] = useState('');
  const [addedFullNames, setAddedFullNames] = useState([]);
  const [addedVariationIDs, setAddedVariationIDs] = useState([]);

  // Filter State
  const [clinicalSignificance, setClinicalSignificance] = useState([]);
  const [outputFormat, setOutputFormat] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Results State
  const [queryResults, setQueryResults] = useState([]);

  // Step Guide State
  const [stepGuideState, setStepGuideState] = useState({
    currentStep: 0
  });

  const steps = getGuideSteps(searchType);
  const stepToSection = getStepToSection(steps);
  const [helpElement, setHelpElement] = useState(null);

  // // Help Feature Handlers
  // const handleToggleStepthrough = useCallback((active) => {
  //   if (active) {
  //     resetQuery();
  //     setStepGuideState({ currentStep: 0 });
  //   }
  // }, []);

  // Fetch user's query history on mount
  useEffect(() => {
    if (user) {
      fetchQueryHistory();
    }
  }, [user, fetchQueryHistory]);

  // Generate full name from components
  useEffect(() => {
    if (isFullName) {
      setFullName(selectedGene);
    } else if (selectedGene || selectedDNAChange || selectedProteinChange) {
      let newFullName = selectedGene || '';
      if (selectedDNAChange) newFullName += `:${selectedDNAChange}`;
      if (selectedProteinChange) newFullName += ` (${selectedProteinChange})`;
      setFullName(newFullName);
    } else {
      setFullName('');
    }
  }, [selectedGene, selectedDNAChange, selectedProteinChange, isFullName]);

  // Cleanup contextual help
  useEffect(() => {
    return () => {
      document.querySelectorAll('[data-help]').forEach(element => {
        element.classList.remove('help-enabled');
      });
    };
  }, []);

  // Query Handlers
  const handleAddFullName = () => {
    if (fullName && !addedFullNames.includes(fullName)) {
      setAddedFullNames([...addedFullNames, fullName]);
      setSelectedGene('');
      setSelectedDNAChange('');
      setSelectedProteinChange('');
      setFullName('');
    }
  };

  const handleAddVariationID = (id) => {
    if (id && !addedVariationIDs.includes(id)) {
      setAddedVariationIDs([...addedVariationIDs, id]);
    }
  };

  const handleAddSearchGroup = (group) => {
    setSearchGroups(prev => [...prev, group]);
  };

  const handleRemoveSearchGroup = (index) => {
    setSearchGroups(prev => prev.filter((_, i) => i !== index));
  };

  const removeFullName = (nameToRemove) => {
    setAddedFullNames(addedFullNames.filter(name => name !== nameToRemove));
  };

  const removeVariationID = (idToRemove) => {
    setAddedVariationIDs(addedVariationIDs.filter(id => id !== idToRemove));
  };

  const handleReviewClick = () => {
    setShowReviewModal(true);
    setDebugInfo("Review modal opened");
  };

  const resetQuery = () => {
    if (searchType === 'targeted') {
      setSelectedGene('');
      setSelectedDNAChange('');
      setSelectedProteinChange('');
      setFullName('');
      setAddedFullNames([]);
      setAddedVariationIDs([]);
      setIsFullName(false);
    } else {
      setSearchGroups([]);
    }
    setClinicalSignificance([]);
    setOutputFormat('');
    setStartDate('');
    setEndDate('');
    setDebugInfo('Query reset');
  };

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
              variationId: addedVariationIDs[0],
              clinicalSignificance,
              startDate,
              endDate
            });
          } else if (addedFullNames.length > 0) {
            response = await axiosInstance.post('/api/database/full-name', {
              fullName: addedFullNames[0],
              clinicalSignificance,
              startDate,
              endDate
            });
          } else {
            throw new Error('No valid search criteria provided');
          }
        } else {
          // General database search
          response = await axiosInstance.post('/api/database/general-search', {
            searchGroups: searchGroups.map(group => ({
              geneSymbol: group.geneSymbol || null,
              dnaChange: group.dnaChange || null,
              proteinChange: group.proteinChange || null
            })),
            clinicalSignificance,
            startDate,
            endDate
          });
        }
      }
  
      const end = performance.now();
      const duration = (end - start) / 1000;
      console.log(`Query ${queryType} completed in ${duration.toFixed(2)} seconds`);
      console.log('Query parameters:', {
        searchGroups,
        clinicalSignificance,
        startDate,
        endDate
      });
      
      setQueryResults(response.data);
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
    setSearchType(query.search_type || 'targeted');
    setQuerySource(query.query_source || 'web');
    setAddedFullNames(query.full_names || []);
    setAddedVariationIDs(query.variation_ids || []);
    setSearchGroups(query.search_groups || []);
    setClinicalSignificance(query.clinical_significance || []);
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

  // const handleHelpSelect = (option) => {
  //   setActiveHelp(option);
  //   if (option === 'contextHelp') {
  //     // Enable hover listeners for help tooltips when contextual help is active
  //     document.querySelectorAll('[data-help]').forEach(element => {
  //       element.classList.add('help-enabled');
  //     });
  //   } else if (option?.id === 'stepthrough') {
  //     setStepGuideState({ currentStep: 0 });
  //   } else {
  //     // Disable hover listeners when contextual help is inactive
  //     document.querySelectorAll('[data-help]').forEach(element => {
  //       element.classList.remove('help-enabled');
  //     });
  //   }
  // };

  const renderHelpTooltip = (children, content, maxWidth = 'max-w-xs') => {
    if (activeHelp === 'contextHelp') {
      return (
        <div
          data-help={content}
          className="relative group"
          onMouseEnter={(e) => setHelpElement(e.currentTarget)}
          onMouseLeave={() => setHelpElement(null)}
        >
          {children}
          {helpElement?.dataset.help === content && (
            <div className={`absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 ${maxWidth}`}>
              <div className="px-3 py-2 text-sm text-white bg-gray-900 rounded shadow-lg break-words">
                {content}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
              </div>
            </div>
          )}
        </div>
      );
    }
    return children;
  };

  const renderHelpTooltip2 = (children, content, maxWidth = 'max-w-xs') => {
    if (activeHelp === 'contextHelp') {
      return (
        <div
          data-help={content}
          className="relative group"
          onMouseEnter={(e) => setHelpElement(e.currentTarget)}
          onMouseLeave={() => setHelpElement(null)}
        >
          {children}
          {helpElement?.dataset.help === content && (
            <div className="fixed z-50" style={{
              top: `${helpElement.getBoundingClientRect().top - 10}px`,
              left: `${helpElement.getBoundingClientRect().left + (helpElement.offsetWidth / 2)}px`,
              transform: 'translateX(-50%) translateY(-100%)'
            }}>
              <div className={`${maxWidth} px-3 py-2 text-sm text-white bg-gray-900 rounded shadow-lg break-words`}>
                {content}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
              </div>
            </div>
          )}
        </div>
      );
    }
    return children;
  };

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        <h1 className={`text-3xl font-bold ${themeConstants.headingTextColor} mb-4 md:mb-0`}>
          Query Builder
        </h1>
        
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 w-full md:w-auto">
          <div id="search-type-toggle" className="flex-grow md:flex-grow-0 md:mr-4">
            {renderHelpTooltip2(
              <SearchTypeToggle 
                searchType={searchType}
                setSearchType={setSearchType}
              />,
              "Choose between targeted search for specific variants or general search across multiple criteria",
              "max-w-sm"
            )}
          </div>
        
          <div id="query-source-toggle" className="flex-grow md:flex-grow-0">
            {renderHelpTooltip2(
              <QuerySourceToggle 
                querySource={querySource}
                setQuerySource={setQuerySource}
              />,
              "Select between live ClinVar web data or local database query",
              "max-w-sm"
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column - Search Inputs */}
        <div className={`w-full md:w-1/3 ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg p-6`}>
          {searchType === 'targeted' ? (
            <>
              {renderHelpTooltip(
                <div id="name-toggle">
                  <FullNameToggle 
                    isFullName={isFullName}
                    setIsFullName={setIsFullName}
                  />
                </div>,
                "Choose between using gene symbol/transcript ID or full gene name format"
              )}

              {renderHelpTooltip(
                <div id="gene-input">
                  <GeneSelection
                    selectedGene={selectedGene}
                    setSelectedGene={setSelectedGene}
                    disabled={isFullName}
                  />
                </div>,
                "Enter a gene symbol or transcript ID. Matching results will populate to guide your search"
              )}

              {renderHelpTooltip(
                <div id="dna-change">
                  <DNAChangeSelection
                    selectedDNAChange={selectedDNAChange}
                    setSelectedDNAChange={setSelectedDNAChange}
                    disabled={(!selectedGene && !isFullName) || isFullName}
                  />
                </div>,
                "Specify the DNA change associated with this variant. Matching results will populate to guide your search"
              )}

              {renderHelpTooltip(
                <div id="protein-change">
                  <ProteinChangeSelection
                    selectedProteinChange={selectedProteinChange}
                    setSelectedProteinChange={setSelectedProteinChange}
                    disabled={(!selectedDNAChange && !isFullName) || isFullName}
                  />
                </div>,
                "Specify the protein change associated with this variant. Matching results will populate to guide your search"
              )}

              {renderHelpTooltip(
                <div id="add-to-query" className="mt-4 mb-3">
                  <h3 className="text-lg font-semibold mb-2">Generated Gene Full Name</h3>
                  <div className="flex">
                    <input
                      type="text"
                      value={fullName}
                      readOnly
                      className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor}`}
                    />
                    <button
                      onClick={handleAddFullName}
                      className={`px-4 py-2 rounded-r ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
                    >
                      Add to Query
                    </button>
                  </div>
                </div>,
                "Generated full name from your selections - click Add to Query to include in search"
              )}

              {renderHelpTooltip(
                <div id="variation-id">
                  <VariationIDSelection
                    addedVariationIDs={addedVariationIDs}
                    onAddVariationID={handleAddVariationID}
                  />
                </div>,
                "Enter a specific ClinVar variation ID - click Add to Query to include in search"
              )}

              {/* User preferences buttons */}
              {user && (
                <div className="flex justify-evenly space-x-4 mb-4">
                  {renderHelpTooltip(
                    <button
                      onClick={handleLoadFullNamePreferences}
                      className={`flex items-center justify-center px-3 py-2 ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white rounded transition-colors duration-200`}
                    >
                      <span className="ml-2">Load Full Names</span>
                    </button>,
                    "Load your saved full name preferences"
                  )}
                  {renderHelpTooltip(
                    <button
                      onClick={handleLoadVariationIDPreferences}
                      className={`flex items-center justify-center px-3 py-2 ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white rounded transition-colors duration-200`}
                    >
                      <span className="ml-2">Load Variation IDs</span>
                    </button>,
                    "Load your saved variation ID preferences"
                  )}
                </div>
              )}
            </>
          ) : (
            
            <div id="search-group">
            {renderHelpTooltip(
              <GeneralSearchInput onAddSearchGroup={handleAddSearchGroup} />,
              "Create search groups consisting of any combination gene symbol, dna change, protein change. At least one must be entered to generate a search group"
            )}
          </div>
              
          )}
        </div>

        {/* Right Column - Parameters and Actions */}
        <div className={`w-full md:w-2/3 ${themeConstants.sectionBackgroundColor} rounded-lg shadow-lg p-6`}>
          {searchType === 'targeted' ? (
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
              activeGuideSection={stepToSection[stepGuideState.currentStep]}
              helpElement={helpElement}
              setHelpElement={setHelpElement}
              activeHelp={activeHelp}
            />
          ) : (
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
              activeGuideSection={stepToSection[stepGuideState.currentStep]}
              helpElement={helpElement}
              setHelpElement={setHelpElement}
              activeHelp={activeHelp}
            />
          )}
        </div>
      </div>

      

      {/* Query History */}
      {user && queryHistory.length > 0 && (
        <div className="mt-8">
          <QueryHistory 
            queryHistory={queryHistory}
            onSelectQuery={handleSelectHistoricalQuery}
          />
        </div>
      )}

      {/* Modals */}
      {showReviewModal && (
        <ReviewModal
          setShowReviewModal={setShowReviewModal}
          searchType={searchType}
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

      {/* Loading State */}
      {loading && (
        <div className="mt-4 text-center">
          <div className={`inline-block ${themeConstants.buttonBackgroundColor} text-white px-4 py-2 rounded-lg`}>
            Processing Query...
          </div>
        </div>
      )}

      {/* Error Display */}
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
      
      {/* Debug Information */}
      {/* {debugInfo && (
        <div className={`mt-8 p-4 ${themeConstants.sectionBackgroundColor} rounded-lg`}>
          <h3 className={`text-lg font-semibold mb-2 ${themeConstants.headingTextColor}`}>Debug Information:</h3>
          <pre className={`whitespace-pre-wrap ${themeConstants.mainTextColor}`}>{debugInfo}</pre>
        </div>
      )} */}

      {activeHelp === 'stepthrough' && (
        <div className="fixed inset-0 z-40 overflow-hidden flex items-end justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setActiveHelp(null)} />
          <div className="relative z-50 w-full sm:w-[480px] mx-4 mb-4">
            <StepByStepGuide
              isActive={true}
              onComplete={() => setActiveHelp(null)}
              onSkip={() => setActiveHelp(null)}
              searchType={searchType}
              currentStep={stepGuideState.currentStep}
              setCurrentStep={(step) => setStepGuideState(prev => ({ ...prev, currentStep: step }))}
              querySource={querySource}
              steps={steps}
            />
          </div>
        </div>
      )}
      <FloatingHelp 
        activeHelp={activeHelp}
        setActiveHelp={setActiveHelp}
        stepGuideActive={activeHelp === 'stepthrough'}
      />
    </div>
  );
};
export default QueryPage;