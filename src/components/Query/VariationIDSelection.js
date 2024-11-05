/**
 * Variation ID selection component
 * Handles input and validation of ClinVar variation IDs
 * 
 * @param {Object} props
 * @param {Function} props.onAddVariationID - Callback function to add a new variation ID
 */

import React, { useState } from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const VariationIDSelection = ({ onAddVariationID }) => {
  // State for input field
  const [inputValue, setInputValue] = useState('');
  const themeConstants = useThemeConstants();

  /**
   * Handles adding a new variation ID
   * Validates and trims input before adding
   */
  const handleAddVariationID = () => {
    if (inputValue.trim()) {
      onAddVariationID(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="w-full mb-6">
      <h3 className="text-lg font-semibold mb-2">Variation ID</h3>
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
          Add to Query
        </button>
      </div>
    </div>
  );
};

export default VariationIDSelection;