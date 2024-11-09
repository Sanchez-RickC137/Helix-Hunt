import React from 'react';
import { useThemeConstants } from '../components/Page/ThemeConstants';
import { Compass, Database, Filter, Download, Save, History } from 'lucide-react';

const HelpPage = () => {
  const themeConstants = useThemeConstants();

  return (
    <div className={`container mx-auto mt-8 p-4 ${themeConstants.mainTextColor}`}>
      <h1 className={`text-3xl font-bold mb-6 ${themeConstants.headingTextColor}`}>
        Help & Documentation
      </h1>
      
      {/* Quick Start Guide */}
      <section className="mb-12">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor} flex items-center`}>
          <Compass className="mr-2" />
          Getting Started
        </h2>
        <div className={`p-6 rounded-lg ${themeConstants.sectionBackgroundColor}`}>
          <ol className="list-decimal list-inside space-y-4">
            <li>Create an account or log in to access personalized features</li>
            <li>Navigate to the Query page to begin your search</li>
            <li>Choose your query source: Web Query or Database Query
              <ul className="list-disc list-inside ml-8 mt-2">
                <li><strong>Web Query:</strong> Real-time data from ClinVar, best for latest updates</li>
                <li><strong>Database Query:</strong> Faster response times, updated weekly</li>
              </ul>
            </li>
            <li>Select your search type: Targeted or General
              <ul className="list-disc list-inside ml-8 mt-2">
                <li><strong>Targeted Search:</strong> Use specific identifiers</li>
                <li><strong>General Search:</strong> Search across multiple criteria</li>
              </ul>
            </li>
            <li>Enter your search criteria and submit</li>
            <li>Review and analyze your results</li>
          </ol>
        </div>
      </section>

      {/* Search Types */}
      <section className="mb-12">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor} flex items-center`}>
          <Database className="mr-2" />
          Search Types Explained
        </h2>
        
        <div className={`p-6 rounded-lg ${themeConstants.sectionBackgroundColor} mb-6`}>
          <h3 className="text-xl font-medium mb-4">Targeted Search</h3>
          <div className="space-y-4">
            <p>Best for when you know exactly what you're looking for.</p>
            <div>
              <h4 className="font-medium mb-2">Search Methods:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Gene Symbol:</strong> Enter a specific gene symbol (e.g., BRCA1)</li>
                <li><strong>DNA Change:</strong> Input specific DNA changes (e.g., c.123A>G)</li>
                <li><strong>Protein Change:</strong> Specify protein changes (e.g., p.Lys41Arg)</li>
                <li><strong>Variation ID:</strong> Use ClinVar variation IDs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Features:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Autocomplete suggestions for gene symbols</li>
                <li>Validation of input formats</li>
                <li>Ability to save frequently used queries</li>
              </ul>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg ${themeConstants.sectionBackgroundColor}`}>
          <h3 className="text-xl font-medium mb-4">General Search</h3>
          <div className="space-y-4">
            <p>Ideal for broader research and discovering related variants.</p>
            <div>
              <h4 className="font-medium mb-2">Search Groups:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Create multiple search groups with different criteria</li>
                <li>Combine gene symbols, DNA changes, and protein changes</li>
                <li>Results include variants matching any search group</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Features:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Flexible combination of search criteria</li>
                <li>Add or remove search groups as needed</li>
                <li>Preview results before final submission</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Query Parameters */}
      <section className="mb-12">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor} flex items-center`}>
          <Filter className="mr-2" />
          Query Parameters
        </h2>
        <div className={`p-6 rounded-lg ${themeConstants.sectionBackgroundColor}`}>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium mb-2">Clinical Significance Filters</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Pathogenic</li>
                <li>Likely pathogenic</li>
                <li>Uncertain significance</li>
                <li>Likely benign</li>
                <li>Benign</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-2">Date Range Filters</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Filter by last evaluated date</li>
                <li>Use date range to find recent updates</li>
                <li>Optional - leave empty for all dates</li>
              </ul>
            </div>
            
            <p className="text-sm bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
              Tip: Using filters can significantly improve the relevance of your search results.
            </p>
          </div>
        </div>
      </section>

      {/* Results and Downloads */}
      <section className="mb-12">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor} flex items-center`}>
          <Download className="mr-2" />
          Working with Results
        </h2>
        <div className={`p-6 rounded-lg ${themeConstants.sectionBackgroundColor}`}>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium mb-2">Viewing Results</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Default View:</strong> Organized summary of findings</li>
                <li><strong>Table View:</strong> Detailed tabular format</li>
                <li><strong>JSON View:</strong> Raw data for technical users</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2">Download Options</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>CSV:</strong> Comma-separated values for spreadsheet applications</li>
                <li><strong>TSV:</strong> Tab-separated values for alternative spreadsheet format</li>
                <li><strong>XML:</strong> Structured format for programmatic processing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Account Features */}
      <section className="mb-12">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor} flex items-center`}>
          <Save className="mr-2" />
          Account Features
        </h2>
        <div className={`p-6 rounded-lg ${themeConstants.sectionBackgroundColor}`}>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium mb-2">Preferences</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Save frequently used gene names</li>
                <li>Store common variation IDs</li>
                <li>Quick access to saved preferences during search</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2">Query History</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>View your last 5 queries</li>
                <li>Rerun previous searches with one click</li>
                <li>Modify past queries for new searches</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section className="mb-8">
        <h2 className={`text-2xl font-semibold mb-4 ${themeConstants.headingTextColor} flex items-center`}>
          <History className="mr-2" />
          Tips and Best Practices
        </h2>
        <div className={`p-6 rounded-lg ${themeConstants.sectionBackgroundColor}`}>
          <ul className="list-disc list-inside space-y-3">
            <li>Start with targeted searches when you have specific variants in mind</li>
            <li>Use general search for exploratory research</li>
            <li>Combine multiple search criteria in general search for more precise results</li>
            <li>Use date filters to focus on recent updates</li>
            <li>Save frequently used searches in your preferences</li>
            <li>Review the query before submission to ensure accuracy</li>
            <li>Preview results before downloading to verify content</li>
            <li>Choose the appropriate download format for your analysis tools</li>
          </ul>
        </div>
      </section>

      {/* Support Information */}
      <section className={`p-6 rounded-lg ${themeConstants.sectionBackgroundColor} text-center`}>
        <p>
          Need additional help? Contact our support team at support@helixhunt.com
        </p>
      </section>
    </div>
  );
};

export default HelpPage;