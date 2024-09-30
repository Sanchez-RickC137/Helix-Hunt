import React, { useState, useEffect } from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';

const GeneSelection = ({ selectedGenes, setSelectedGenes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allGenes, setAllGenes] = useState([]);
  const [displayedGenes, setDisplayedGenes] = useState([]);
  const themeConstants = useThemeConstants();

  useEffect(() => {
    const fetchGenes = async () => {
      try {
        const response = await fetch('/data/GeneSymbols.txt');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const genes = text.split('\n').map(gene => gene.trim()).filter(gene => gene);
        setAllGenes(genes);
        setDisplayedGenes(genes.slice(0, 3));
      } catch (error) {
        console.error('Error loading gene symbols:', error);
      }
    };

    fetchGenes();
  }, []);

  useEffect(() => {
    const filtered = allGenes.filter(gene =>
      gene.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setDisplayedGenes(filtered);
  }, [searchTerm, allGenes]);

  const toggleGene = (gene) => {
    if (selectedGenes.includes(gene)) {
      setSelectedGenes(selectedGenes.filter(g => g !== gene));
    } else {
      setSelectedGenes([...selectedGenes, gene]);
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">Gene Selection</h3>
      <input
        type="text"
        placeholder="Search genes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={`w-full p-2 mb-4 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50`}
      />
      <div className="h-[144px] overflow-y-auto">
        {displayedGenes.map(gene => (
          <button
            key={gene}
            onClick={() => toggleGene(gene)}
            className={`w-full px-4 py-2 mb-2 rounded ${
              selectedGenes.includes(gene)
                ? `${themeConstants.tagBackgroundColor} ${themeConstants.selectedItemTextColor}`
                : `${themeConstants.unselectedItemBackgroundColor} hover:${themeConstants.unselectedItemHoverColor}`
            } transition-colors duration-200`}
          >
            {gene}
          </button>
        ))}
        {displayedGenes.length === 0 && (
          <div className="text-center py-4 text-gray-500">No genes found</div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {selectedGenes.map(gene => (
          <span
            key={gene}
            className={`inline-block ${themeConstants.tagBackgroundColor} rounded-full px-3 py-1 text-sm font-semibold`}
          >
            {gene}
            <button
              onClick={() => toggleGene(gene)}
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

export default GeneSelection;