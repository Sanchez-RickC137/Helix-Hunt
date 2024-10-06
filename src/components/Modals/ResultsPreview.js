import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, HelpCircle } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';
const { parseVariantDetails, refinedClinvarHtmlTableToJson } = require('../../utils/clinvarUtils');

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
  const [processedResults, setProcessedResults] = useState([]);
  const [error, setError] = useState(null);
  const themeConstants = useThemeConstants();

  useEffect(() => {
    setError(null);
    console.log('Raw results:', results);

    const processResults = async () => {
      const processed = [];
      for (const result of results) {
        try {
          const variantDetails = parseVariantDetails(result.data.variantDetailsHtml);
          const assertionList = JSON.parse(refinedClinvarHtmlTableToJson(result.data.assertionListTable));
          processed.push({
            query: result.query,
            variantDetails,
            assertionList
          });
        } catch (err) {
          console.error(`Error processing result for query ${result.query}:`, err);
          setError(prev => [...(prev || []), `Error processing result for query ${result.query}: ${err.message}`]);
        }
      }
      setProcessedResults(processed);
    };

    processResults();
  }, [results]);

  const renderJsonView = () => {
    return (
      <div className="space-y-8">
        {processedResults.map((result, index) => (
          <div key={index} className="mb-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Result for query: {result.query}</h3>
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Variant Details</h4>
              <pre className="whitespace-pre-wrap overflow-auto max-h-96">
                {JSON.stringify(result.variantDetails, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2">Assertion List</h4>
              <pre className="whitespace-pre-wrap overflow-auto max-h-96">
                {JSON.stringify(result.assertionList, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTableView = () => {
    if (processedResults.length === 0) {
      return <p>No data available for table view</p>;
    }

    const columns = [
      "Query",
      "Transcript ID",
      "Gene Symbol",
      "DNA Change",
      "Protein Change",
      "Gene Name",
      "Variation ID",
      "Accession ID",
      "Classification",
      "Last Evaluated",
      "Review Status",
      "Assertion Criteria",
      "Method",
      "Condition",
      "Affected Status",
      "Allele Origin",
      "Submitter",
      "Submitter Accession",
      "First in ClinVar",
      "Last Updated",
      "Comment"
    ];

    return (
      <div className="table-container-with-scrollbar">
        <style jsx>{`
          .table-container-with-scrollbar {
            overflow-x: auto;
            overflow-y: auto;
            max-height: 70vh;
          }
          .table-container-with-scrollbar::-webkit-scrollbar {
            -webkit-appearance: none;
            width: 7px;
            height: 7px;
          }
          .table-container-with-scrollbar::-webkit-scrollbar-thumb {
            border-radius: 4px;
            background-color: rgba(0, 0, 0, .5);
            box-shadow: 0 0 1px rgba(255, 255, 255, .5);
          }
          .table-container-with-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, .5) transparent;
          }
        `}</style>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((column, index) => (
                <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky top-0 bg-gray-100 z-10">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedResults.flatMap((result, resultIndex) => 
              result.assertionList.map((row, rowIndex) => (
                <tr key={`${resultIndex}-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-4 py-2 text-sm text-gray-900 border-b border-gray-200">
                      <div className="h-20 overflow-y-auto">
                        {renderCellContent(column, row, result)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCellContent = (column, row, result) => {
    switch (column) {
      case "Query":
        return result.query;
      case "Transcript ID":
        return result.variantDetails.transcriptID;
      case "Gene Symbol":
        return result.variantDetails.geneSymbol;
      case "DNA Change":
        return result.variantDetails.dnaChange;
      case "Protein Change":
        return result.variantDetails.proteinChange;
      case "Gene Name":
        return result.variantDetails.fullName;
      case "Variation ID":
        return result.variantDetails.variationId;
      case "Accession ID":
        return result.variantDetails.accessionId;
      case "Classification":
        return `${row.Classification.value || 'N/A'}\n${row.Classification.date || 'N/A'}`;
      case "Last Evaluated":
        return row.Classification.date;
      case "Review Status":
        return `${row['Review status'].stars || 'N/A'}\n${row['Review status']['assertion criteria'] || 'N/A'}`;
      case "Assertion Criteria":
        return row['Review status']['assertion criteria'];
      case "Method":
        return row['Review status'].method;
      case "Condition":
        return row.Condition.name;
      case "Affected Status":
        return row.Condition['Affected status'];
      case "Allele Origin":
        return row.Condition['Allele origin'];
      case "Submitter":
        return row.Submitter.name;
      case "Submitter Accession":
        return row.Submitter.Accession;
      case "First in ClinVar":
        return row.Submitter['First in ClinVar'];
      case "Last Updated":
        return row.Submitter['Last updated'];
      case "Comment":
        return row['More information'].Comment;
      default:
        return 'N/A';
    }
  };

  const renderDefaultView = () => {
    if (processedResults.length === 0) {
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
      <div className="space-y-8">
        {processedResults.map((result, resultIndex) => (
          <div key={resultIndex} className="mb-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Result for query: {result.query}</h3>
            <div className="mb-4 p-4 bg-white rounded-lg">
              <div className="flex justify-center space-x-8">
                <p><strong>Gene Name:</strong> {result.variantDetails.fullName}</p>
                <p><strong>Variation ID:</strong> {result.variantDetails.variationId}</p>
                <p><strong>Accession ID:</strong> {result.variantDetails.accessionId}</p>
              </div>
            </div>
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
                  {result.assertionList.map((row, rowIndex) => (
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
                          <div className="text-xs">Last updated: {row.Submitter['Last updated'] || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 h-20 overflow-hidden">
                        <div className="h-full overflow-y-auto">
                          {row['More information'].Comment && (
                            <div className="mb-1">
                              <strong>Comment:</strong> {row['More information'].Comment}
                            </div>
                          )}
                          {Object.keys(row['More information'].Publications).length > 0 && (
                            <div className="mb-1">
                              <strong>Publications:</strong> {Object.keys(row['More information'].Publications).join(', ')}
                            </div>
                          )}
                          {Object.keys(row['More information']['Other databases']).length > 0 && (
                            <div className="mb-1">
                              <strong>Other databases:</strong> {Object.keys(row['More information']['Other databases']).join(', ')}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (error) {
      return <div className="text-red-500">{error}</div>;
    }
    switch (activeView) {
      case 'json':
        return renderJsonView();
      case 'table':
        return renderTableView();
      case 'view':
      default:
        return renderDefaultView();
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
            Default View
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