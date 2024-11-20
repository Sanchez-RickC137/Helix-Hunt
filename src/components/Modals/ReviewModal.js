import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';
import GeneLoader from '../Page/GeneLoader';
// import GeneLoader from '../Page/GeneLoader2';

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
  handleSubmit,
  isMaintenanceWindow,
  querySource
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const themeConstants = useThemeConstants();

  // Block database queries and gene-symbol-only searches during maintenance
  const isDatabaseQueryBlocked = isMaintenanceWindow && (
    querySource === 'database' ||
    (searchType === 'general' && searchGroups?.some(group =>
      group.geneSymbol && !group.dnaChange && !group.proteinChange
    ))
  );

  const handleFormSubmit = async () => {
    setIsSubmitting(true); // Show loader
    try {
      await handleSubmit(); // Trigger the parent component's submission logic
    } finally {
      setIsSubmitting(false); // Hide loader after completion
    }
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

    const formatKey = (key) => {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
    };

    return (
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Search Groups:</h3>
        <ul className="list-none space-y-4">
          {searchGroups.map((group, index) => (
            <li key={index} className={`p-4 rounded-lg ${themeConstants.unselectedItemBackgroundColor}`}>
              <div className="space-y-2">
                {Object.entries(group)
                  .filter(([_, value]) => value)
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
      <div className="mt-4 p-4 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 rounded">
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
        {isSubmitting ? (
          <div className="flex justify-center items-center min-h-[200px]">
            {/* <GeneLoader numGenes={15} containerHeight={200}/> */}
            <GeneLoader size={100} />
          </div>
        ) : (
          <div className="space-y-6">
            {searchType === 'targeted' ? renderTargetedContent() : renderGeneralContent()}
            {renderFilters()}

            {/* Maintenance Warning */}
            {isMaintenanceWindow && (
              <div className={`mt-4 p-4 ${themeConstants.warningBackgroundColor} border ${themeConstants.warningBorderColor} rounded-lg`}>
                <div className="flex items-start">
                  <AlertCircle className={`h-5 w-5 ${themeConstants.warningIconColor} mr-2 flex-shrink-0`} />
                  <div>
                    <h4 className={`font-semibold ${themeConstants.warningHeadingColor}`}>
                      Database Maintenance Period (Saturday 23:00 - Sunday 02:00)
                    </h4>
                    <p className={`text-sm mt-1 ${themeConstants.warningTextColor}`}>
                      {isDatabaseQueryBlocked 
                        ? "Database queries and gene symbol-only searches are currently unavailable. Please try again after maintenance or modify your search criteria."
                        : "Some database features may be limited during maintenance."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!isSubmitting && (
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() => setShowReviewModal(false)}
              className={`px-6 py-2 rounded ${themeConstants.secondaryButtonBackgroundColor} hover:${themeConstants.secondaryButtonHoverColor} text-white transition-colors duration-200`}
            >
              Cancel
            </button>
            <button
              onClick={handleFormSubmit}
              disabled={isDatabaseQueryBlocked}
              className={`px-6 py-2 rounded ${
                isDatabaseQueryBlocked
                  ? 'bg-gray-400 cursor-not-allowed'
                  : `${themeConstants.primaryButtonBackgroundColor} hover:${themeConstants.primaryButtonHoverColor}`
              } text-white transition-colors duration-200`}
            >
              Submit Query
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;