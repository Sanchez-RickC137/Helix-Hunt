import React from 'react';

const Footer = ({ isDarkMode }) => (
  <footer className={`${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'} mt-8 py-4 transition-colors duration-200`} style={{zIndex: 1}}>
    <div className="container mx-auto text-center">
      <p>&copy; 2024 HelixHunt. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;