import React, { useState, useEffect } from 'react';
import { Dna } from 'lucide-react';

const GeneLoader = ({ loading = true, size = 24 }) => {
  const [isSpinning, setIsSpinning] = useState(true);

  useEffect(() => {
    if (!loading) {
      setIsSpinning(false);
      return;
    }

    const spinDuration = 2000;
    const pauseDuration = 500;

    const interval = setInterval(() => {
      setIsSpinning(prev => !prev);
    }, isSpinning ? spinDuration : pauseDuration);

    return () => clearInterval(interval);
  }, [loading, isSpinning]);

  return (
    <div className={`transition-transform duration-1000 ${isSpinning ? 'animate-spin' : ''}`}>
      <Dna size={size} className="text-blue-500" />
    </div>
  );
};

export default GeneLoader;