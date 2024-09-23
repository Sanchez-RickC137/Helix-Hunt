import React from 'react';
import { useThemeConstants } from '../components/ThemeConstants';

const AboutPage = () => {
  // Get theme-related constants
  const themeConstants = useThemeConstants();

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      <h1 className="text-3xl font-bold mb-4">About HelixHunt</h1>
      <p className="mb-4">
        HelixHunt is a cutting-edge platform designed to explore and analyze genetic variations with unprecedented ease and efficiency.
      </p>
      <p className="mb-4">
        Our mission is to empower researchers, clinicians, and enthusiasts in the field of genetics by providing a user-friendly interface to complex genomic data.
      </p>
      <p>
        Whether you're conducting academic research, clinical diagnostics, or simply curious about the world of genetics, HelixHunt is here to make your journey of discovery smoother and more insightful.
      </p>
    </div>
  );
};

export default AboutPage;