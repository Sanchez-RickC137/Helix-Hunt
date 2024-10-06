import React, { useState } from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const VariationIDSelection = ({ onAddVariationID }) => {
  const [inputValue, setInputValue] = useState('');
  const themeConstants = useThemeConstants();

  const handleAddVariationID = () => {
    if (inputValue.trim()) {
      onAddVariationID(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="w-full mb-6">
      <h3 className="text-lg font-semibold mb-2">Variation ID Selection</h3>
      <div className="flex mb-2">
        <input
          type="text"
          placeholder="Enter variation ID..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50`}
        />
        <button
          onClick={handleAddVariationID}
          className={`px-4 py-2 rounded-r ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default VariationIDSelection;