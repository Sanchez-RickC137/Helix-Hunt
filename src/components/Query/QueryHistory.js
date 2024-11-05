import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const QueryHistory = ({ queryHistory, onSelectQuery }) => {
  const themeConstants = useThemeConstants();

  // Helper function to safely parse JSON strings
  const safeJsonParse = (jsonString, defaultValue = []) => {
    try {
      return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return defaultValue;
    }
  };

  // Helper function to capitalize search type
  const formatSearchType = (type) => {
    return (type || 'targeted').charAt(0).toUpperCase() + (type || 'targeted').slice(1);
  };

  const renderSearchContent = (query) => {
    // Ensure we have valid data structures
    const fullNames = safeJsonParse(query.full_names);
    const variationIDs = safeJsonParse(query.variation_ids);
    const searchGroups = safeJsonParse(query.search_groups);
    const searchType = query.search_type || 'targeted';

    if (searchType === 'targeted') {
      return (
        <>
          {fullNames.length > 0 && (
            <div>
              <strong>Full Names:</strong>
              <ul className="list-disc list-inside ml-4">
                {fullNames.map((name, idx) => (
                  <li key={idx}>{name}</li>
                ))}
              </ul>
            </div>
          )}
          {variationIDs.length > 0 && (
            <div>
              <strong>Variation IDs:</strong>
              <ul className="list-disc list-inside ml-4">
                {variationIDs.map((id, idx) => (
                  <li key={idx}>{id}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      );
    } else {
      // Render general search content
      return searchGroups.length > 0 ? (
        <div>
          <strong>Search Groups:</strong>
          <ul className="list-disc list-inside ml-4">
            {searchGroups.map((group, idx) => (
              <li key={idx} className="mb-2">
                {Object.entries(group)
                  .filter(([_, value]) => value) // Only show non-null values
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(', ')}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No search groups found</p>
      );
    }
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
            <div className="mb-2">
              <span className={`inline-block px-2 py-1 rounded text-sm ${themeConstants.tagBackgroundColor} text-white`}>
                {formatSearchType(query.search_type)}
              </span>
            </div>

            {renderSearchContent(query)}

            <div className="mt-2 space-y-1">
              {query.clinical_significance?.length > 0 && (
                <p>
                  <strong>Clinical Significance: </strong>
                  {safeJsonParse(query.clinical_significance).join(', ')}
                </p>
              )}
              <p>
                <strong>Date Range: </strong>
                {query.start_date || 'Not specified'} to {query.end_date || 'Not specified'}
              </p>
              <p className="text-sm text-gray-500">
                Queried on: {new Date(query.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueryHistory;