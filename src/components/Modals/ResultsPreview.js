import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, HelpCircle } from 'lucide-react';
import { useThemeConstants } from '../Page/ThemeConstants';

const HelpPopup = ({ content, position }) => {
  const themeConstants = useThemeConstants();
  return ReactDOM.createPortal(
    <div 
      className={`fixed ${themeConstants.sectionBackgroundColor} ${themeConstants.mainTextColor} text-xs rounded py-1 px-2 shadow-lg w-64`}
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
    const processResults = () => {
      if (!results || !Array.isArray(results)) {
        setError('No valid results to display');
        return;
      }
      
      const processed = results.map(result => {
        if (result.error) {
          return {
            query: result.searchTerm || 'Unknown query',
            error: result.error,
            details: result.details
          };
        }
        return {
          query: result.searchTerm,
          variantDetails: result.variantDetails,
          assertionList: result.assertionList
        };
      });
      
      setProcessedResults(processed);
    };

    processResults();
  }, [results]);

  // const renderJsonView = () => {
  //   const successfulResults = processedResults.filter(result => !result.error);

  //   if (successfulResults.length === 0) {
  //     return <p className={themeConstants.mainTextColor}>No data available for any queries.</p>;
  //   }

  //   return (
  //     <div className="space-y-8">
  //       {successfulResults.map((result, index) => (
  //         <div key={index} className={`mb-8 p-4 ${themeConstants.unselectedItemBackgroundColor} rounded-lg`}>
  //           <h3 className={`text-xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>
  //             Result for query: {result.query}
  //           </h3>
  //           <div className="mb-4">
  //             <h4 className={`text-lg font-semibold mb-2 ${themeConstants.headingTextColor}`}>Variant Details</h4>
  //             <pre className={`whitespace-pre-wrap overflow-auto max-h-96 ${themeConstants.mainTextColor} p-4 ${themeConstants.sectionBackgroundColor} rounded`}>
  //               {JSON.stringify(result.variantDetails, null, 2)}
  //             </pre>
  //           </div>
  //           <div>
  //             <h4 className={`text-lg font-semibold mb-2 ${themeConstants.headingTextColor}`}>Assertion List</h4>
  //             <pre className={`whitespace-pre-wrap overflow-auto max-h-96 ${themeConstants.mainTextColor} p-4 ${themeConstants.sectionBackgroundColor} rounded`}>
  //               {JSON.stringify(result.assertionList, null, 2)}
  //             </pre>
  //           </div>
  //         </div>
  //       ))}
  //     </div>
  //   );
  // };

  const renderTableView = () => {
    const successfulResults = processedResults.filter(result => !result.error);
    
    if (successfulResults.length === 0) {
      return <p className={themeConstants.mainTextColor}>No data available for table view</p>;
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
      "Assertion Reference",
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

    const allRows = successfulResults.flatMap((result) => 
      result.assertionList.map(row => ({
        ...row,
        result
      }))
    );

    return (
      <div className="table-container-with-scrollbar">
        <table className={`min-w-full ${themeConstants.sectionBackgroundColor} border ${themeConstants.borderColor}`}>
          <thead>
            <tr className={themeConstants.unselectedItemBackgroundColor}>
              {columns.map((column, index) => (
                <th key={index} className={`px-4 py-2 text-left text-xs font-medium ${themeConstants.labelTextColor} uppercase tracking-wider whitespace-nowrap sticky top-0 ${themeConstants.unselectedItemBackgroundColor} z-10`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, index) => (
              <tr 
                key={index}
                className={`${
                  index % 2 === 0 
                    ? themeConstants.sectionBackgroundColor 
                    : themeConstants.unselectedItemBackgroundColor
                }`}
              >
                {columns.map((column, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={`px-4 py-2 text-sm ${themeConstants.mainTextColor} border-b ${themeConstants.borderColor}`}
                  >
                    <div className="h-20 overflow-y-auto">
                      {renderCellContent(column, row, row.result)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDefaultView = () => {
    const successfulResults = processedResults.filter(result => !result.error);

    if (successfulResults.length === 0) {
      return <p className={themeConstants.mainTextColor}>No data available for any queries.</p>;
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
        {successfulResults.map((result, resultIndex) => (
          <div key={resultIndex} className={`mb-8 p-4 ${themeConstants.unselectedItemBackgroundColor} rounded-lg`}>
            <h3 className={`text-xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>Result for query: {result.query}</h3>
            <div className={`mb-4 p-4 ${themeConstants.sectionBackgroundColor} rounded-lg`}>
              <div className="flex justify-center space-x-8">
                <p className={themeConstants.mainTextColor}><strong>Gene Name:</strong> {result.variantDetails.fullName}</p>
                <p className={themeConstants.mainTextColor}><strong>Variation ID:</strong> {result.variantDetails.variationID}</p>
                <p className={themeConstants.mainTextColor}><strong>Accession ID:</strong> {result.variantDetails.accessionID}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className={`min-w-full ${themeConstants.sectionBackgroundColor} border ${themeConstants.borderColor} table-fixed`}>
                <thead>
                  <tr className={themeConstants.unselectedItemBackgroundColor}>
                    {columns.map((column, index) => (
                      <th key={index} className={`w-1/5 px-4 py-2 text-left text-xs font-medium ${themeConstants.labelTextColor} uppercase tracking-wider`}>
                        <div className="flex items-center">
                          {column.name}
                          <div className="ml-1 relative">
                            <HelpCircle 
                              size={16} 
                              className={`${themeConstants.labelTextColor} cursor-help`}
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
                    <tr key={rowIndex} className={rowIndex % 2 === 0 
                      ? themeConstants.sectionBackgroundColor 
                      : themeConstants.unselectedItemBackgroundColor
                    }>
                      <td className={`px-4 py-2 text-sm ${themeConstants.mainTextColor} border ${themeConstants.borderColor}`}>
                        <div className="h-20 overflow-y-auto">
                          <div>{row.Classification.value || 'N/A'}</div>
                          <div className="text-xs">{row.Classification.date || 'N/A'}</div>
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-sm ${themeConstants.mainTextColor} border ${themeConstants.borderColor}`}>
                        <div className="h-20 overflow-y-auto">
                          {/* <div>{row['Review status'].stars || 'N/A'}</div> */}
                          <div className="text-xs">{row['Review status']['submission_reference']}</div>
                          <div className="text-xs">{row['Review status']['assertion criteria'] || 'N/A'}</div>
                          <div className="text-xs">Method: {row['Review status'].method || 'N/A'}</div>
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-sm ${themeConstants.mainTextColor} border ${themeConstants.borderColor}`}>
                        <div className="h-20 overflow-y-auto">
                          <div>{row.Condition.name || 'N/A'}</div>
                          <div className="text-xs">Affected status: {row.Condition['Affected status'] || 'N/A'}</div>
                          <div className="text-xs">Allele origin: {row.Condition['Allele origin'] || 'N/A'}</div>
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-sm ${themeConstants.mainTextColor} border ${themeConstants.borderColor}`}>
                        <div className="h-20 overflow-y-auto">
                          <div>{row.Submitter.name || 'N/A'}</div>
                          <div className="text-xs">Accession: {row.Submitter.Accession || 'N/A'}</div>
                          <div className="text-xs">First in ClinVar: {row.Submitter['First in ClinVar'] || 'N/A'}</div>
                          <div className="text-xs">Last updated: {row.Submitter['Last updated'] || 'N/A'}</div>
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-sm ${themeConstants.mainTextColor} border ${themeConstants.borderColor}`}>
                        <div className="h-20 overflow-y-auto">
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

  const renderCellContent = (column, row, result) => {
    switch (column) {
      case "Query":
        return typeof result.searchTerm === 'object' 
          ? Object.values(result.searchTerm).filter(Boolean).join(' AND ')
          : result.query;
      case "Transcript ID":
        return result.variantDetails?.transcriptID || 'N/A';
      case "Gene Symbol":
        return result.variantDetails?.geneSymbol || 'N/A';
      case "DNA Change":
        return result.variantDetails?.dnaChange || 'N/A';
      case "Protein Change":
        return result.variantDetails?.proteinChange || 'N/A';
      case "Gene Name":
        return result.variantDetails?.fullName || 'N/A';
      case "Variation ID":
        return result.variantDetails?.variationID || 'N/A';
      case "Accession ID":
        return result.variantDetails?.accessionID || 'N/A';
      case "Classification":
        return `${row.Classification?.value || 'N/A'} (${row.Classification?.date || 'N/A'})`;
      case "Last Evaluated":
        return row.Classification?.date || 'N/A';
      case "Assertion Reference":
        return row['Review status']?.submission_reference || 'N/A';
      case "Assertion Criteria":
        return row['Review status']?.['assertion criteria'] || 'N/A';
      case "Method":
        return row['Review status']?.method || 'N/A';
      case "Condition":
        return row.Condition?.name || 'N/A';
      case "Affected Status":
        return row.Condition?.['Affected status'] || 'N/A';
      case "Allele Origin":
        return row.Condition?.['Allele origin'] || 'N/A';
      case "Submitter":
        return row.Submitter?.name || 'N/A';
      case "Submitter Accession":
        return row.Submitter?.Accession || 'N/A';
      case "First in ClinVar":
        return row.Submitter?.['First in ClinVar'] || 'N/A';
      case "Last Updated":
        return row.Submitter?.['Last updated'] || 'N/A';
      case "Comment":
        return row['More information']?.Comment || 'N/A';
      default:
        return 'N/A';
    }
  };

  const renderContent = () => {
    if (error) {
      return <div className={`text-red-500 ${themeConstants.mainTextColor}`}>{error}</div>;
    }
    switch (activeView) {
      // case 'json':
      //   return renderJsonView();
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
              onClick={() => setActiveView('view')}
              className={`px-4 py-2 rounded ${
                activeView === 'view' 
                  ? themeConstants.buttonBackgroundColor 
                  : themeConstants.secondaryButtonBackgroundColor
              } hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
            >
              Default View
            </button>
            <button
              onClick={() => setActiveView('table')}
              className={`px-4 py-2 rounded ${
                activeView === 'table' 
                  ? themeConstants.buttonBackgroundColor 
                  : themeConstants.secondaryButtonBackgroundColor
              } hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
            >
              Table View
            </button>
            {/* <button
              onClick={() => setActiveView('json')}
              className={`px-4 py-2 rounded ${
                activeView === 'json' 
                  ? themeConstants.buttonBackgroundColor 
                  : themeConstants.secondaryButtonBackgroundColor
              } hover:${themeConstants.buttonHoverColor} text-white transition-colors duration-200`}
            >
              JSON
            </button> */}
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