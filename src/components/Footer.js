import React from 'react';
import { useThemeConstants } from './ThemeConstants';

const Footer = () => {
  // Get theme-related constants
  const themeConstants = useThemeConstants();

  return (
    <footer className={`${themeConstants.footerBackgroundColor} ${themeConstants.footerTextColor} mt-8 py-4 transition-colors duration-200`} style={{zIndex: 1}}>
      <div className="container mx-auto text-center">
        <p>&copy; 2024 HelixHunt. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;