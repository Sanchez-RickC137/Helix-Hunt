// components/GenePreferences.js
import React, { useState, useEffect } from 'react';

const GenePreferences = ({ userId, isDarkMode, initialPreferences, allGenes, onUpdatePreferences }) => {
  const [preferences, setPreferences] = useState(initialPreferences);

  useEffect(() => {
    setPreferences(initialPreferences);
  }, [initialPreferences]);

  const toggleGene = (gene) => {
    const newPreferences = preferences.includes(gene)
      ? preferences.filter(g => g !== gene)
      : [...preferences, gene];
    setPreferences(newPreferences);
    onUpdatePreferences(newPreferences);
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} p-4 rounded-lg shadow`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {allGenes.map(gene => (
          <button
            key={gene}
            onClick={() => toggleGene(gene)}
            className={`px-3 py-1 rounded-full text-sm ${
              preferences.includes(gene)
                ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white')
                : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')
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