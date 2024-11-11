// contexts/HelpContext.js
import React, { createContext, useContext, useState } from 'react';

const HelpContext = createContext();

export const HelpProvider = ({ children }) => {
  const [activeHelp, setActiveHelp] = useState(null);
  const [tourStep, setTourStep] = useState(0);
  const [helpPreferences, setHelpPreferences] = useState({
    hasSeenTour: false,
    hasUsedStepthrough: false,
  });

  const value = {
    activeHelp,
    setActiveHelp,
    tourStep,
    setTourStep,
    helpPreferences,
    setHelpPreferences,
  };

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};