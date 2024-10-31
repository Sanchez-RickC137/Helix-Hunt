/**
 * Query history card component
 * Displays individual query history entries
 * Provides interface for reloading past queries
 * 
 * @param {Object} props
 * @param {Object} props.query - Query history entry details
 * @param {Function} props.onSelect - Callback when query is selected for reuse
 */

import React from 'react';
import { useThemeConstants } from './ThemeConstants';

const QueryHistoryCard = ({ query, onSelect }) => {
  const themeConstants = useThemeConstants();

  return (
    <div 
      className={`${themeConstants.sectionBackgroundColor} 
        rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow duration-200`}
      onClick={() => onSelect(query)}
    >
      {/* Query timestamp header */}
      <h3 className={`text-lg font-semibold mb-2 ${themeConstants.headingTextColor}`}>
        Query from {new Date(query.timestamp).toLocaleString()}
      </h3>

      {/* Query details */}
      <p className="mb-1">
        <strong>Genes:</strong> {query.selectedGenes.join(', ')}
      </p>
      
      {/* Conditional rendering of variation IDs */}
      {query.geneVariationIDs.length > 0 && (
        <p className="mb-1">
          <strong>Variation IDs:</strong> {query.geneVariationIDs.join(', ')}
        </p>
      )}
      
      {/* Date range and output format */}
      <p className="mb-1">
        <strong>Date Range:</strong> {query.startDate} to {query.endDate}
      </p>
      <p>
        <strong>Output Format:</strong> {query.outputFormat}
      </p>
    </div>
  );
};

export default QueryHistoryCard;