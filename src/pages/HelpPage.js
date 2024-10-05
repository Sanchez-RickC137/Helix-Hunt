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
          <li>Navigate to the Query page</li>
          <li>Choose your query type: Gene Symbol or Variation ID</li>
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
            <h3 className="text-xl font-medium mb-1">Gene Symbol Query</h3>
            <p>Use this option to search for variations associated with a specific gene.</p>
            <ul className="list-disc list-inside ml-4">
              <li>Gene Symbol (required): Enter the gene symbol (e.g., BRCA1)</li>
              <li>DNA Change (optional): Specify the DNA change (e.g., c.123A>G)</li>
              <li>Protein Change (optional): Specify the protein change (e.g., p.Lys41Arg)</li>
              <li>Note: If you provide a Protein Change, you must also provide a DNA Change</li>
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
        <h2 className="text-2xl font-semibold mb-2">Interpreting Results</h2>
        <p>After submitting your query, you'll receive a table of results containing:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Submission details</li>
          <li>Clinical significance</li>
          <li>Affected status</li>
          <li>Review status</li>
          <li>Submitter information</li>
          <li>Last updated date</li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-2">Tips</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>For the most specific results, provide as much information as possible in your query</li>
          <li>Use the Gene Symbol query when you want to explore multiple variations associated with a gene</li>
          <li>Use the Variation ID query when you have a specific variation in mind</li>
          <li>Remember that DNA Change is required if you want to specify a Protein Change</li>
        </ul>
      </section>
      <p className="mt-8">For more detailed information or if you need further assistance, please contact our support team.</p>
    </div>
  );
};

export default HelpPage;