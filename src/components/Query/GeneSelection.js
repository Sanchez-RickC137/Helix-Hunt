/**
 * Gene selection component with autocomplete
 * Handles gene search and selection with suggestions
 * 
 * @param {Object} props
 * @param {string} props.selectedGene - Currently selected gene
 * @param {Function} props.setSelectedGene - Function to update selected gene
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';
import debounce from 'lodash/debounce';
import { Plus, Minus } from 'lucide-react';

const GeneSelection = ({ selectedGene, setSelectedGene }) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allGenes, setAllGenes] = useState([]);
  const themeConstants = useThemeConstants();

  /**
   * Fetches gene data on component mount
   */
  useEffect(() => {
    const fetchGenes = async () => {
      try {
        const response = await fetch('/data/TranscriptID_GeneSym.txt');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const genes = text.split('\n').map(gene => gene.trim()).filter(gene => gene);
        setAllGenes(genes);
      } catch (error) {
        console.error('Error loading gene symbols:', error);
      }
    };
    fetchGenes();
  }, []);

  /**
   * Debounced function to update suggestions based on search term
   */
  const debouncedSuggestions = useCallback(
    debounce((searchTerm) => {
      if (searchTerm.length > 0) {
        const filteredSuggestions = allGenes
          .filter(gene => gene.toLowerCase().includes(searchTerm.toLowerCase()))
          .slice(0, 5);
        setSuggestions(filteredSuggestions);
      } else {
        setSuggestions([]);
      }
    }, 300),
    [allGenes]
  );

  /**
   * Updates suggestions when search term changes
   */
  useEffect(() => {
    debouncedSuggestions(searchTerm);
  }, [searchTerm, debouncedSuggestions]);

  /**
   * Handles selection of gene from suggestions
   */
  const handleSelectGene = useCallback((gene) => {
    setSelectedGene(gene);
    setSearchTerm('');
    setSuggestions([]);
  }, [setSelectedGene]);

  /**
   * Handles add/remove button click
   */
  const handleButtonClick = useCallback(() => {
    if (selectedGene) {
      setSelectedGene('');
      setSearchTerm('');
    } else if (searchTerm) {
      handleSelectGene(searchTerm);
    }
  }, [selectedGene, searchTerm, setSelectedGene, handleSelectGene]);

  return (
    <div className="w-full mb-4">
      <h3 className="text-lg font-semibold mb-2">Transcript & Gene OR Full Name</h3>
      <div className="flex mb-2">
        <input
          type="text"
          placeholder="Search or enter gene..."
          value={selectedGene || searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (selectedGene) setSelectedGene('');
          }}
          className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50`}
        />
        <button
          onClick={handleButtonClick}
          className={`px-4 py-2 rounded-r ${selectedGene ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white transition-colors duration-200`}
        >
          {selectedGene ? <Minus size={20}/> : <Plus size={20}/>}
        </button>
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && !selectedGene && (
        <ul className={`${themeConstants.sectionBackgroundColor} border border-gray-300 rounded mt-1`}>
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className={`p-2 cursor-pointer hover:${themeConstants.unselectedItemHoverColor}`}
              onClick={() => handleSelectGene(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GeneSelection;