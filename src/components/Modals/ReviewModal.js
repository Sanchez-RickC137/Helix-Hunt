import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const ReviewModal = ({
  setShowReviewModal,
  selectedGenes,
  selectedDNAChanges,
  selectedProteinChanges,
  selectedVariationIDs,
  clinicalSignificance,
  startDate,
  endDate,
  outputFormat,
  handleSubmit
}) => {
  const themeConstants = useThemeConstants();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeConstants.sectionBackgroundColor} p-6 rounded-lg shadow-xl max-w-2xl w-full`}>
        <h2 className={`text-2xl font-bold mb-4 ${themeConstants.headingTextColor}`}>Review Your Query</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Selected Genes:</h3>
            <p>{selectedGenes.join(', ') || 'None'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">DNA Changes:</h3>
            <p>{selectedDNAChanges.join(', ') || 'None'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Protein Changes:</h3>
            <p>{selectedProteinChanges.join(', ') || 'None'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Variation IDs:</h3>
            <p>{selectedVariationIDs.join(', ') || 'None'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Clinical Significance:</h3>
            <p>{clinicalSignificance.join(', ') || 'Not specified'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Date Range:</h3>
            <p>{startDate} to {endDate}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Output Format:</h3>
            <p>{outputFormat}</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => setShowReviewModal(false)}
            className={`px-4 py-2 rounded ${themeConstants.secondaryButtonBackgroundColor} ${themeConstants.secondaryButtonHoverColor} text-white transition-colors duration-200`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-4 py-2 rounded ${themeConstants.primaryButtonBackgroundColor} ${themeConstants.primaryButtonHoverColor} text-white transition-colors duration-200`}
          >
            Submit Query
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;