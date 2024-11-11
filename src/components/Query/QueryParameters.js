/**
 * Query parameters configuration component
 * Handles selection of clinical significance, date ranges, and display of selected queries
 * 
 * @param {Object} props
 * @param {string[]} props.clinicalSignificance - Selected clinical significance values
 * @param {Function} props.setClinicalSignificance - Updates clinical significance selection
 * @param {string} props.startDate - Start date for query range
 * @param {Function} props.setStartDate - Updates start date
 * @param {string} props.endDate - End date for query range
 * @param {Function} props.setEndDate - Updates end date
 * @param {Function} props.handleReviewClick - Handler for review button click
 * @param {Function} props.handleResetClick - Handler for reset button click
 * @param {string[]} props.addedFullNames - List of selected full names
 * @param {string[]} props.addedVariationIDs - List of selected variation IDs
 * @param {Function} props.removeFullName - Handler to remove a full name
 * @param {Function} props.removeVariationID - Handler to remove a variation ID
 */

import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';
import { X, RotateCcw } from 'lucide-react';

const QueryParameters = ({
  clinicalSignificance,
  setClinicalSignificance,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  handleReviewClick,
  handleResetClick,
  addedFullNames,
  addedVariationIDs,
  removeFullName,
  removeVariationID,
  activeGuideSection
}) => {
  const themeConstants = useThemeConstants();

  // Validate form has at least one query parameter
  const isFormValid = (addedFullNames.length > 0 || addedVariationIDs.length > 0);

  // Helper to conditionally apply section ID
  const getSectionId = (section) => {
    return activeGuideSection === section ? section : undefined;
  };

  /**
   * Toggles clinical significance selection
   * @param {string} sig - Clinical significance value to toggle
   */
  const handleClinicalSignificanceClick = (sig) => {
    setClinicalSignificance(prevSig => {
      if (prevSig.includes(sig)) {
        return prevSig.filter(s => s !== sig);
      } else {
        return [...prevSig, sig];
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Query Parameters Section */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Query Parameters</h3>
        <div className="space-y-2">
          {/* Full Names Display */}
          <div>
            <h4 className="text-lg font-semibold">Full Names:</h4>
            <div className="flex flex-wrap gap-2">
              {addedFullNames.map((name, index) => (
                <span key={index} className={`inline-flex items-center ${themeConstants.tagBackgroundColor} rounded-full px-3 py-1 text-sm font-semibold`}>
                  {name}
                  <button onClick={() => removeFullName(name)} className="ml-2 focus:outline-none">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Variation IDs Display */}
          <div>
            <h4 className="text-lg font-semibold">Variation IDs:</h4>
            <div className="flex flex-wrap gap-2">
              {addedVariationIDs.map((id, index) => (
                <span key={index} className={`inline-flex items-center ${themeConstants.tagBackgroundColor} rounded-full px-3 py-1 text-sm font-semibold`}>
                  {id}
                  <button onClick={() => removeVariationID(id)} className="ml-2 focus:outline-none">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Significance Section */}
      <div id={getSectionId('clinical-significance')}>
        <h3 className="text-lg font-semibold mb-2">Clinical Significance</h3>
        <div className="flex flex-wrap gap-2">
          {['Pathogenic', 'Likely pathogenic', 'Uncertain significance', 'Likely benign', 'Benign'].map((sig) => (
            <button
              key={sig}
              onClick={() => handleClinicalSignificanceClick(sig)}
              className={`px-3 py-1 rounded-full cursor-pointer ${
                clinicalSignificance.includes(sig) 
                  ? `${themeConstants.tagBackgroundColor} ${themeConstants.selectedItemTextColor}`
                  : `${themeConstants.unselectedItemBackgroundColor} hover:${themeConstants.unselectedItemHoverColor}`
              } transition-colors duration-200`}
            >
              {sig}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Section */}
      <div id={getSectionId('date-range')} className={`mb-6 pb-6 border-b ${themeConstants.borderColor}`}>
        <h3 className="text-lg font-semibold mb-2">Date Range</h3>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="w-full sm:w-1/2">
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition-colors duration-200`} 
            />
          </div>
          <div className="w-full sm:w-1/2">
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputBorderColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition-colors duration-200`} 
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div id={getSectionId('review-query')} className="flex items-center space-x-4">
        <button 
          onClick={handleReviewClick}
          disabled={!isFormValid}
          className={`flex-grow px-6 py-3 rounded-lg flex items-center justify-center text-base ${
            isFormValid
              ? `${themeConstants.primaryButtonBackgroundColor} hover:${themeConstants.primaryButtonHoverColor} text-white`
              : 'bg-gray-400 cursor-not-allowed text-gray-200'
          } transition-colors duration-200`}
        >
          Review Query
        </button>
        <button 
          onClick={handleResetClick}
          className="px-6 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors duration-200 flex items-center justify-center text-base"
        >
          <RotateCcw className="mr-2" size={18} />
          Reset
        </button>
      </div>

      {/* Help Text */}
      <p className={`text-md text-center ${themeConstants.labelTextColor}`}>
        Please add at least one full name or variation ID. Clinical significance and date ranges are optional filters.
      </p>
    </div>
  );
};

export default QueryParameters;