import React, { useState } from 'react';

const GeneSelection = ({ isDarkMode, selectedGenes, setSelectedGenes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const allGenes = ['BRCA1', 'BRCA2', 'TP53', 'EGFR', 'KRAS', 'APC', 'PTEN', 'RB1', 'VEGF', 'MDM2']; // Example genes

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
    <div className="w-1/3 pr-4">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 h-full transition-colors duration-200`}>
        <h2 className="text-xl font-semibold mb-4">Select Genes</h2>
        <input
          type="text"
          placeholder="Search genes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full p-2 mb-4 rounded ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'} border focus:ring focus:ring-indigo-500 focus:ring-opacity-50`}
        />
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredGenes.map(gene => (
            <button
              key={gene}
              onClick={() => toggleGene(gene)}
              className={`w-full px-4 py-2 rounded ${
                selectedGenes.includes(gene)
                  ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white')
                  : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')
              } transition-colors duration-200`}
            >
              {gene}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GeneSelection;