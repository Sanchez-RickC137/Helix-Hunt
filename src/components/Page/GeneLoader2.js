import React, { useEffect, useState } from 'react';
import { Dna } from 'lucide-react';

const GeneLoader = ({ numGenes = 10, containerHeight = 200 }) => {
  const [genePositions, setGenePositions] = useState([]);

  useEffect(() => {
    // Initialize random positions and properties for each "gene"
    const generateGeneData = () =>
      Array.from({ length: numGenes }).map(() => ({
        size: Math.random() * 30 + 10, // Random size between 10px and 40px
        top: Math.random() * containerHeight, // Random vertical position
        zIndex: Math.floor(Math.random() * 3) + 1, // Z-index between 1 and 3
        delay: Math.random() * 2, // Random delay for smooth animation
        duration: Math.random() * 3 + 5, // Random animation duration between 5s and 8s
      }));

    setGenePositions(generateGeneData());

    // Reinitialize on resize
    const handleResize = () => setGenePositions(generateGeneData());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [numGenes, containerHeight]);

  return (
    <div
      className="flex relative overflow-hidden justify-center"
      style={{height: containerHeight, position: 'relative' }}
    >
      {genePositions.map((gene, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            top: gene.top,
            zIndex: gene.zIndex,
            animation: `slideLeft ${gene.duration}s linear ${gene.delay}s infinite`,
          }}
        >
          <Dna
            size={gene.size}
            className={`text-blue-${gene.zIndex === 1 ? '300' : gene.zIndex === 2 ? '500' : '700'}`}
          />
        </div>
      ))}
      <style jsx="true">{`
        @keyframes slideLeft {
          0% {
            transform: translateX(500%);
          }
          100% {
            transform: translateX(-500%);
          }
        }
      `}</style>
    </div>
  );
};

export default GeneLoader;