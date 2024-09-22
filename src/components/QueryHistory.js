// components/QueryHistory.js
import React from 'react';

const QueryHistory = ({ queryHistory, isDarkMode, onSelectQuery }) => {
  return (
    <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} p-4 rounded-lg shadow`}>
      <h2 className="text-2xl font-bold mb-4">Query History</h2>
      <div className="space-y-4">
        {queryHistory.map((query, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg cursor-pointer ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => onSelectQuery(query)}
          >
            <p><strong>Genes:</strong> {query.selectedGenes?.join(', ') || 'None'}</p>
            {query.geneVariationIDs && query.geneVariationIDs.length > 0 && (
              <p><strong>Gene Variation IDs:</strong> {query.geneVariationIDs.join(', ')}</p>
            )}
            <p><strong>Clinical Significance:</strong> {query.clinicalSignificance || 'Not specified'}</p>
            <p><strong>Output Format:</strong> {query.outputFormat || 'Not specified'}</p>
            <p><strong>Date Range:</strong> {query.startDate || 'Not specified'} to {query.endDate || 'Not specified'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueryHistory;