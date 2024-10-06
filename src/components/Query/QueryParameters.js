import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';
import { X } from 'lucide-react';

const QueryParameters = ({
  clinicalSignificance,
  setClinicalSignificance,
  outputFormat,
  setOutputFormat,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  handleReviewClick,
  addedFullNames,
  addedVariationIDs,
  removeFullName,
  removeVariationID
}) => {
  const themeConstants = useThemeConstants();

  const isFormValid = (addedFullNames.length > 0 || addedVariationIDs.length > 0) && outputFormat;

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
      <div>
        <h3 className="text-lg font-semibold mb-2">Added Queries</h3>
        <div className="space-y-2">
          <div>
            <h4 className="text-md font-semibold">Full Names:</h4>
            <div className="flex flex-wrap gap-2">
              {addedFullNames.map((name, index) => (
                <span key={index} className={`inline-flex items-center ${themeConstants.tagBackgroundColor} rounded-full px-3 py-1 text-sm font-semibold`}>
                  {name}
                  <button
                    onClick={() => removeFullName(name)}
                    className="ml-2 focus:outline-none"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-md font-semibold">Variation IDs:</h4>
            <div className="flex flex-wrap gap-2">
              {addedVariationIDs.map((id, index) => (
                <span key={index} className={`inline-flex items-center ${themeConstants.tagBackgroundColor} rounded-full px-3 py-1 text-sm font-semibold`}>
                  {id}
                  <button
                    onClick={() => removeVariationID(id)}
                    className="ml-2 focus:outline-none"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Clinical Significance</h3>
        <div className="flex flex-wrap gap-2">
          {['Pathogenic', 'Likely pathogenic', 'Uncertain significance', 'Likely benign', 'Benign'].map((sig) => (
            <button
              key={sig}
              type="button"
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

      <div>
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

      <div>
        <h3 className="text-lg font-semibold mb-2">Output Format</h3>
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
        Review Queries
      </button>

      {!isFormValid && (
        <p className={`text-sm ${themeConstants.labelTextColor}`}>
          Please add at least one full name or variation ID, and choose an output format.
        </p>
      )}
    </div>
  );
};

export default QueryParameters;