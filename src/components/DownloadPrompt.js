import React from 'react';
import { FileDown, X } from 'lucide-react';

const DownloadPrompt = ({ isDarkMode, setShowDownloadPrompt }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-xl max-w-md w-full transition-colors duration-200`}>
      <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Query Results Ready</h3>
      <p className="mb-4">Your HelixHunt query results are ready to download.</p>
      <div className="flex justify-between">
        <button className={`${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white px-4 py-2 rounded transition-colors duration-200 flex items-center`}>
          <FileDown className="mr-2" size={18} />
          Download Results
        </button>
        <button onClick={() => setShowDownloadPrompt(false)} className={`${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-300 hover:bg-gray-400'} text-white px-4 py-2 rounded transition-colors duration-200 flex items-center`}>
          <X className="mr-2" size={18} />
          Close
        </button>
      </div>
    </div>
  </div>
);

export default DownloadPrompt;