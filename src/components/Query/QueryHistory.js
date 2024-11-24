import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const QueryHistory = ({ queryHistory, onSelectQuery }) => {
  const themeConstants = useThemeConstants();

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const renderSearchGroup = (group) => {
    const parts = [];
    
    if (group.geneSymbol) {
      parts.push(`Gene: ${group.geneSymbol}`);
    }
    if (group.dnaChange) {
      parts.push(`DNA: ${group.dnaChange}`);
    }
    if (group.proteinChange) {
      parts.push(`Protein: ${group.proteinChange}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Empty search group';
  };

  const renderQueryDetails = (query) => {
    if (query.search_type === 'targeted') {
      return (
        <div className="space-y-2">
          {query.variation_ids?.length > 0 && (
            <div>
              <strong>Variation IDs: </strong>
              <div className="ml-4">
                {query.variation_ids.map((id, index) => (
                  <div key={index} className="text-sm">{id}</div>
                ))}
              </div>
            </div>
          )}
          {query.full_names?.length > 0 && (
            <div>
              <strong>Full Names: </strong>
              <div className="ml-4">
                {query.full_names.map((name, index) => (
                  <div key={index} className="text-sm">{name}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    } else if (query.search_type === 'general' && query.search_groups?.length > 0) {
      return (
        <div>
          <strong>Search Groups: </strong>
          <div className="ml-4 space-y-1">
            {query.search_groups.map((group, index) => (
              <div key={index} className="text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded">
                {renderSearchGroup(group)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <div className="text-sm text-gray-500">No query details available</div>;
  };

  return (
    <div className={`${themeConstants.sectionBackgroundColor} p-4 rounded-lg shadow-lg`}>
      <h2 className="text-2xl font-bold mb-4">Query History</h2>
      <div className="space-y-4">
        {queryHistory.map((query) => (
          <div
            key={query.id}
            onClick={() => onSelectQuery(query)}
            className={`p-4 rounded-lg cursor-pointer ${themeConstants.unselectedItemBackgroundColor} 
              hover:${themeConstants.unselectedItemHoverColor} transition-colors duration-200`}
          >
            {/* Header with type and timestamp */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${themeConstants.tagBackgroundColor} text-white`}>
                  {query.search_type.charAt(0).toUpperCase() + query.search_type.slice(1)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  query.query_source === 'web' ? 'bg-blue-500' : 'bg-green-500'
                } text-white`}>
                  {query.query_source}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(query.timestamp).toLocaleString()}
              </span>
            </div>

            {/* Query Details */}
            <div className="mb-4">
              {renderQueryDetails(query)}
            </div>

            {/* Clinical Significance */}
            {query.clinical_significance?.length > 0 && (
              <div className="mb-2">
                <strong>Clinical Significance: </strong>
                <div className="ml-4">
                  {query.clinical_significance.map((sig, index) => (
                    <span 
                      key={index}
                      className={`inline-block mr-2 mb-1 px-2 py-1 text-sm rounded ${themeConstants.unselectedItemBackgroundColor}`}
                    >
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="text-sm text-gray-600">
              <strong>Date Range: </strong>
              {formatDate(query.start_date)} to {formatDate(query.end_date)}
            </div>
          </div>
        ))}

        {(!queryHistory || queryHistory.length === 0) && (
          <div className="text-center text-gray-500 py-8">
            No query history available
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryHistory;
