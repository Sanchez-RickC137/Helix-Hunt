import React from 'react';
import { useThemeConstants } from './ThemeConstants';

const ReviewModal = ({ 
  setShowReviewModal, 
  selectedGenes, 
  geneVariationIDs,
  clinicalSignificance, 
  startDate, 
  endDate, 
  outputFormat,
  handleSubmit
}) => {
  // Get theme-related constants
  const themeConstants = useThemeConstants();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeConstants.modalBackgroundColor} p-6 rounded-lg shadow-xl max-w-md w-full transition-colors duration-200`}>
        <h3 className={`text-2xl font-bold mb-4 ${themeConstants.labelAccentColor}`}>Review Your Query</h3>
        <div className="space-y-2">
          <p><strong>Selected Genes:</strong> {selectedGenes.join(', ') || 'None'}</p>
          <p><strong>Gene Variation IDs:</strong> {geneVariationIDs.join(', ') || 'None'}</p>
          <p><strong>Clinical Significance:</strong> {clinicalSignificance || 'Not selected'}</p>
          <p><strong>Date Range:</strong> {startDate && endDate ? `${startDate} to ${endDate}` : 'Not set'}</p>
          <p><strong>Output Format:</strong> {outputFormat || 'Not selected'}</p>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button 
            onClick={() => setShowReviewModal(false)} 
            className={`px-4 py-2 rounded-md ${themeConstants.secondaryButtonBackgroundColor} hover:${themeConstants.secondaryButtonHoverColor} text-white transition-colors duration-200`}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className={`px-4 py-2 rounded-md ${themeConstants.primaryButtonBackgroundColor} hover:${themeConstants.primaryButtonHoverColor} text-white transition-colors duration-200`}
          >
            Submit Query
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;