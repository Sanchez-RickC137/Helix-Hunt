/**
 * Query history component
 * Displays and manages user's previous queries
 * Allows reloading of past queries
 * 
 * @param {Object} props
 * @param {Array} props.queryHistory - Array of past queries
 * @param {Function} props.onSelectQuery - Callback when a query is selected
 */

import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const QueryHistory = ({ queryHistory, onSelectQuery }) => {
  const themeConstants = useThemeConstants();

  /**
   * Renders a list of items with a title
   * @param {Array} items - Items to display
   * @param {string} title - Section title
   * @returns {JSX.Element|null} Rendered list or null if empty
   */
  const renderList = (items, title) => {
    if (!items || items.length === 0) return null;
    return (
      <div>
        <strong>{title}:</strong>
        <ul className="list-disc list-inside ml-4">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className={`${themeConstants.sectionBackgroundColor} p-4 rounded-lg shadow`}>
      <h2 className="text-2xl font-bold mb-4">Query History</h2>
      <div className="space-y-4">
        {queryHistory.map((query, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg cursor-pointer ${themeConstants.unselectedItemBackgroundColor} hover:${themeConstants.unselectedItemHoverColor}`}
            onClick={() => onSelectQuery(query)}
          >
            {/* Display query details */}
            {renderList(query.fullNames, "Full Names")}
            {renderList(query.variationIDs, "Variation IDs")}
            <p>
              <strong>Clinical Significance:</strong> 
              {query.clinicalSignificance?.join(', ') || 'Not specified'}
            </p>
            <p>
              <strong>Date Range:</strong> 
              {query.startDate || 'Not specified'} to {query.endDate || 'Not specified'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Queried on: {new Date(query.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueryHistory;