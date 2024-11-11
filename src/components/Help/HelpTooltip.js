import React, { useState } from 'react';
import { useHelp } from '../../contexts/HelpContext';

const HelpTooltip = ({ 
  content,
  children,
  placement = 'top',
  width = 'w-64'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const { activeHelp } = useHelp();
  
  if (activeHelp !== 'contextHelp') {
    return children;
  }

  return (
    <div 
      className="relative inline-block w-full"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div 
          className="absolute z-50"
          style={{
            [placement === 'top' ? 'bottom' : 'top']: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className={`${width} bg-gray-900 text-white text-sm rounded-lg p-2 mt-2`}>
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpTooltip;