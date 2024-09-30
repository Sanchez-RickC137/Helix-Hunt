import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, HelpCircle } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';

const HelpPopup = ({ content, position }) => {
  return ReactDOM.createPortal(
    <div 
      className="fixed bg-black text-white text-xs rounded py-1 px-2 shadow-lg w-64"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 9999
      }}
    >
      {content}
    </div>,
    document.body
  );
};

const ResultsPreview = ({ results, onClose }) => {
  const [activeView, setActiveView] = useState('view');
  const [helpPopup, setHelpPopup] = useState(null);
  const themeConstants = useThemeConstants();

  const renderJsonView = () => {
    return (
      <div className="space-y-8">
        <div className="mb-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Converted JSON Data</h3>
          {results.detail ? (
            <pre className="whitespace-pre-wrap overflow-auto max-h-96">
              {JSON.stringify(results.detail, null, 2)}
            </pre>
          ) : (
            <p>No converted JSON data available</p>
          )}
        </div>
        <div className="mb-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Raw HTML Data</h3>
          <pre className="whitespace-pre-wrap overflow-auto max-h-96">
            {results.html}
          </pre>
        </div>
      </div>
    );
  };

  const renderTableView = () => {
    if (!results.detail || !Array.isArray(results.detail) || results.detail.length === 0) {
      return <p>No data available for table view</p>;
    }

    const columns = [
      "Classification",
      "Submission Date",
      "Assertion Criteria",
      "Review Method",
      "Condition",
      "Affected Status",
      "Allele Origin",
      "Submitter Name",
      "Accession",
      "First in ClinVar",
      "Last Updated",
      "Publications",
      "Other Databases",
      "Comment"
    ];

    const formatAssertionCriteria = (criteria) => {
      if (typeof criteria === 'string' && criteria.startsWith('criteria provided, ')) {
        return criteria.slice('criteria provided, '.length);
      }
      return criteria;
    };

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((column, index) => (
                <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.detail.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-4 py-2 text-sm text-gray-900">{row.Classification.value}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{row.Classification.date}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{formatAssertionCriteria(row['Review status']['assertion criteria'])}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{row['Review status'].method}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{row.Condition.name}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{row.Condition['Affected status']}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{row.Condition['Allele origin']}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{row.Submitter.name}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{row.Submitter.Accession}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{row.Submitter['First in ClinVar']}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{row.Submitter['Last updated']}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{Object.keys(row['More information'].Publications).join(', ')}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{Object.keys(row['More information']['Other databases']).join(', ')}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{row['More information'].Comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDefaultView = () => {
    if (!results || !results.detail || !Array.isArray(results.detail) || results.detail.length === 0) {
      return <p>No data available</p>;
    }

    const columns = [
      { name: "Classification", help: "The submitted germline classification for each SCV record and date last evaluated" },
      { name: "Review Status", help: "Link to submitter's assertion criteria if provided and the collection method" },
      { name: "Condition", help: "The condition for the classification, provided by the submitter for the submitted (SCV) record. Also includes the affected status and the allele origin of individuals observed with this variant" },
      { name: "Submitter", help: "Submitting organization for this submitted (SCV) record. Also includes the SCV accession and version number, the date this SCV first appeared in ClinVar and the date that this SCV was last updated" },
      { name: "More Information", help: "Additional details including publications, other databases, and comments" }
    ];

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 table-fixed">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((column, index) => (
                <th key={index} className="w-1/5 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    {column.name}
                    <div className="ml-1 relative">
                      <HelpCircle 
                        size={16} 
                        className="text-gray-400 cursor-help"
                        onMouseEnter={(e) => {
                          const rect = e.target.getBoundingClientRect();
                          setHelpPopup({ content: column.help, position: { x: rect.left, y: rect.bottom + 5 } });
                        }}
                        onMouseLeave={() => setHelpPopup(null)}
                      />
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.detail.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-4 py-2 text-sm text-gray-900 h-20 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <div>{row.Classification.value || 'N/A'}</div>
                    <div className="text-xs">{row.Classification.date || 'N/A'}</div>
                  </div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 h-20 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <div>{row['Review status'].stars || 'N/A'}</div>
                    <div className="text-xs">{row['Review status']['assertion criteria'] || 'N/A'}</div>
                    <div className="text-xs">Method: {row['Review status'].method || 'N/A'}</div>
                  </div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 h-20 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <div>{row.Condition.name || 'N/A'}</div>
                    <div className="text-xs">Affected status: {row.Condition['Affected status'] || 'N/A'}</div>
                    <div className="text-xs">Allele origin: {row.Condition['Allele origin'] || 'N/A'}</div>
                  </div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 h-20 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <div>{row.Submitter.name || 'N/A'}</div>
                    <div className="text-xs">Accession: {row.Submitter.Accession || 'N/A'}</div>
                    <div className="text-xs">First in ClinVar: {row.Submitter['First in ClinVar'] || 'N/A'}</div>
                    <div className="text-x">Last updated: {row.Submitter['Last updated'] || 'N/A'}</div>
                  </div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 h-20 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    {Object.entries(row['More information']).map(([key, value], index) => (
                      <div key={index} className="mb-1">
                        <strong>{key}:</strong> {renderValue(value)}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'json':
        return renderJsonView();
      case 'table':
        return renderTableView();
      case 'view':
        return renderDefaultView();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeConstants.sectionBackgroundColor} p-6 rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-2xl font-bold ${themeConstants.headingTextColor}`}>Query Results Preview</h2>
          <button
            onClick={onClose}
            className={`${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white p-2 rounded-full`}
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex justify-center mb-4 space-x-4">
          <button
            onClick={() => setActiveView('json')}
            className={`px-4 py-2 rounded ${activeView === 'json' ? themeConstants.buttonBackgroundColor : themeConstants.secondaryButtonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
          >
            JSON
          </button>
          <button
            onClick={() => setActiveView('table')}
            className={`px-4 py-2 rounded ${activeView === 'table' ? themeConstants.buttonBackgroundColor : themeConstants.secondaryButtonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
          >
            Table View
          </button>
          <button
            onClick={() => setActiveView('view')}
            className={`px-4 py-2 rounded ${activeView === 'view' ? themeConstants.buttonBackgroundColor : themeConstants.secondaryButtonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
          >
            View Results
          </button>
        </div>
        <div className={`flex-grow overflow-auto ${themeConstants.mainTextColor}`}>
          {renderContent()}
        </div>
      </div>
      {helpPopup && <HelpPopup content={helpPopup.content} position={helpPopup.position} />}
    </div>
  );
};

export default ResultsPreview;