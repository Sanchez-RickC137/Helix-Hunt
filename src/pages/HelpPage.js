/**
 * Help and Documentation Page
 * Provides comprehensive guidance for using HelixHunt
 * Includes tutorials, feature explanations, and best practices
 */

import React from 'react';
import { useThemeConstants } from '../components/Page/ThemeConstants';

const HelpPage = () => {
  const themeConstants = useThemeConstants();

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      <h1 className={`text-3xl font-bold mb-6 ${themeConstants.headingTextColor}`}>
        Help & Tutorial
      </h1>
      
      {/* Getting Started Section */}
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>
          Getting Started
        </h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Create an account or log in to access all features</li>
          <li>Navigate to the Query page to start your genetic variation search</li>
          <li>Choose your query type: Gene Symbol, DNA Change, Protein Change, or Variation ID</li>
          <li>Enter the required information</li>
          <li>Set additional query parameters (optional)</li>
          <li>Review and submit your query</li>
          <li>Analyze the results</li>
        </ol>
      </section>
      
      {/* Query Options Section */}
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>
          Query Options
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium mb-2">Gene Symbol, DNA Change, and Protein Change</h3>
            <p>Use these options to search for variations associated with specific genetic characteristics:</p>
            <ul className="list-disc list-inside ml-4">
              <li>Gene Symbol: Enter the gene symbol (e.g., BRCA1)</li>
              <li>DNA Change: Specify the DNA change (e.g., c.123A>G)</li>
              <li>Protein Change: Specify the protein change (e.g., p.Lys41Arg)</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-medium mb-2">Variation ID</h3>
            <p>Use this option to search for a specific variation using its ClinVar ID:</p>
            <ul className="list-disc list-inside ml-4">
              <li>Variation ID: Enter the ClinVar Variation ID (e.g., 12345)</li>
            </ul>
          </div>
        </div>
      </section>
      
      {/* Additional Parameters Section */}
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>
          Additional Parameters
        </h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Clinical Significance:</strong> Filter results by clinical significance
            <ul className="list-disc list-inside ml-8">
              <li>Pathogenic</li>
              <li>Likely pathogenic</li>
              <li>Uncertain significance</li>
              <li>Likely benign</li>
              <li>Benign</li>
            </ul>
          </li>
          <li>
            <strong>Date Range:</strong> Limit results to a specific time period
            <ul className="list-disc list-inside ml-8">
              <li>Start Date: Beginning of the search period</li>
              <li>End Date: End of the search period</li>
            </ul>
          </li>
        </ul>
      </section>
      
      {/* Account Features Section */}
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>
          Account Features
        </h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Preferences Management:</strong>
            <ul className="list-disc list-inside ml-8">
              <li>Save frequently used full names for quick access</li>
              <li>Store commonly searched variation IDs</li>
              <li>Customize your search experience</li>
            </ul>
          </li>
          <li>
            <strong>Query History:</strong>
            <ul className="list-disc list-inside ml-8">
              <li>View your last 5 queries</li>
              <li>Reuse previous queries with a single click</li>
              <li>Track your search patterns</li>
            </ul>
          </li>
          <li>
            <strong>Account Security:</strong>
            <ul className="list-disc list-inside ml-8">
              <li>Secure password management</li>
              <li>Password reset functionality</li>
              <li>Protected user preferences</li>
            </ul>
          </li>
        </ul>
      </section>
      
      {/* Interpreting Results Section */}
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>
          Interpreting Results
        </h2>
        <p>After submitting your query, you'll receive a table of results containing:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Variant Details:</strong>
            <ul className="list-disc list-inside ml-8">
              <li>Gene symbol and full name</li>
              <li>DNA change specification</li>
              <li>Protein change details</li>
              <li>Variation ID and accession numbers</li>
            </ul>
          </li>
          <li>
            <strong>Clinical Information:</strong>
            <ul className="list-disc list-inside ml-8">
              <li>Clinical significance classification</li>
              <li>Review status and criteria</li>
              <li>Associated conditions</li>
              <li>Submitter information</li>
            </ul>
          </li>
          <li>
            <strong>Temporal Data:</strong>
            <ul className="list-disc list-inside ml-8">
              <li>Last evaluated date</li>
              <li>Submission history</li>
              <li>Update timestamps</li>
            </ul>
          </li>
        </ul>
      </section>
      
      {/* Downloading Results Section */}
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>
          Downloading Results
        </h2>
        <p>You can download your query results in multiple formats:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>CSV (Comma-Separated Values):</strong>
            <ul className="list-disc list-inside ml-8">
              <li>Perfect for spreadsheet applications</li>
              <li>Easy to import into Excel or Google Sheets</li>
              <li>Standard format for data analysis</li>
            </ul>
          </li>
          <li>
            <strong>TSV (Tab-Separated Values):</strong>
            <ul className="list-disc list-inside ml-8">
              <li>Alternative spreadsheet format</li>
              <li>Better handling of comma-containing data</li>
              <li>Compatible with most analysis tools</li>
            </ul>
          </li>
          <li>
            <strong>XML (eXtensible Markup Language):</strong>
            <ul className="list-disc list-inside ml-8">
              <li>Structured data format</li>
              <li>Ideal for programmatic processing</li>
              <li>Maintains data relationships</li>
            </ul>
          </li>
        </ul>
      </section>
      
      {/* Best Practices Section */}
      <section>
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>
          Tips and Best Practices
        </h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Use preferences to save frequently searched variations for quick access</li>
          <li>Refer to your query history to quickly rerun or modify past queries</li>
          <li>Provide as much information as possible for more precise results</li>
          <li>Use Gene Symbol, DNA Change, and Protein Change together for specific searches</li>
          <li>Use the Variation ID search when you have a specific variant in mind</li>
          <li>Utilize clinical significance filters to focus on variations of particular interest</li>
          <li>Preview results before downloading to ensure they meet your needs</li>
          <li>Choose the download format that best suits your data analysis workflow</li>
          <li>Check the date range filter when looking for recent updates</li>
          <li>Save complex queries in your preferences for future use</li>
        </ul>
      </section>
      
      {/* Support Information */}
      <p className="mt-8 text-center">
        For additional support or technical assistance, please contact our support team
        through the provided channels. We're here to help you make the most of HelixHunt's features.
      </p>
    </div>
  );
};

export default HelpPage;