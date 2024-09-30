import React, { useState, useEffect } from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const GenePreferences = ({ userId, initialPreferences, allGenes, onUpdatePreferences }) => {
  // State to manage the user's current gene preferences
  const [preferences, setPreferences] = useState(initialPreferences);
  
  // Get theme-related constants
  const themeConstants = useThemeConstants();

  // Update preferences state when initialPreferences prop changes
  useEffect(() => {
    setPreferences(initialPreferences);
  }, [initialPreferences]);

  // Function to toggle a gene's selection status
  const toggleGene = (gene) => {
    const newPreferences = preferences.includes(gene)
      ? preferences.filter(g => g !== gene)
      : [...preferences, gene];
    setPreferences(newPreferences);
    onUpdatePreferences(newPreferences);
  };

  return (
    <div className={`${themeConstants.sectionBackgroundColor} p-4 rounded-lg shadow`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {allGenes.map(gene => (
          <button
            key={gene}
            onClick={() => toggleGene(gene)}
            className={`px-3 py-1 rounded-full text-sm ${
              preferences.includes(gene)
                ? themeConstants.tagBackgroundColor
                : `${themeConstants.unselectedItemBackgroundColor} hover:${themeConstants.unselectedItemHoverColor}`
            } transition-colors duration-200`}
          >
            {gene}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GenePreferences;