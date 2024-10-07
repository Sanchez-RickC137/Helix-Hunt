import React from 'react';
import { useThemeConstants } from '../components/Page/ThemeConstants';

const HelpPage = () => {
  const themeConstants = useThemeConstants();

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      <h1 className="text-3xl font-bold mb-4">Help & Tutorial</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Getting Started</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Create an account or log in to access all features</li>
          <li>Navigate to the Query page to start your genetic variation search</li>
          <li>Choose your query type: Full Name or Variation ID</li>
          <li>Enter the required information</li>
          <li>Set additional query parameters (optional)</li>
          <li>Review and submit your query</li>
          <li>Analyze the results</li>
        </ol>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Query Options</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium mb-1">Full Name Query</h3>
            <p>Use this option to search for variations associated with a specific gene.</p>
            <ul className="list-disc list-inside ml-4">
              <li>Gene Symbol (required): Enter the gene symbol (e.g., BRCA1)</li>
              <li>DNA Change (optional): Specify the DNA change (e.g., c.123A>G)</li>
              <li>Protein Change (optional): Specify the protein change (e.g., p.Lys41Arg)</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-medium mb-1">Variation ID Query</h3>
            <p>Use this option to search for a specific variation using its ClinVar ID.</p>
            <ul className="list-disc list-inside ml-4">
              <li>Variation ID (required): Enter the ClinVar Variation ID (e.g., 12345)</li>
            </ul>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Additional Parameters</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Clinical Significance: Filter results by clinical significance</li>
          <li>Date Range: Limit results to a specific time period</li>
          <li>Output Format: Choose the format for your results (e.g., XML, CSV, Tab-delimited)</li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Account Features</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Preferences: Set and manage your preferred full names and variation IDs for quick access</li>
          <li>Query History: View and reuse your past queries</li>
          <li>Password Change: Update your account password securely</li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Interpreting Results</h2>
        <p>After submitting your query, you'll receive a table of results containing:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Variant details (e.g., gene symbol, DNA change, protein change)</li>
          <li>Clinical significance</li>
          <li>Review status</li>
          <li>Condition information</li>
          <li>Submitter details</li>
          <li>Last updated date</li>
        </ul>
      </section>
      
      <section>
        <h2 className="text-2xl font-semibold mb-2">Tips</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Use the preferences feature to save frequently used full names or variation IDs</li>
          <li>Refer to your query history to quickly rerun or modify past queries</li>
          <li>For the most specific results, provide as much information as possible in your query</li>
          <li>Use the Full Name query when you want to explore multiple variations associated with a gene</li>
          <li>Use the Variation ID query when you have a specific variation in mind</li>
          <li>Regularly update your password to maintain account security</li>
        </ul>
      </section>
      
      <p className="mt-8">For more detailed information or if you need further assistance, please contact our support team.</p>
    </div>
  );
};

export default HelpPage;