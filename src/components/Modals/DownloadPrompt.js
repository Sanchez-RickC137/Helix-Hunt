import React from 'react';
import { FileDown, Eye, X } from 'lucide-react';

const DownloadPrompt = ({ setShowDownloadPrompt, onPreviewResults, themeConstants }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className={`${themeConstants.sectionBackgroundColor} p-6 rounded-lg shadow-xl max-w-md w-full transition-colors duration-200`}>
        <h3 className={`text-xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>Query Results Ready</h3>
        <p className={`mb-6 ${themeConstants.mainTextColor}`}>Your HelixHunt query results are ready. You can download them or preview the results.</p>
        <div className="flex justify-between space-x-4">
          <button className={`flex-1 ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white px-4 py-2 rounded transition-colors duration-200 flex items-center justify-center`}>
            <FileDown className="mr-2" size={18} />
            Download
          </button>
          <button 
            onClick={onPreviewResults}
            className={`flex-1 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded transition-colors duration-200 flex items-center justify-center`}
          >
            <Eye className="mr-2" size={18} />
            Preview
          </button>
          <button onClick={() => setShowDownloadPrompt(false)} className={`${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white px-4 py-2 rounded transition-colors duration-200 flex items-center justify-center`}>
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadPrompt;