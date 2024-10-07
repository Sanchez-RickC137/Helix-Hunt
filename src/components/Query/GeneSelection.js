import React, { useState, useEffect, useCallback } from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';
import debounce from 'lodash/debounce';
import { Plus } from 'lucide-react';

const GeneSelection = ({ selectedGene, setSelectedGene }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allGenes, setAllGenes] = useState([]);
  const themeConstants = useThemeConstants();

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

  useEffect(() => {
    debouncedSuggestions(searchTerm);
  }, [searchTerm, debouncedSuggestions]);

  const handleSelectGene = (gene) => {
    setSelectedGene(gene);
    setSearchTerm('');
    setSuggestions([]);
  };

  return (
    <div className="w-full mb-4">
      <h3 className="text-lg font-semibold mb-2">Transcipt & Gene OR Full Name</h3>
      <div className="flex mb-2">
        <input
          type="text"
          placeholder="Search or enter gene..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`flex-grow p-2 rounded-l ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50`}
        />
        <button
          onClick={() => handleSelectGene(searchTerm)}
          className={`px-4 py-2 rounded-r ${themeConstants.primaryButtonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
        >
          <Plus size={20}/>
        </button>
      </div>
      {suggestions.length > 0 && (
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
      {selectedGene && (
        <div className="mt-2">
          <span
            className={`inline-block ${themeConstants.tagBackgroundColor} rounded-full px-3 py-1 text-sm font-semibold`}
          >
            {selectedGene}
            <button
              onClick={() => setSelectedGene('')}
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

export default GeneSelection;