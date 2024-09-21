import React, { useState } from 'react';
import { X } from 'lucide-react';

const GeneVariationSearch = ({ isDarkMode, geneVariationIDs, onAddID, onRemoveID }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddID = () => {
    if (inputValue.trim()) {
      onAddID(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="mb-6">
      <label className={`block mb-1 font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
        Gene Variation IDs (Optional)
      </label>
      <div className="flex mb-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className={`flex-grow p-2 rounded-l ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition-colors duration-200`}
          placeholder="Enter Gene Variation ID"
        />
        <button
          type="button"
          onClick={handleAddID}
          className={`px-4 py-2 rounded-r ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'} text-white transition-colors duration-200`}
        >
          Add
        </button>
      </div>
      {geneVariationIDs.length > 0 && (
        <div className="mt-2">
          <p className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Added IDs:</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {geneVariationIDs.map((id) => (
              <div key={id} className={`flex items-center px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}>
                {id}
                <button 
                  onClick={() => onRemoveID(id)} 
                  className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={`Remove ${id}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneVariationSearch;