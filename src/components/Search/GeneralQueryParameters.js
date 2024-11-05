import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';
import { X, RotateCcw } from 'lucide-react';

const GeneralQueryParameters = ({
  searchGroups,
  removeSearchGroup,
  clinicalSignificance,
  setClinicalSignificance,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  handleReviewClick,
  handleResetClick
}) => {
  const themeConstants = useThemeConstants();

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
      {/* Search Groups Display */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Search Groups</h3>
        <div className="space-y-2">
          {searchGroups.map((group, index) => (
            <div
              key={index}
              className={`${themeConstants.unselectedItemBackgroundColor} p-4 rounded-lg relative`}
            >
              <button
                onClick={() => removeSearchGroup(index)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
              >
                <X size={18} />
              </button>
              <div className="space-y-1">
                {group.geneSymbol && (
                  <p><span className="font-medium">Gene Symbol:</span> {group.geneSymbol}</p>
                )}
                {group.dnaChange && (
                  <p><span className="font-medium">DNA Change:</span> {group.dnaChange}</p>
                )}
                {group.proteinChange && (
                  <p><span className="font-medium">Protein Change:</span> {group.proteinChange}</p>
                )}
              </div>
            </div>
          ))}
          {searchGroups.length === 0 && (
            <p className="text-gray-500 italic">No search groups added yet</p>
          )}
        </div>
      </div>

      {/* Clinical Significance Section */}
      <div>
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
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Date Range</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border`}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleReviewClick}
          disabled={searchGroups.length === 0}
          className={`flex-grow px-6 py-3 rounded-lg flex items-center justify-center text-base ${
            searchGroups.length > 0
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
    </div>
  );
};

export default GeneralQueryParameters;