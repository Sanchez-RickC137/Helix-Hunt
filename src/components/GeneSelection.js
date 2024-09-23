import React, { useState } from 'react';
import { useThemeConstants } from './ThemeConstants';

const GeneSelection = ({ selectedGenes, setSelectedGenes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const themeConstants = useThemeConstants();

  const allGenes = ['BRCA1', 'BRCA2', 'TP53', 'EGFR', 'KRAS', 'APC', 'PTEN', 'RB1', 'VEGF', 'MDM2'];

  const filteredGenes = allGenes.filter(gene =>
    gene.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleGene = (gene) => {
    if (selectedGenes.includes(gene)) {
      setSelectedGenes(selectedGenes.filter(g => g !== gene));
    } else {
      setSelectedGenes([...selectedGenes, gene]);
    }
  };

  return (
    <div className="w-full">
      <input
        type="text"
        placeholder="Search genes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={`w-full p-2 mb-4 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50`}
      />
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredGenes.map(gene => (
          <button
            key={gene}
            onClick={() => toggleGene(gene)}
            className={`w-full px-4 py-2 rounded ${
              selectedGenes.includes(gene)
                ? `${themeConstants.tagBackgroundColor} ${themeConstants.selectedItemTextColor}`
                : `${themeConstants.unselectedItemBackgroundColor} hover:${themeConstants.unselectedItemHoverColor}`
            } transition-colors duration-200`}
          >
            {gene}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GeneSelection;