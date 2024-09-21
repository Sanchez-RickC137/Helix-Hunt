// components/QueryParameters.js
import React from 'react';
import GeneVariationSearch from './GeneVariationSearch';

const QueryParameters = ({
  isDarkMode,
  selectedGenes,
  clinicalSignificance,
  setClinicalSignificance,
  outputFormat,
  setOutputFormat,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  geneVariationIDs,
  setGeneVariationIDs,
  handleReviewClick
}) => {
  const isFormValid = selectedGenes.length > 0 && outputFormat && startDate && endDate;

  const onAddID = (newID) => {
    if (newID && !geneVariationIDs.includes(newID)) {
      setGeneVariationIDs([...geneVariationIDs, newID]);
    }
  };

  const onRemoveID = (idToRemove) => {
    setGeneVariationIDs(geneVariationIDs.filter(id => id !== idToRemove));
  };

  return (
    <div className="w-full">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 h-full transition-colors duration-200`}>
        <h2 className="text-xl font-semibold mb-4">Query Parameters</h2>
        <form className="space-y-6">
          <GeneVariationSearch 
            isDarkMode={isDarkMode} 
            geneVariationIDs={geneVariationIDs} 
            onAddID={onAddID}
            onRemoveID={onRemoveID}
          />
          <div>
            <label className={`block mb-1 font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
              Clinical Significance
            </label>
            <div className="flex flex-wrap gap-2">
              {['Pathogenic', 'Likely pathogenic', 'Uncertain significance', 'Likely benign', 'Benign'].map((sig) => (
                <button
                  key={sig}
                  type="button"
                  onClick={() => setClinicalSignificance(sig)}
                  className={`px-3 py-1 rounded-full cursor-pointer ${clinicalSignificance === sig 
                    ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') 
                    : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')} transition-colors duration-200`}
                >
                  {sig}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`block mb-1 font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
              Date Range <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full p-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition-colors duration-200`} 
                  required
                />
              </div>
              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full p-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition-colors duration-200`} 
                  required
                />
              </div>
            </div>
          </div>
          <div>
            <label className={`block mb-1 font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
              Output Format <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {['XML', 'CSV', 'Tab-delimited'].map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setOutputFormat(format)}
                  className={`px-3 py-1 rounded-full cursor-pointer ${outputFormat === format 
                    ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') 
                    : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')} transition-colors duration-200`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleReviewClick}
            disabled={!isFormValid}
            className={`w-full px-6 py-3 rounded-lg flex items-center justify-center ${
              isFormValid
                ? (isDarkMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white')
                : 'bg-gray-400 cursor-not-allowed text-gray-200'
            } transition-colors duration-200`}
          >
            Review Query
          </button>
          {!isFormValid && (
            <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              Please select at least one gene, specify date range, and choose an output format.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default QueryParameters;