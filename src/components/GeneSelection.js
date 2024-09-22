// components/GeneSelection.js
import React, { useState } from 'react';

const GeneSelection = ({ isDarkMode, selectedGenes, setSelectedGenes }) => {
  const [searchTerm, setSearchTerm] = useState('');
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
    <div className="h-full flex flex-col">
      <input
        type="text"
        placeholder="Search genes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={`w-full p-2 mb-4 rounded ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'} border focus:ring focus:ring-blue-500 focus:ring-opacity-50`}
      />
      <div className="space-y-2 flex-grow overflow-y-auto">
        {filteredGenes.map(gene => (
          <button
            key={gene}
            onClick={() => toggleGene(gene)}
            className={`w-full px-4 py-2 rounded text-left ${
              selectedGenes.includes(gene)
                ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')
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