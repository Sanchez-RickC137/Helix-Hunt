import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';

const FullNameToggle = ({ isFullName, setIsFullName }) => {
  const themeConstants = useThemeConstants();
  const [showSymbolHelp, setShowSymbolHelp] = useState(false);
  const [showFullNameHelp, setShowFullNameHelp] = useState(false);

  const symbolHelpText = "Build your query using a Transcript ID and Gene Symbol along with DNA change and Protein Change";
  const fullNameHelpText = "Build your query using a Full Gene Name. If unsure of formatting use the Transcript ID / Gene Symbol option";
  
  return (
    <div className="flex items-center justify-center relative mb-4">
      <div className={`inline-flex rounded-lg p-1 ${themeConstants.unselectedItemBackgroundColor}`}>
        <div className="relative">
          <button
            onClick={() => {
              setIsFullName(false);
            }}
            className={`px-3 sm:px-4 py-2 rounded-md text-md sm:text-md font-semibold font-medium transition-colors duration-200 flex items-center ${
              !isFullName
                ? `${themeConstants.sectionBackgroundColor} border ${themeConstants.buttonBorderColor}`
                : `${themeConstants.unselectedItemBackgroundColor}`
            }`}
          >
            <span className="hidden sm:inline">Transcript ID / Gene Symbol</span>
            <span className="sm:hidden">Transcript ID / Gene Symbol</span>
            <div 
                className="ml-1 relative"
                onMouseEnter={() => setShowSymbolHelp(true)}
                onMouseLeave={() => setShowSymbolHelp(false)}
              >
                <HelpCircle size={16} className="text-current" />
            </div>
          </button>
          {showSymbolHelp && (
            <div className="absolute z-50 top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg w-64">
              {symbolHelpText}
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => {
              setIsFullName(true);
            }}
            className={`px-3 sm:px-4 py-2 rounded-md text-md sm:text-md font-semibold font-medium transition-colors duration-200 flex items-center ${
              isFullName
                ? `${themeConstants.sectionBackgroundColor} border ${themeConstants.buttonBorderColor}`
                : `${themeConstants.unselectedItemBackgroundColor}`
            }`}
          >
            <span className="hidden sm:inline">Full Gene Name</span>
            <span className="sm:hidden">Full Gene Name</span>
            <div 
                className="ml-1 relative"
                onMouseEnter={() => setShowFullNameHelp(true)}
                onMouseLeave={() => setShowFullNameHelp(false)}
              >
                <HelpCircle size={16} className="text-current" />
            </div>
          </button>
          {showFullNameHelp && (
            <div className="absolute z-50 top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg w-64">
              {fullNameHelpText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullNameToggle;