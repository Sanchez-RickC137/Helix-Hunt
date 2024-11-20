import React, { useState } from 'react';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';

const QuerySourceToggle = ({ querySource, setQuerySource, isMaintenanceWindow }) => {
  const themeConstants = useThemeConstants();
  const [showWebHelp, setShowWebHelp] = useState(false);
  const [showDatabaseHelp, setShowDatabaseHelp] = useState(false);

  const webHelpText = "Use the ClinVar website as the query source. Information will be more up to date and comprehensive but may take longer to retrieve.";
  const databaseHelpText = isMaintenanceWindow 
    ? "Database queries are currently disabled due to scheduled maintenance (Saturday 23:00 - Sunday 00:00)" 
    : "Use the local database as the query source. Information is updated weekly and will return more quickly.";

  return (
    <div className="flex items-center justify-center relative">
      <div className={`inline-flex rounded-lg p-1 ${themeConstants.unselectedItemBackgroundColor}`}>
        {/* Web Query Button */}
        <div className="relative">
          <button
            onClick={() => setQuerySource('web')}
            className={`px-4 py-2 rounded-md text-md font-medium font-semibold transition-colors duration-200 flex items-center ${
              querySource === 'web'
                ? `${themeConstants.sectionBackgroundColor} border ${themeConstants.buttonBorderColor}`
                : `${themeConstants.unselectedItemBackgroundColor}`
            }`}
          >
            Web Query
            <div 
              className="ml-1 relative"
              onMouseEnter={() => setShowWebHelp(true)}
              onMouseLeave={() => setShowWebHelp(false)}
            >
              <HelpCircle size={16} className="text-current" />
            </div>
          </button>
          {showWebHelp && (
            <div className="absolute z-50 top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg w-64">
              {webHelpText}
            </div>
          )}
        </div>
      
        {/* Database Query Button */}
        <div className="relative">
          <button
            onClick={() => !isMaintenanceWindow && setQuerySource('database')}
            disabled={isMaintenanceWindow}
            className={`px-4 py-2 rounded-md text-md font-medium font-semibold transition-colors duration-200 flex items-center ${
              isMaintenanceWindow
                ? 'opacity-50 cursor-not-allowed'
                : querySource === 'database'
                  ? `${themeConstants.sectionBackgroundColor} border ${themeConstants.buttonBorderColor}`
                  : `${themeConstants.unselectedItemBackgroundColor}`
            }`}
          >
            Database Query
            {isMaintenanceWindow && <AlertCircle size={16} className="ml-1 text-yellow-500" />}
            <div 
              className="ml-1 relative"
              onMouseEnter={() => setShowDatabaseHelp(true)}
              onMouseLeave={() => setShowDatabaseHelp(false)}
            >
              <HelpCircle size={16} className="text-current" />
            </div>
          </button>
          {showDatabaseHelp && (
            <div className="absolute z-50 top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg w-64">
              {databaseHelpText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuerySourceToggle;