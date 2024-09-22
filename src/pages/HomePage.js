// pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import Particles from '../components/Particles';

const HomePage = ({ isDarkMode }) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <Particles id="tsparticles" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <h1 className={`text-6xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Welcome to HelixHunt
        </h1>
        <p className={`text-3xl mb-12 max-w-3xl ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Explore genetic variations with such ease, you'll swear this tool was made just for you.
        </p>
        <Link
          to="/query"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-2xl font-bold py-4 px-8 rounded-lg transition-colors duration-200"
        >
          Start a New Query
        </Link>
      </div>
    </div>
  );
};

export default HomePage;