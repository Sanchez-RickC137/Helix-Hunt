import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const ReviewModal = ({
  setShowReviewModal,
  searchType,
  addedFullNames,
  addedVariationIDs,
  searchGroups,
  clinicalSignificance,
  startDate,
  endDate,
  outputFormat,
  handleSubmit
}) => {
  const themeConstants = useThemeConstants();

  // Helper function to format search group keys for display
  const formatKey = (key) => {
  // Convert camelCase to separate words and capitalize first letter
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
  };

  const renderTargetedContent = () => {
    if (!addedFullNames?.length && !addedVariationIDs?.length) return null;
    
    return (
      <>
        {addedFullNames?.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold">Full Names:</h3>
            <ul className="list-disc list-inside">
              {addedFullNames.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {addedVariationIDs?.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold">Variation IDs:</h3>
            <ul className="list-disc list-inside">
              {addedVariationIDs.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  };

  const renderGeneralContent = () => {
    if (!searchGroups?.length) return null;

    return (
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Search Groups:</h3>
        <ul className="list-none space-y-4">
          {searchGroups.map((group, index) => (
            <li key={index} className={`p-4 rounded-lg ${themeConstants.unselectedItemBackgroundColor}`}>
              <div className="space-y-2">
                {Object.entries(group)
                  .filter(([_, value]) => value) // Only show non-null values
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <span className="font-medium min-w-[120px]">{formatKey(key)}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderFilters = () => {
    const filters = [];
    if (clinicalSignificance?.length > 0) {
      filters.push(`Filtering for clinical significance: ${clinicalSignificance.join(', ')}`);
    }
    if (startDate || endDate) {
      filters.push(`Date range: ${startDate || 'Any'} to ${endDate || 'Any'}`);
    }
    
    if (filters.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded">
        <h3 className="font-semibold mb-2">Active Filters:</h3>
        <ul className="list-disc list-inside">
          {filters.map((filter, index) => (
            <li key={index}>{filter}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeConstants.sectionBackgroundColor} p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <h2 className={`text-2xl font-bold mb-6 ${themeConstants.headingTextColor}`}>
          Review Your {searchType === 'targeted' ? 'Targeted' : 'General'} Query
        </h2>
        
        <div className="space-y-6">
          {searchType === 'targeted' ? renderTargetedContent() : renderGeneralContent()}
          {renderFilters()}

          {/* Filter Notice */}
          {(clinicalSignificance?.length > 0 || startDate || endDate) && (
            <div className="mt-4 p-4 bg-yellow-50 text-yellow-700 rounded">
              <p className="font-semibold">Note:</p>
              <p>Results will be filtered based on the specified criteria. Some variants may be excluded if they don't match the selected clinical significance or fall outside the date range.</p>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => setShowReviewModal(false)}
            className={`px-6 py-2 rounded ${themeConstants.secondaryButtonBackgroundColor} hover:${themeConstants.secondaryButtonHoverColor} text-white transition-colors duration-200`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-6 py-2 rounded ${themeConstants.primaryButtonBackgroundColor} hover:${themeConstants.primaryButtonHoverColor} text-white transition-colors duration-200`}
          >
            Submit Query
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;