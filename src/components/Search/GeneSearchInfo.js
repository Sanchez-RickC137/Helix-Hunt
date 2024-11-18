import React from 'react';
import { Database, Clock, HelpCircle } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';

const GeneSearchInfo = ({ geneSymbol, variantCount }) => {
  const themeConstants = useThemeConstants();
  // Rough estimate - we can adjust this based on actual performance metrics
  const estimatedMinutes = Math.ceil((variantCount / 2000) * 1); // 1 minute per 2000 variants for database query

  return (
    <div className="mt-2">
      <div className={`relative p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/30 border-blue-200`}>
        <div className="flex items-start space-x-2">
          <Database className="h-4 w-4 mt-0.5 text-blue-500" />
          <div className="flex-1 text-sm">
            <span className="font-medium">{geneSymbol}</span> has{' '}
            <span className="font-medium">{variantCount.toLocaleString()}</span> variants.
            <div className="mt-1">
              <span>
                Database query will be used. Estimated processing time: {estimatedMinutes} minute{estimatedMinutes !== 1 ? 's' : ''}.
              </span>
            </div>
          </div>

          {/* Help tooltip */}
          <div className="relative group">
            <HelpCircle className="h-4 w-4 text-blue-500 cursor-help" />
            <div className={`
              invisible group-hover:visible absolute z-50 right-0 mt-2 w-64 p-2 
              text-sm rounded-md shadow-lg
              ${themeConstants.sectionBackgroundColor} 
              ${themeConstants.mainTextColor}
              border ${themeConstants.borderColor}
            `}>
              Results can be reduced by including a DNA change or protein change in your search criteria.
              All gene-symbol-only searches use database queries for optimal performance.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneSearchInfo;