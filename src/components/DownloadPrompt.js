import React from 'react';
import { FileDown, X } from 'lucide-react';
import { useThemeConstants } from './ThemeConstants';

const DownloadPrompt = ({ setShowDownloadPrompt }) => {
  // Get theme-related constants
  const themeConstants = useThemeConstants();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeConstants.modalBackgroundColor} p-6 rounded-lg shadow-xl max-w-md w-full transition-colors duration-200`}>
        <h3 className={`text-xl font-semibold mb-4 ${themeConstants.labelAccentColor}`}>Query Results Ready</h3>
        <p className="mb-4">Your HelixHunt query results are ready to download.</p>
        <div className="flex justify-between">
          <button className={`${themeConstants.primaryButtonBackgroundColor} hover:${themeConstants.primaryButtonHoverColor} text-white px-4 py-2 rounded transition-colors duration-200 flex items-center`}>
            <FileDown className="mr-2" size={18} />
            Download Results
          </button>
          <button onClick={() => setShowDownloadPrompt(false)} className={`${themeConstants.secondaryButtonBackgroundColor} hover:${themeConstants.secondaryButtonHoverColor} text-white px-4 py-2 rounded transition-colors duration-200 flex items-center`}>
            <X className="mr-2" size={18} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadPrompt;