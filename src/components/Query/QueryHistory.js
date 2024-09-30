import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const QueryHistory = ({ queryHistory, onSelectQuery }) => {
  // Get theme-related constants
  const themeConstants = useThemeConstants();

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