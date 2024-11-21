/**
 * Home page component
 * Landing page with animated background and main call-to-action
 * Entry point for user interaction with the application
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Particles from '../components/Page/Particles';
import JokeOfTheDay from '../components/Page/JokeOfTheDay';
import { useThemeConstants } from '../components/Page/ThemeConstants';

const HomePage = () => {
  const themeConstants = useThemeConstants();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated DNA background */}
      <div className="absolute inset-0">
        <Particles id="tsparticles" />
        <JokeOfTheDay />
      </div>

      {/* Main content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 text-center">
        {/* Heading */}
        <h1
          className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8 ${themeConstants.headingTextColor}`}
        >
          Welcome to HelixHunt
        </h1>

        {/* Description */}
        <p
          className={`text-lg sm:text-xl md:text-2xl lg:text-3xl mb-12 max-w-3xl ${themeConstants.mainTextColor}`}
        >
          Explore genetic variations with such ease, you'll swear this tool was made just for you.
        </p>

        {/* Call to Action */}
        <Link
          to="/query"
          className={`${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white text-lg sm:text-xl md:text-2xl font-bold py-4 px-8 rounded-lg transition-colors duration-200`}
        >
          Start a New Query
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
