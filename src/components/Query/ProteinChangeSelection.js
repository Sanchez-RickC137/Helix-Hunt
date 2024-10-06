import React, { useState, useEffect, useCallback } from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';
import debounce from 'lodash/debounce';

const ProteinChangeSelection = ({ selectedProteinChange, setSelectedProteinChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allProteinChanges, setAllProteinChanges] = useState([]);
  const themeConstants = useThemeConstants();

  useEffect(() => {
    const fetchProteinChanges = async () => {
      try {
        const response = await fetch('/data/Protein_Change.txt');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const proteinChanges = text.split('\n').map(change => change.trim()).filter(change => change);
        setAllProteinChanges(proteinChanges);
      } catch (error) {
        console.error('Error loading protein changes:', error);
      }
    };

    fetchProteinChanges();
  }, []);

  const debouncedSuggestions = useCallback(
    debounce((searchTerm) => {
      if (searchTerm.length > 0) {
        const filteredSuggestions = allProteinChanges
          .filter(change => change.toLowerCase().includes(searchTerm.toLowerCase()))
          .slice(0, 5);
        setSuggestions(filteredSuggestions);
      } else {
        setSuggestions([]);
      }
    }, 300),
    [allProteinChanges]
  );

  useEffect(() => {
    debouncedSuggestions(searchTerm);
  }, [searchTerm, debouncedSuggestions]);

  const handleSelectProteinChange = (change) => {
    setSelectedProteinChange(change);
    setSearchTerm('');
    setSuggestions([]);
  };

  return (
    <div className="w-full mb-4">
      <h3 className="text-lg font-semibold mb-2">Protein Change Selection</h3>
      <div className="flex mb-2">
        <input
          type="text"
          placeholder="Enter protein change..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50`}
        />
        <button
          onClick={() => handleSelectProteinChange(searchTerm)}
          className={`px-4 py-2 rounded-r ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
        >
          Select
        </button>
      </div>
      {suggestions.length > 0 && (
        <ul className={`${themeConstants.sectionBackgroundColor} border border-gray-300 rounded mt-1`}>
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className={`p-2 cursor-pointer hover:${themeConstants.unselectedItemHoverColor}`}
              onClick={() => handleSelectProteinChange(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
      {selectedProteinChange && (
        <div className="mt-2">
          <span
            className={`inline-block ${themeConstants.tagBackgroundColor} rounded-full px-3 py-1 text-sm font-semibold`}
          >
            {selectedProteinChange}
            <button
              onClick={() => setSelectedProteinChange('')}
              className="ml-2 font-bold"
            >
              &times;
            </button>
          </span>
        </div>
      )}
    </div>
  );
};

export default ProteinChangeSelection;