import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const GeneratedFullNameSelection = ({ fullName, onAddFullName }) => {
  const themeConstants = useThemeConstants();

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Full Gene Name (Generated)</h3>
      <div className="flex">
        <input
          type="text"
          value={fullName}
          readOnly
          className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-gray-200 cursor-not-allowed`}
        />
        <button
          onClick={onAddFullName}
          className={`px-4 py-2 rounded-r ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
        >
          Add to Query
        </button>
      </div>
    </div>
  );
};

export default GeneratedFullNameSelection;