/**
 * About page component
 * Provides information about the HelixHunt application
 * Includes mission statement, features, and development plans
 */

import React from 'react';
import { useThemeConstants } from '../components/Page/ThemeConstants';

const AboutPage = () => {
  const themeConstants = useThemeConstants();

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      {/* Mission Statement Section */}
      <h1 className={`text-3xl font-bold mb-6 ${themeConstants.headingTextColor}`}>About HelixHunt</h1>
      
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>Our Mission</h2>
        <p className="mb-4">
          HelixHunt is a cutting-edge platform designed to explore and analyze genetic variations with unprecedented ease and efficiency. Our mission is to empower researchers, clinicians, and enthusiasts in the field of genetics by providing a user-friendly interface to complex genomic data.
        </p>
        <p>
          Whether you're conducting academic research, clinical diagnostics, or simply curious about the world of genetics, HelixHunt is here to make your journey of discovery smoother and more insightful.
        </p>
      </section>

      {/* Key Features Section */}
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>Key Features</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Advanced query builder for genetic variations</li>
          <li>Support for gene symbols, DNA changes, and protein changes</li>
          <li>Direct Variation ID search capability</li>
          <li>Clinical significance filtering</li>
          <li>Date range selection for targeted searches</li>
          <li>User accounts with personalized preferences</li>
          <li>Query history tracking (last 5 queries)</li>
          <li>Multiple download formats: CSV, TSV, and XML</li>
          <li>Interactive results preview</li>
        </ul>
      </section>

      {/* Updates Section */}
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>Recent Updates</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Improved query interface with streamlined parameter selection</li>
          <li>Enhanced download options, now including XML format</li>
          <li>Optimized query history, displaying the 5 most recent searches</li>
          <li>Improved user authentication and security measures</li>
          <li>Dark mode support for comfortable viewing in all environments</li>
        </ul>
      </section>

      {/* Data Sources Section */}
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>Data Sources</h2>
        <p>
          HelixHunt utilizes data from ClinVar, a public archive of reports of relationships among human variations and phenotypes, with supporting evidence. We strive to provide the most up-to-date and accurate information available.
        </p>
      </section>

      {/* Future Development Section */}
      <section>
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>Future Developments</h2>
        <p>
          We are continuously working to improve HelixHunt and expand its capabilities. Future updates may include integration with additional genomic databases, advanced visualization tools, and enhanced collaborative features for research teams.
        </p>
      </section>
    </div>
  );
};

export default AboutPage;