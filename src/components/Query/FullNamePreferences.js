/**
 * Full name preferences management component
 * Allows users to add and remove preferred full names
 * 
 * @param {Object} props
 * @param {string[]} props.preferences - Array of saved full name preferences
 * @param {Function} props.onUpdatePreferences - Callback to update preferences
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';

const FullNamePreferences = ({ preferences, onUpdatePreferences }) => {
  const [newPreference, setNewPreference] = useState('');
  const themeConstants = useThemeConstants();

  /**
   * Handles adding a new preference
   * Validates for duplicates before adding
   */
  const handleAddPreference = () => {
    if (newPreference && !preferences.includes(newPreference)) {
      onUpdatePreferences([...preferences, newPreference]);
      setNewPreference('');
    }
  };

  /**
   * Removes a preference from the list
   * @param {string} pref - Preference to remove
   */
  const handleRemovePreference = (pref) => {
    onUpdatePreferences(preferences.filter(p => p !== pref));
  };

  return (
    <div>
      <div className="mb-4 flex">
        <input
          type="text"
          value={newPreference}
          onChange={(e) => setNewPreference(e.target.value)}
          placeholder="Enter full name preference"
          className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-blue-500 focus:ring-opacity-50`}
        />
        <button
          onClick={handleAddPreference}
          className={`px-4 py-2 rounded-r ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
        >
          Add Preference
        </button>
      </div>

      {/* Display existing preferences */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {preferences.map((pref, index) => (
          <div key={index} className={`${themeConstants.unselectedItemBackgroundColor} rounded-lg p-4 flex flex-col relative`}>
            <button
              onClick={() => handleRemovePreference(pref)}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 focus:outline-none"
            >
              <X size={18} />
            </button>
            <span className={`${themeConstants.mainTextColor}`}>{pref}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FullNamePreferences;