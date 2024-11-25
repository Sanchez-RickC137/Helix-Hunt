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

  const isDatabaseQueryBlocked = isMaintenanceWindow && (
    querySource === 'database' ||
    (searchType === 'general' && searchGroups?.some(group =>
      group.geneSymbol && !group.dnaChange && !group.proteinChange
    ))
  );

  const handleFormSubmit = async () => {
    setIsSubmitting(true);
    try {
      await handleSubmit();
    } finally {
      setIsSubmitting(false);
    }
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
      <div className={`mt-4 p-4 rounded-lg ${themeConstants.sectionBackgroundColor} border ${themeConstants.borderColor}`}>
        <h3 className={`font-semibold mb-2 ${themeConstants.headingTextColor}`}>
          Active Filters:
        </h3>
        <ul className={`list-disc list-inside ${themeConstants.mainTextColor}`}>
          {filters.map((filter, index) => (
            <li key={index} className="font-medium">
              {filter}
            </li>
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
            <GeneLoader size={100} />
          </div>
        ) : (
          <div className="space-y-6">
            {searchType === 'targeted' ? (
              <>
                {addedFullNames?.length > 0 && (
                  <div className={`mb-4 ${themeConstants.mainTextColor}`}>
                    <h3 className="font-semibold">Full Names:</h3>
                    <ul className="list-disc list-inside ml-4">
                      {addedFullNames.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {addedVariationIDs?.length > 0 && (
                  <div className={`mb-4 ${themeConstants.mainTextColor}`}>
                    <h3 className="font-semibold">Variation IDs:</h3>
                    <ul className="list-disc list-inside ml-4">
                      {addedVariationIDs.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              searchGroups?.length > 0 && (
                <div className="mb-4">
                  <h3 className={`font-semibold mb-2 ${themeConstants.headingTextColor}`}>Search Groups:</h3>
                  <div className="space-y-2">
                    {searchGroups.map((group, index) => (
                      <div key={index} className={`p-4 rounded-lg ${themeConstants.unselectedItemBackgroundColor}`}>
                        {Object.entries(group)
                          .filter(([_, value]) => value)
                          .map(([key, value]) => (
                            <div key={key} className={`mb-1 ${themeConstants.mainTextColor}`}>
                              <span className="font-medium">{key}:</span> {value}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

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