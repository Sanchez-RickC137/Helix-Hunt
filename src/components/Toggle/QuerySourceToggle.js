import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';

const QuerySourceToggle = ({ querySource, setQuerySource }) => {
  const themeConstants = useThemeConstants();
  const [showWebHelp, setShowWebHelp] = useState(false);
  const [showDatabaseHelp, setDatabaseHelp] = useState(false);

  const webHelpText = "Use the Clinvar website as the query source. Information will be more up to date and comprehensive but may take longer to retrieve.";
  const databaseHelpText = "Use the local database as the query source. Information is updated weekly and will be return more quickly.";

  return (
    <div className="flex items-center justify-center relative">
      <div className={`inline-flex rounded-lg p-1 ${themeConstants.unselectedItemBackgroundColor}`}>
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
      
        <div className="relative">
          <button
            onClick={() => setQuerySource('database')}
            className={`px-4 py-2 rounded-md text-md font-medium font-semibold transition-colors duration-200 flex items-center ${
              querySource === 'database'
                ? `${themeConstants.sectionBackgroundColor} border ${themeConstants.buttonBorderColor}`
                : `${themeConstants.unselectedItemBackgroundColor}`
            }`}
          >
            Database Query
            <div 
              className="ml-1 relative"
              onMouseEnter={() => setDatabaseHelp(true)}
              onMouseLeave={() => setDatabaseHelp(false)}
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