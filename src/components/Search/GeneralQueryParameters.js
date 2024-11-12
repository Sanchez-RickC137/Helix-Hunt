import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';
import { X, RotateCcw } from 'lucide-react';
// import HelpTooltip from '../Help/HelpTooltip';

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
  handleResetClick,
  activeGuideSection,
  helpElement,
  setHelpElement,
  activeHelp
}) => {
  const themeConstants = useThemeConstants();

  // Helper to conditionally apply section ID
  const getSectionId = (section) => {
    return activeGuideSection === section ? section : undefined;
  };

  const handleClinicalSignificanceClick = (sig) => {
    setClinicalSignificance(prevSig => {
      if (prevSig.includes(sig)) {
        return prevSig.filter(s => s !== sig);
      } else {
        return [...prevSig, sig];
      }
    });
  };

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

  return (
    <div className="space-y-6">
      {/* Search Groups Display */}
      <div>
        <h3 className="text-xl text-center font-semibold mb-2">General Search Query Parameters</h3>
        <h3 className="text-lg font-semibold mb-2">Search Groups</h3>
        {renderHelpTooltip(
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
          </div>,
          "Groups of Gene Symbols, DNA Changes, and Protein Changes currently loaded for the query"
        )}
      </div>

      {/* Clinical Significance Section - Now wrapped in a div with proper ID */}
      {renderHelpTooltip(
        <div id={getSectionId('clinical-significance')} className="mb-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Clinical Significance</h3>
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
        </div>,
        "Optional filter for query results by clinical signiicance. Mutliple selections can be made."
      )}


      {/* Date Range Section - Now wrapped in a div with proper ID */}
      {renderHelpTooltip(
        <div id={getSectionId('date-range')} className="mb-6">
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
        </div>,
        "Optional filter for query results for date range. Select a start date or an end date or both."
      )}

      {/* Action Buttons - Review query section with proper ID */}
      <div id={getSectionId('review-query')} className="flex items-center space-x-4">
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

      {/* Help Text */}
      <p className={`text-md text-center ${themeConstants.labelTextColor}`}>
        Please add at least one Search Group for the query. Clinical significance and date ranges are optional filters.
      </p>

    </div>
  );
};

export default GeneralQueryParameters;