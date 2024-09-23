import React from 'react';
import { useThemeConstants } from './ThemeConstants';
import GeneVariationSearch from './GeneVariationSearch';

const QueryParameters = ({
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
  // Get theme-related constants
  const themeConstants = useThemeConstants();

  // Check if form is valid
  const isFormValid = selectedGenes.length > 0 && outputFormat && startDate && endDate;

  // Handle clinical significance selection
  const handleClinicalSignificanceClick = (sig) => {
    if (clinicalSignificance === sig) {
      setClinicalSignificance('');
    } else {
      setClinicalSignificance(sig);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Query Parameters</h2>
      
      {/* Gene Variation Search component */}
      <GeneVariationSearch 
        geneVariationIDs={geneVariationIDs} 
        setGeneVariationIDs={setGeneVariationIDs}
      />
      
      {/* Clinical Significance selection */}
      <div>
        <label className={`block mb-1 font-medium ${themeConstants.labelAccentColor}`}>
          Clinical Significance
        </label>
        <div className="flex flex-wrap gap-2">
          {['Pathogenic', 'Likely pathogenic', 'Uncertain significance', 'Likely benign', 'Benign'].map((sig) => (
            <button
              key={sig}
              type="button"
              onClick={() => handleClinicalSignificanceClick(sig)}
              className={`px-3 py-1 rounded-full cursor-pointer ${
                clinicalSignificance === sig 
                  ? `${themeConstants.tagBackgroundColor} ${themeConstants.selectedItemTextColor}`
                  : `${themeConstants.unselectedItemBackgroundColor} hover:${themeConstants.unselectedItemHoverColor}`
              } transition-colors duration-200`}
            >
              {sig}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range selection */}
      <div>
        <label className={`block mb-1 font-medium ${themeConstants.labelAccentColor}`}>
          Date Range <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="w-full sm:w-1/2">
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition-colors duration-200`} 
              required
            />
          </div>
          <div className="w-full sm:w-1/2">
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition-colors duration-200`} 
              required
            />
          </div>
        </div>
      </div>

      {/* Output Format selection */}
      <div>
        <label className={`block mb-1 font-medium ${themeConstants.labelAccentColor}`}>
          Output Format <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {['XML', 'CSV', 'Tab-delimited'].map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => setOutputFormat(format)}
              className={`px-3 py-1 rounded-full cursor-pointer ${
                outputFormat === format 
                  ? `${themeConstants.tagBackgroundColor} ${themeConstants.selectedItemTextColor}`
                  : `${themeConstants.unselectedItemBackgroundColor} hover:${themeConstants.unselectedItemHoverColor}`
              } transition-colors duration-200`}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      {/* Review Query button */}
      <button 
        type="button" 
        onClick={handleReviewClick}
        disabled={!isFormValid}
        className={`w-full px-6 py-3 rounded-lg flex items-center justify-center ${
          isFormValid
            ? `${themeConstants.primaryButtonBackgroundColor} hover:${themeConstants.primaryButtonHoverColor} text-white`
            : 'bg-gray-400 cursor-not-allowed text-gray-200'
        } transition-colors duration-200`}
      >
        Review Query
      </button>

      {/* Form validation message */}
      {!isFormValid && (
        <p className={`text-sm ${themeConstants.labelTextColor}`}>
          Please select at least one gene, specify date range, and choose an output format.
        </p>
      )}
    </div>
  );
};

export default QueryParameters;