/**
 * Query review modal component
 * Displays summary of query parameters before submission
 * Allows users to confirm or cancel query execution
 * 
 * @param {Object} props
 * @param {Function} props.setShowReviewModal - Function to control modal visibility
 * @param {string[]} props.addedFullNames - List of selected full names
 * @param {string[]} props.addedVariationIDs - List of selected variation IDs
 * @param {string[]} props.clinicalSignificance - Selected clinical significance values
 * @param {string} props.startDate - Start date for query range
 * @param {string} props.endDate - End date for query range
 * @param {string} props.outputFormat - Selected output format
 * @param {Function} props.handleSubmit - Function to handle query submission
 */

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

  /**
   * Renders a list of items with a title
   * @param {string[]} items - Array of items to display
   * @param {string} title - Title for the list section
   * @returns {JSX.Element|null} Rendered list or null if empty
   */
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

  /**
   * Renders a field with its value
   * @param {string} label - Field label
   * @param {string|string[]} value - Field value
   * @returns {JSX.Element|null} Rendered field or null if empty
   */
  const renderField = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div className="mb-4">
        <h3 className="font-semibold">{label}:</h3>
        <p>{Array.isArray(value) ? value.join(', ') : value}</p>
      </div>
    );
  };

  /**
   * Renders active filters section
   * @returns {JSX.Element|null} Rendered filters section or null if no filters
   */
  const renderFilters = () => {
    const filters = [];
    if (clinicalSignificance.length > 0) {
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

  /**
   * Handles form submission and closes modal
   */
  const onSubmit = () => {
    handleSubmit();
    setShowReviewModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeConstants.sectionBackgroundColor} p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <h2 className={`text-2xl font-bold mb-4 ${themeConstants.headingTextColor}`}>Review Your Query</h2>
        
        <div className="space-y-4">
          {renderList(addedFullNames, "Full Names")}
          {renderList(addedVariationIDs, "Variation IDs")}
          {renderField("Clinical Significance", clinicalSignificance)}
          {renderField("Date Range", `${startDate || 'Not specified'} to ${endDate || 'Not specified'}`)}
          {renderField("Output Format", outputFormat)}
          {renderFilters()}

          {/* Filter Notice */}
          {(clinicalSignificance.length > 0 || startDate || endDate) && (
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
            className={`px-4 py-2 rounded ${themeConstants.secondaryButtonBackgroundColor} ${themeConstants.secondaryButtonHoverColor} text-white transition-colors duration-200`}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
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