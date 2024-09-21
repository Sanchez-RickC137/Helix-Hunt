import React from 'react';

const HelpPage = ({ isDarkMode }) => {
  return (
    <div className={`container mx-auto mt-8 p-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <h1 className="text-3xl font-bold mb-4">Help & Tutorial</h1>
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Getting Started</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Create an account or log in</li>
          <li>Navigate to the Query page</li>
          <li>Select genes of interest</li>
          <li>Set query parameters (e.g., clinical significance, date range)</li>
          <li>Review and submit your query</li>
          <li>Analyze the results</li>
        </ol>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">FAQs</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium mb-1">How do I reset my password?</h3>
            <p>Currently, this feature is not available. Please contact support for assistance.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium mb-1">Can I export my query results?</h3>
            <p>Yes, you can export your results in various formats including CSV and JSON.</p>
          </div>
        </div>
      </section>
      <p>For more detailed instructions or if you need further assistance, please contact our support team.</p>
    </div>
  );
};

export default HelpPage;