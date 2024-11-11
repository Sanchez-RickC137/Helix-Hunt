import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, BookOpen, Navigation2, X } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';

const HelpOption = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  description
}) => {
  const themeConstants = useThemeConstants();
 
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center p-3 rounded-lg transition-colors ${
        isActive
          ? `${themeConstants.buttonBackgroundColor} text-white`
          : `hover:${themeConstants.unselectedItemHoverColor}`
      }`}
    >
      <Icon size={20} className="mr-3" />
      <div className="text-left">
        <span className="text-sm font-medium block">{label}</span>
        {description && (
          <span className="text-xs text-gray-500 block mt-0.5">{description}</span>
        )}
      </div>
    </button>
  );
};

const FloatingHelp = ({ activeHelp, setActiveHelp, stepGuideActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const themeConstants = useThemeConstants();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu when pressing escape
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  // Close menu when help option is active
  useEffect(() => {
    if (activeHelp) {
      setIsOpen(false);
    }
  }, [activeHelp]);

  const handleOptionClick = (option) => {
    if (activeHelp === option) {
      setActiveHelp(null);
    } else {
      setActiveHelp(option);
    }
    setIsOpen(false);
  };

  // Position adjustment when step guide is active
  const containerPosition = stepGuideActive 
    ? 'bottom-32 sm:bottom-6'
    : 'bottom-6';

  return (
    <div className={`fixed right-6 z-50 transition-all duration-300 ${containerPosition}`} ref={menuRef}>
      {/* Main floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${
          isOpen || activeHelp
            ? `${themeConstants.buttonBackgroundColor}`
            : `${themeConstants.primaryButtonBackgroundColor}`
        } w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 transform hover:scale-105 relative`}
        aria-label={isOpen ? "Close help menu" : "Open help menu"}
      >
        {isOpen ? <X size={24} /> : <HelpCircle size={24} />}
        {activeHelp && !isOpen && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full transform -translate-y-1 translate-x-1" />
        )}
      </button>

      {/* Help menu with animation */}
      <div
        className={`absolute right-0 ${themeConstants.sectionBackgroundColor} rounded-lg shadow-xl overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
        style={{
          bottom: 'calc(100% + 1rem)',
          width: '18rem',
          transformOrigin: 'bottom right'
        }}
      >
        <div className="p-4">
          <div className={`mb-4 flex items-center justify-center`}>
            <HelpCircle size={24} className={`mx-2 ${themeConstants.labelAccentColor}`} />
            <h2 className="text-lg font-semibold">Help Options</h2>
          </div>
          <div className="space-y-2">
            <HelpOption
              icon={HelpCircle}
              label="Contextual Help"
              description="Get help for specific elements"
              isActive={activeHelp === 'contextHelp'}
              onClick={() => handleOptionClick('contextHelp')}
            />
            <HelpOption
              icon={Navigation2}
              label="Step-by-Step"
              description="Follow step-by-step instructions"
              isActive={activeHelp === 'stepthrough'}
              onClick={() => handleOptionClick('stepthrough')}
            />
          </div>
        </div>
        
        {/* Decorative arrow */}
        <div 
          className={`absolute bottom-0 right-6 w-4 h-4 ${themeConstants.sectionBackgroundColor} transform rotate-45 translate-y-2`}
          style={{ boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}
        />
      </div>
    </div>
  );
};

export default FloatingHelp;