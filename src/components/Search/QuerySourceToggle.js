import React from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const QuerySourceToggle = React.memo(function QuerySourceToggle({ querySource, setQuerySource }) {
  const themeConstants = useThemeConstants();

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => setQuerySource('web')}
        className={`px-3 py-1 rounded-lg transition-colors ${
          querySource === 'web'
            ? `${themeConstants.buttonBackgroundColor} text-white`
            : 'bg-gray-200 hover:bg-gray-300'
        }`}
      >
        Web Query
      </button>
      <button
        type="button"
        onClick={() => setQuerySource('database')}
        className={`px-3 py-1 rounded-lg transition-colors ${
          querySource === 'database'
            ? `${themeConstants.buttonBackgroundColor} text-white`
            : 'bg-gray-200 hover:bg-gray-300'
        }`}
      >
        Database Query
      </button>
    </div>
  );
});

export default QuerySourceToggle;