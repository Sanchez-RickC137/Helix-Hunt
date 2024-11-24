import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const QueryHistory = ({ queryHistory, onSelectQuery }) => {
  const themeConstants = useThemeConstants();

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const renderQueryDetails = (query) => {
    if (query.search_type === 'targeted') {
      const variations = [];
      
      // Add variation IDs if present
      if (query.variation_ids && query.variation_ids.length > 0) {
        variations.push(
          <div key="variations" className="mb-2">
            <strong>Variation IDs: </strong>
            {query.variation_ids.join(', ')}
          </div>
        );
      }

      // Add full names if present
      if (query.full_names && query.full_names.length > 0) {
        variations.push(
          <div key="fullnames" className="mb-2">
            <strong>Full Names: </strong>
            {query.full_names.join(', ')}
          </div>
        );
      }

      return variations.length > 0 ? variations : <div>No query details available</div>;
    } else if (query.search_type === 'general' && query.search_groups) {
      return (
        <div>
          <strong>Search Groups: </strong>
          {query.search_groups.map((group, index) => (
            <div key={index} className="ml-4 mb-1">
              {Object.entries(group)
                .filter(([_, value]) => value)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`${themeConstants.sectionBackgroundColor} p-4 rounded-lg shadow`}>
      <h2 className="text-2xl font-bold mb-4">Query History</h2>
      <div className="space-y-4">
        {queryHistory.map((query) => (
          <div
            key={query.id}
            onClick={() => onSelectQuery(query)}
            className={`p-4 rounded-lg cursor-pointer ${themeConstants.unselectedItemBackgroundColor} 
              hover:${themeConstants.unselectedItemHoverColor}`}
          >
            {/* Search Type Badge */}
            <div className="flex justify-between items-center mb-3">
              <span className={`px-3 py-1 rounded-full text-sm ${themeConstants.tagBackgroundColor} text-white`}>
                {query.search_type.charAt(0).toUpperCase() + query.search_type.slice(1)} / {query.query_source}
              </span>
              <span className="text-sm text-gray-500">
                Queried on: {new Date(query.timestamp).toLocaleString()}
              </span>
            </div>

            {/* Query Details */}
            <div className="mb-3">
              {renderQueryDetails(query)}
            </div>

            {/* Clinical Significance */}
            {query.clinical_significance && query.clinical_significance.length > 0 && (
              <div className="mb-2">
                <strong>Clinical Significance: </strong>
                {query.clinical_significance.join(', ')}
              </div>
            )}

            {/* Date Range */}
            <div className="text-sm text-gray-600">
              <strong>Date Range: </strong>
              {formatDate(query.start_date)} to {formatDate(query.end_date)}
            </div>
          </div>
        ))}

        {queryHistory.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No query history available
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryHistory;
