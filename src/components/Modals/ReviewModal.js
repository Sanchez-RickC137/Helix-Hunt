import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const ReviewModal = ({
  setShowReviewModal,
  addedFullNames,
  addedVariationIDs,
  clinicalSignificance,
  startDate,
  endDate,
  outputFormat,
  handleSubmit
}) => {
  const themeConstants = useThemeConstants();

  const renderList = (items, title) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-4">
        <h3 className="font-semibold">{title}:</h3>
        <ul className="list-disc list-inside">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderField = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div className="mb-4">
        <h3 className="font-semibold">{label}:</h3>
        <p>{Array.isArray(value) ? value.join(', ') : value}</p>
      </div>
    );
  };

  const onSubmit = () => {
    handleSubmit();
    setShowReviewModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeConstants.sectionBackgroundColor} p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <h2 className={`text-2xl font-bold mb-4 ${themeConstants.headingTextColor}`}>Review Your Queries</h2>
        
        <div className="space-y-4">
          {renderList(addedFullNames, "Full Names")}
          {renderList(addedVariationIDs, "Variation IDs")}
          {renderField("Clinical Significance", clinicalSignificance)}
          {renderField("Date Range", `${startDate || 'Not specified'} to ${endDate || 'Not specified'}`)}
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
            onClick={onSubmit}
            className={`px-4 py-2 rounded ${themeConstants.primaryButtonBackgroundColor} ${themeConstants.primaryButtonHoverColor} text-white transition-colors duration-200`}
          >
            Submit Queries
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;