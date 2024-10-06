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

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const QueryPage = ({ user }) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showResultsPreview, setShowResultsPreview] = useState(false);
  const [selectedGene, setSelectedGene] = useState('');
  const [selectedDNAChange, setSelectedDNAChange] = useState('');
  const [selectedProteinChange, setSelectedProteinChange] = useState('');
  const [fullName, setFullName] = useState('');
  const [addedFullNames, setAddedFullNames] = useState([]);
  const [addedVariationIDs, setAddedVariationIDs] = useState([]);
  const [clinicalSignificance, setClinicalSignificance] = useState([]);
  const [outputFormat, setOutputFormat] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [queryHistory, setQueryHistory] = useState([]);
  const [queryResults, setQueryResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
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

  useEffect(() => {
    // Generate full name when gene, DNA change, or protein change is updated
    if (selectedGene || selectedDNAChange || selectedProteinChange) {
      let newFullName = selectedGene || '';
      if (selectedDNAChange) newFullName += `:${selectedDNAChange}`;
      if (selectedProteinChange) newFullName += ` (${selectedProteinChange})`;
      setFullName(newFullName);
    } else {
      setFullName('');
    }
  }, [selectedGene, selectedDNAChange, selectedProteinChange]);

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

  const handleSubmit = async () => {
    setLoading(true);
    setErrors([]);
    setQueryResults([]);
    setDebugInfo("Query submission started");

    const queries = [...addedFullNames, ...addedVariationIDs];

    if (queries.length === 0) {
      setErrors(["No queries added. Please add at least one full name or variation ID."]);
      setLoading(false);
      return;
    }

    const results = [];
    const newErrors = [];

    for (const query of queries) {
      const isVariationID = addedVariationIDs.includes(query);
      const queryObject = {
        geneSymbol: isVariationID ? '' : query.split(':')[0],
        dnaChange: isVariationID ? '' : (query.split(':')[1] || '').split(' ')[0],
        proteinChange: isVariationID ? '' : (query.match(/\(([^)]+)\)/) || [])[1] || '',
        variantId: isVariationID ? query : '',
        clinicalSignificance,
        outputFormat,
        startDate,
        endDate
      };

      setDebugInfo(prev => prev + `\nSending request for query: ${JSON.stringify(queryObject)}`);

      try {
        const response = await fetch(`${SERVER_URL}/api/clinvar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(queryObject),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        results.push({ query, data });
        setDebugInfo(prev => prev + `\nReceived data for query: ${query}`);
      } catch (error) {
        console.error(`Error performing ClinVar query for ${query}:`, error);
        newErrors.push(`Error fetching data for ${query}: ${error.message}`);
        setDebugInfo(prev => prev + `\nError performing query for ${query}: ${error.message}`);
      }
    }

    setQueryResults(results);
    setErrors(newErrors);

    if (user) {
      try {
        const queryToSave = {
          fullNames: addedFullNames,
          variationIDs: addedVariationIDs,
          clinicalSignificance,
          outputFormat,
          startDate,
          endDate
        };
        const updatedHistory = await addQueryToHistory(user.id, queryToSave);
        setQueryHistory(updatedHistory);
        setDebugInfo(prev => prev + "\nQuery added to history");
      } catch (error) {
        console.error("Error adding query to history:", error);
        setDebugInfo(prev => prev + "\nError adding query to history: " + error.message);
      }
    }

    setShowReviewModal(false);
    setShowDownloadPrompt(true);
    setLoading(false);
    setDebugInfo(prev => prev + "\nQuery completed");
  };

  const handleSelectHistoricalQuery = (query) => {
    setAddedFullNames(query.fullNames || []);
    setAddedVariationIDs(query.variationIDs || []);
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
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Generated Full Name</h3>
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
                Add
              </button>
            </div>
          </div>
          <VariationIDSelection
            addedVariationIDs={addedVariationIDs}
            onAddVariationID={handleAddVariationID}
          />
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
      
      {/* Debug Information */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Debug Information:</h3>
        <pre className="whitespace-pre-wrap">{debugInfo}</pre>
      </div>
    </div>
  );
};

export default QueryPage;