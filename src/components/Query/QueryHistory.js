import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const QueryHistory = ({ queryHistory, onSelectQuery }) => {
  const themeConstants = useThemeConstants();

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderSearchContent = (query) => {
    if (query.search_type === 'targeted') {
      return (
        <>
          {query.full_names?.length > 0 && (
            <div className="mb-2">
              <strong>Full Names:</strong>
              <ul className="list-disc list-inside ml-4">
                {query.full_names.map((name, idx) => (
                  <li key={idx} className="text-sm">{name}</li>
                ))}
              </ul>
            </div>
          )}
          {query.variation_ids?.length > 0 && (
            <div className="mb-2">
              <strong>Variation IDs:</strong>
              <ul className="list-disc list-inside ml-4">
                {query.variation_ids.map((id, idx) => (
                  <li key={idx} className="text-sm">{id}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      );
    }

    return query.search_groups?.length > 0 ? (
      <div className="mb-2">
        <strong>Search Groups:</strong>
        <ul className="list-disc list-inside ml-4">
          {query.search_groups.map((group, idx) => (
            <li key={idx} className="text-sm">
              {Object.entries(group)
                .filter(([_, value]) => value)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')}
            </li>
          ))}
        </ul>
      </div>
    ) : null;
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
            <div className="flex justify-between items-start mb-2">
              <span className={`inline-block px-2 py-1 rounded text-sm ${themeConstants.tagBackgroundColor} text-white`}>
                {query.search_type.charAt(0).toUpperCase() + query.search_type.slice(1)} / {query.query_source}
              </span>
              <span className="text-sm text-gray-500">
                {formatTimestamp(query.timestamp)}
              </span>
            </div>

            {renderSearchContent(query)}

            {query.clinical_significance?.length > 0 && (
              <div className="mt-2">
                <strong>Clinical Significance: </strong>
                {query.clinical_significance.join(', ')}
              </div>
            )}

            <div className="mt-2 text-sm text-gray-500">
              <span>Date Range: {formatDate(query.start_date)} to {formatDate(query.end_date)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueryHistory;