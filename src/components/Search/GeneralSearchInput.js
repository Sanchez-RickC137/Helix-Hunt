import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';
import debounce from 'lodash/debounce';

const GeneralSearchInput = ({ onAddSearchGroup }) => {
  const themeConstants = useThemeConstants();
  const [geneSymbol, setGeneSymbol] = useState('');
  const [dnaChange, setDNAChange] = useState('');
  const [proteinChange, setProteinChange] = useState('');
  const [geneSuggestions, setGeneSuggestions] = useState([]);
  const [allGeneSymbols, setAllGeneSymbols] = useState([]);

  // Fetch gene symbols on component mount
  useEffect(() => {
    const fetchGeneSymbols = async () => {
      try {
        const response = await fetch('/data/Gene_Symbol.txt');
        if (!response.ok) throw new Error('Failed to fetch gene symbols');
        const text = await response.text();
        const symbols = text.split('\n').map(symbol => symbol.trim()).filter(Boolean);
        setAllGeneSymbols(symbols);
      } catch (error) {
        console.error('Error loading gene symbols:', error);
      }
    };

    fetchGeneSymbols();
  }, []);

  // Update suggestions when gene symbol input changes
  const updateSuggestions = debounce((input) => {
    if (!input) {
      setGeneSuggestions([]);
      return;
    }
    const filtered = allGeneSymbols
      .filter(symbol => symbol.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 5);
    setGeneSuggestions(filtered);
  }, 300);

  const handleAddGroup = () => {
    if (!geneSymbol && !dnaChange && !proteinChange) {
      return; // Don't add empty groups
    }
    
    const group = {
      geneSymbol: geneSymbol || null,
      dnaChange: dnaChange || null,
      proteinChange: proteinChange || null
    };
    
    onAddSearchGroup(group);
    
    // Clear inputs after adding
    setGeneSymbol('');
    setDNAChange('');
    setProteinChange('');
    setGeneSuggestions([]);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl text-center font-semibold mb-2">Create Search Group</h3>
      
      {/* Gene Symbol Input */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Gene Symbol</h3>
        <div className="relative">
          <input
            type="text"
            value={geneSymbol}
            onChange={(e) => {
              setGeneSymbol(e.target.value);
              updateSuggestions(e.target.value);
            }}
            className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border`}
            placeholder="Enter gene symbol..."
          />
          {geneSuggestions.length > 0 && (
            <ul className={`absolute z-10 w-full mt-1 ${themeConstants.sectionBackgroundColor} border border-gray-300 rounded shadow-lg`}>
              {geneSuggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className={`p-2 cursor-pointer hover:${themeConstants.unselectedItemHoverColor}`}
                  onClick={() => {
                    setGeneSymbol(suggestion);
                    setGeneSuggestions([]);
                  }}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* DNA Change Input */}
      <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-2">DNA Change</h3>
        <input
          type="text"
          value={dnaChange}
          onChange={(e) => setDNAChange(e.target.value)}
          className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border`}
          placeholder="Enter DNA change..."
        />
      </div>

      {/* Protein Change Input */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Protein Change</h3>
        <input
          type="text"
          value={proteinChange}
          onChange={(e) => setProteinChange(e.target.value)}
          className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border`}
          placeholder="Enter protein change..."
        />
      </div>

      {/* Add Group Button */}
      <button
        onClick={handleAddGroup}
        className={`w-full px-4 py-2 rounded ${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200 flex items-center justify-center`}
      >
        <Plus size={20} className="mr-2" />
        Add Search Group
      </button>
    </div>
  );
};

export default GeneralSearchInput;