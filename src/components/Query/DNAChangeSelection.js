import React, { useState, useEffect, useCallback } from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';
import debounce from 'lodash/debounce';
import { Plus, Minus } from 'lucide-react';

const DNAChangeSelection = ({ selectedDNAChange, setSelectedDNAChange, disabled }) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allDNAChanges, setAllDNAChanges] = useState([]);
  const themeConstants = useThemeConstants();

  /**
   * Fetches DNA change data on component mount
   */
  useEffect(() => {
    const fetchDNAChanges = async () => {
      try {
        const response = await fetch('/data/DNA_Change.txt');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const dnaChanges = text.split('\n')
          .map(change => change.trim())
          .filter(change => change);
        setAllDNAChanges(dnaChanges);
      } catch (error) {
        console.error('Error loading DNA changes:', error);
      }
    };
    fetchDNAChanges();
  }, []);

  /**
   * Debounced function to update suggestions based on search term
   * Filters suggestions to top 5 matches
   */
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

  /**
   * Updates suggestions when search term changes
   */
  useEffect(() => {
    debouncedSuggestions(searchTerm);
  }, [searchTerm, debouncedSuggestions]);

  /**
   * Handles selection of DNA change from suggestions
   */
  const handleSelectDNAChange = useCallback((change) => {
    setSelectedDNAChange(change);
    setSearchTerm('');
    setSuggestions([]);
  }, [setSelectedDNAChange]);

  /**
   * Handles add/remove button click
   * Toggles between adding new change and removing selected change
   */
  const handleButtonClick = useCallback(() => {
    if (selectedDNAChange) {
      setSelectedDNAChange('');
      setSearchTerm('');
    } else if (searchTerm) {
      handleSelectDNAChange(searchTerm);
    }
  }, [selectedDNAChange, searchTerm, setSelectedDNAChange, handleSelectDNAChange]);

  // Clear selectedDNAChange if disabled is true
  useEffect(() => {
    if (disabled) {
      setSelectedDNAChange('');
      setSearchTerm('');
      setSuggestions([]);
    }
  }, [disabled, setSelectedDNAChange]);

  return (
    <div className="w-full mb-4">
      <h3 className="text-lg font-semibold mb-2">DNA Change</h3>
      <div className="flex mb-2">
        <input
          type="text"
          placeholder="Enter DNA change..."
          value={selectedDNAChange || searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (selectedDNAChange) setSelectedDNAChange('');
          }}
          disabled={disabled}
          className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${disabled ? 'bg-gray-200 cursor-not-allowed' : ''}`}
        />
        {!disabled && (
          <button
            onClick={handleButtonClick}
            className={`px-4 py-2 rounded-r ${selectedDNAChange ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white transition-colors duration-200`}
          >
            {selectedDNAChange ? <Minus size={20}/> : <Plus size={20}/>}
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && !selectedDNAChange && !disabled && (
        <ul className={`${themeConstants.sectionBackgroundColor} border border-gray-300 rounded mt-1`}>
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className={`p-2 cursor-pointer hover:${themeConstants.unselectedItemHoverColor}`}
              onClick={() => handleSelectDNAChange(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DNAChangeSelection;
