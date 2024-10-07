import React from 'react';
import { Download } from 'lucide-react';

const QueryPreferences = ({ isLoggedIn, onLoadGenePreferences, onLoadVariantPreferences }) => {
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="flex space-x-4 mb-4">
      <button
        onClick={onLoadGenePreferences}
        className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        <Download size={18} />
        <span className="ml-2">Load Gene Preferences</span>
      </button>
      <button
        onClick={onLoadVariantPreferences}
        className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        <Download size={18} />
        <span className="ml-2">Load Variant Preferences</span>
      </button>
    </div>
  );
};

export default QueryPreferences;