import React, { useState, useEffect, useCallback } from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';
import debounce from 'lodash/debounce';

const DNAChangeSelection = ({ selectedDNAChanges, setSelectedDNAChanges }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allDNAChanges, setAllDNAChanges] = useState([]);
  const themeConstants = useThemeConstants();

  useEffect(() => {
    const fetchDNAChanges = async () => {
      try {
        const response = await fetch('/data/DNAChange.txt');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const dnaChanges = text.split('\n').map(change => change.trim()).filter(change => change);
        setAllDNAChanges(dnaChanges);
      } catch (error) {
        console.error('Error loading DNA changes:', error);
      }
    };

    fetchDNAChanges();
  }, []);

  const debouncedSuggestions = useCallback(
    debounce((searchTerm) => {
      if (searchTerm.length > 0) {
        const filteredSuggestions = allDNAChanges
          .filter(change => change.toLowerCase().includes(searchTerm.toLowerCase()))
          .slice(0, 5);
        setSuggestions(filteredSuggestions);
      } else {
        setSuggestions([]);
      }
    }, 300),
    [allDNAChanges]
  );

  useEffect(() => {
    debouncedSuggestions(searchTerm);
  }, [searchTerm, debouncedSuggestions]);

  const addDNAChange = () => {
    if (searchTerm && !selectedDNAChanges.includes(searchTerm)) {
      setSelectedDNAChanges([...selectedDNAChanges, searchTerm]);
      setSearchTerm('');
    }
  };

  const removeDNAChange = (change) => {
    setSelectedDNAChanges(selectedDNAChanges.filter(c => c !== change));
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">DNA Change Selection</h3>
      <div className="flex mb-2">
        <input
          type="text"
          placeholder="Enter DNA change..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50`}
        />
        <button
          onClick={addDNAChange}
          className={`px-4 py-2 rounded-r ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
        >
          Add
        </button>
      </div>
      {suggestions.length > 0 && (
        <ul className={`${themeConstants.sectionBackgroundColor} border border-gray-300 rounded mt-1`}>
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className={`p-2 cursor-pointer hover:${themeConstants.unselectedItemHoverColor}`}
              onClick={() => setSearchTerm(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {selectedDNAChanges.map((change, index) => (
          <span
            key={index}
            className={`inline-block ${themeConstants.tagBackgroundColor} rounded-full px-3 py-1 text-sm font-semibold`}
          >
            {change}
            <button
              onClick={() => removeDNAChange(change)}
              className="ml-2 font-bold"
            >
              &times;
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default DNAChangeSelection;