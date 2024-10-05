import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const ReviewModal = ({
  setShowReviewModal,
  selectedGene,
  selectedDNAChange,
  selectedProteinChange,
  selectedVariationID,
  clinicalSignificance,
  startDate,
  endDate,
  outputFormat,
  handleSubmit
}) => {
  const themeConstants = useThemeConstants();

  const renderField = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div>
        <h3 className="font-semibold">{label}:</h3>
        <p>{Array.isArray(value) ? value.join(', ') : value}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeConstants.sectionBackgroundColor} p-6 rounded-lg shadow-xl max-w-2xl w-full`}>
        <h2 className={`text-2xl font-bold mb-4 ${themeConstants.headingTextColor}`}>Review Your Query</h2>
        
        <div className="space-y-4">
          {renderField("Gene Symbol", selectedGene)}
          {renderField("DNA Change", selectedDNAChange)}
          {renderField("Protein Change", selectedProteinChange)}
          {renderField("Variation ID", selectedVariationID)}
          {renderField("Clinical Significance", clinicalSignificance)}
          {renderField("Date Range", `${startDate} to ${endDate}`)}
          {renderField("Output Format", outputFormat)}
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