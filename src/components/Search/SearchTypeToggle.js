import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';

const SearchTypeToggle = ({ searchType, setSearchType }) => {
  const themeConstants = useThemeConstants();
  const [showTargetedHelp, setShowTargetedHelp] = useState(false);
  const [showGeneralHelp, setShowGeneralHelp] = useState(false);

  // Help text content
  const targetedHelpText = "Targeted Search allows precise querying using exact gene names or variation IDs. Best for when you know specific variants or genes you want to investigate.";
  const generalHelpText = "General Search enables broader querying using combinations of gene symbols, DNA changes, and protein changes. Useful for exploring related variants across multiple criteria.";

  return (
    <div className="flex items-center justify-center relative">
      <div className={`inline-flex rounded-lg p-1 ${themeConstants.unselectedItemBackgroundColor}`}>
        <div className="relative">
          <button
            onClick={() => setSearchType('targeted')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center ${
              searchType === 'targeted'
                ? `${themeConstants.buttonBackgroundColor} text-white`
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Targeted Search
            <div 
              className="ml-1 relative"
              onMouseEnter={() => setShowTargetedHelp(true)}
              onMouseLeave={() => setShowTargetedHelp(false)}
            >
              <HelpCircle size={16} className="text-current" />
            </div>
          </button>
          {showTargetedHelp && (
            <div className="absolute z-50 top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg w-64">
              {targetedHelpText}
            </div>
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setSearchType('general')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center ${
              searchType === 'general'
                ? `${themeConstants.buttonBackgroundColor} text-white`
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            General Search
            <div 
              className="ml-1 relative"
              onMouseEnter={() => setShowGeneralHelp(true)}
              onMouseLeave={() => setShowGeneralHelp(false)}
            >
              <HelpCircle size={16} className="text-current" />
            </div>
          </button>
          {showGeneralHelp && (
            <div className="absolute z-50 top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg w-64">
              {generalHelpText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchTypeToggle;