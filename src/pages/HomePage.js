import React from 'react';
import { Link } from 'react-router-dom';
import Particles from '../components/Particles';
import { useThemeConstants } from '../components/ThemeConstants';

const HomePage = () => {
  // Get theme-related constants
  const themeConstants = useThemeConstants();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Particle animation background */}
      <div className="absolute inset-0">
        <Particles id="tsparticles" />
      </div>
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <h1 className={`text-6xl font-bold mb-8 ${themeConstants.headingTextColor}`}>
          Welcome to HelixHunt
        </h1>
        <p className={`text-3xl mb-12 max-w-3xl ${themeConstants.mainTextColor}`}>
          Explore genetic variations with such ease, you'll swear this tool was made just for you.
        </p>
        <Link
          to="/query"
          className={`${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white text-2xl font-bold py-4 px-8 rounded-lg transition-colors duration-200`}
        >
          Start a New Query
        </Link>
      </div>
    </div>
  );
};

export default HomePage;