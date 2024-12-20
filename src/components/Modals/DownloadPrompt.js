import React, { useState, useEffect, useMemo } from 'react';
import { FileDown, Eye, X, AlertCircle, Database, Clock } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';

const DownloadPrompt = ({ setShowDownloadPrompt, onPreviewResults, results, themeConstants }) => {
  const [downloadFormat, setDownloadFormat] = useState('csv');
  const [downloadError, setDownloadError] = useState('');
  
  // Calculate result stats
  const resultStats = useMemo(() => {
    if (!Array.isArray(results)) return { variants: 0, assertions: 0 };
    
    return results.reduce((stats, result) => {
      // Skip error results
      if (result.error) return stats;
  
      // Handle database query results (gene symbol queries)
      if (Array.isArray(result)) {
        // Handle nested array results
        return result.reduce((subStats, item) => ({
          variants: subStats.variants + 1,
          assertions: subStats.assertions + (item.assertionList?.length || 0)
        }), stats);
      }
  
      // Handle single result format (variant ID queries, web queries)
      if (result.variantDetails && result.assertionList) {
        return {
          variants: stats.variants + 1,
          assertions: stats.assertions + result.assertionList.length
        };
      }
  
      return stats;
    }, { variants: 0, assertions: 0 });
  }, [results]);

  // Constants for size thresholds
  const PREVIEW_THRESHOLD = 1000;
  const DOWNLOAD_THRESHOLD = 10000;

  const generateDownloadContent = (results, format) => {
    // Define fields for all formats
    const fields = [
      'SearchTerm',
      'TranscriptID',
      'GeneSymbol', 
      'DNAChange',
      'ProteinChange',
      'GeneName',
      'VariationID',
      'AccessionID',
      'Classification',
      'LastEvaluated',
      'AssertionReference',
      'AssertionCriteria',
      'Method',
      'Condition',
      'AffectedStatus',
      'AlleleOrigin',
      'Submitter',
      'SubmitterAccession',
      'FirstInClinVar',
      'LastUpdated',
      'Comment'
    ];
  
    // Normalize the results data
    const normalizedData = results.flatMap(result => {
      if (result.error) return [];
      
      return result.assertionList.map(assertion => ({
        SearchTerm: result.searchTerm || 'N/A',
        TranscriptID: result.variantDetails?.transcriptID || 'N/A',
        GeneSymbol: result.variantDetails?.geneSymbol || 'N/A',
        DNAChange: result.variantDetails?.dnaChange || 'N/A',
        ProteinChange: result.variantDetails?.proteinChange || 'N/A',
        GeneName: result.variantDetails?.fullName || 'N/A',
        VariationID: result.variantDetails?.variationID || 'N/A',
        AccessionID: result.variantDetails?.accessionID || 'N/A',
        Classification: `${assertion.Classification?.value || 'N/A'} (${assertion.Classification?.date || 'N/A'})`,
        LastEvaluated: assertion.Classification?.date || 'N/A',
        AssertionReference: assertion['Review status']?.submission_reference || 'N/A',
        AssertionCriteria: assertion['Review status']?.['assertion criteria'] || 'N/A',
        Method: assertion['Review status']?.method || 'N/A',
        Condition: assertion.Condition?.name || 'N/A',
        AffectedStatus: assertion.Condition?.['Affected status'] || 'N/A',
        AlleleOrigin: assertion.Condition?.['Allele origin'] || 'N/A',
        Submitter: assertion.Submitter?.name || 'N/A',
        SubmitterAccession: assertion.Submitter?.Accession || 'N/A',
        FirstInClinVar: assertion.Submitter?.['First in ClinVar'] || 'N/A',
        LastUpdated: assertion.Submitter?.['Last updated'] || 'N/A',
        Comment: assertion['More information']?.Comment || 'N/A'
      }));
    });
  
    const escapeField = (field) => {
      if (typeof field !== 'string' && typeof field !== 'number') return '';
      const stringField = String(field);
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };
  
    switch (format) {
      case 'csv': {
        // Generate CSV content
        const header = fields.join(',');
        const rows = normalizedData.map(row => 
          fields.map(field => escapeField(row[field])).join(',')
        );
        return [header, ...rows].join('\n');
      }
      
      case 'tsv': {
        // Generate TSV content
        const header = fields.join('\t');
        const rows = normalizedData.map(row => 
          fields.map(field => String(row[field] || '').replace(/\t/g, ' ')).join('\t')
        );
        return [header, ...rows].join('\n');
      }
      
      case 'xml': {
        // Generate XML content
        const xmlRows = normalizedData.map(row => 
          Object.entries(row)
            .map(([key, value]) => `    <${key}>${String(value || '').replace(/[<>&]/g, c => ({
              '<': '&lt;',
              '>': '&gt;',
              '&': '&amp;'
            })[c])}</${key}>`)
            .join('\n')
        );
        return `<?xml version="1.0" encoding="UTF-8"?>
  <ClinVarResults>
    ${xmlRows.map(row => `  <Result>\n${row}\n  </Result>`).join('\n')}
  </ClinVarResults>`;
      }
      
      default:
        throw new Error('Unsupported format');
    }
  };
  
  const handleDownload = async () => {
    try {
      setDownloadError('');
  
      if (resultStats.assertions > DOWNLOAD_THRESHOLD) {
        const confirmed = window.confirm(
          `This download contains ${resultStats.assertions.toLocaleString()} assertions ` +
          `from ${resultStats.variants.toLocaleString()} variants. This may take some time. Continue?`
        );
        
        if (!confirmed) return;
      }
  
      const content = generateDownloadContent(results, downloadFormat);
      
      // Create blob with appropriate type
      const contentTypes = {
        csv: 'text/csv;charset=utf-8',
        tsv: 'text/tab-separated-values;charset=utf-8',
        xml: 'application/xml;charset=utf-8'
      };
  
      const blob = new Blob([content], { 
        type: contentTypes[downloadFormat] 
      });
      
      // Create and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clinvar_results_${new Date().toISOString().split('T')[0]}.${downloadFormat}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
  
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadError('Failed to generate download. Please try again.');
    }
  };
  

  const processResults = () => {
    if (!results || !Array.isArray(results)) {
      return ['No results available'];
    }
  
    return results.reduce((messages, result) => {
      // Handle array results
      if (Array.isArray(result)) {
        result.forEach(item => {
          if (item.error) {
            const message = item.searchTerm 
              ? `${item.searchTerm}: ${item.details || item.error}`
              : item.details || item.error;
            messages.push(message);
          }
        });
        return messages;
      }
  
      // Handle single result errors
      if (result.error) {
        const message = result.searchTerm 
          ? `${result.searchTerm}: ${result.details || result.error}`
          : result.details || result.error;
        messages.push(message);
      }
      return messages;
    }, []);
  };

  const errorMessages = processResults();
  const hasValidResults = results && Array.isArray(results) && results.some(r => !r.error);
  const previewDisabled = !hasValidResults || resultStats.assertions > PREVIEW_THRESHOLD;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className={`${themeConstants.sectionBackgroundColor} p-6 rounded-lg shadow-xl max-w-md w-full`}>
        <h3 className={`text-xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>
          Query Results Ready
        </h3>
        
        {/* Results Statistics */}
        <div className={`mb-6 ${themeConstants.unselectedItemBackgroundColor} p-4 rounded-lg`}>
          <h4 className="font-semibold mb-2">Results Summary:</h4>
          <ul className="space-y-1">
            <li>Total Variants: {resultStats.variants.toLocaleString()}</li>
            <li>Total Assertions: {resultStats.assertions.toLocaleString()}</li>
          </ul>
        </div>

        {/* Size Warnings */}
        {resultStats.assertions > PREVIEW_THRESHOLD && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 rounded">
            Preview disabled for large result sets ({resultStats.assertions.toLocaleString()} assertions).
            Please download results instead.
          </div>
        )}

        {/* Error Messages Display */}
        {errorMessages.length > 0 && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {errorMessages.map((message, index) => (
              <div key={index} className="mb-1 last:mb-0">
                {message}
              </div>
            ))}
          </div>
        )}

        {/* Download Error Display */}
        {downloadError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {downloadError}
          </div>
        )}

        {/* Format Selection */}
        <div className="mb-4">
          <label className={`block mb-2 ${themeConstants.mainTextColor}`}>
            Download Format:
          </label>
          <select
            value={downloadFormat}
            onChange={(e) => setDownloadFormat(e.target.value)}
            className={`w-full p-2 rounded ${themeConstants.inputBackgroundColor} ${themeConstants.inputTextColor} border`}
          >
            <option value="csv">CSV</option>
            <option value="tsv">Tab-delimited</option>
            <option value="xml">XML</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between space-x-4">
          <button
            onClick={handleDownload}
            disabled={!hasValidResults}
            className={`flex-1 ${hasValidResults 
              ? `${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor}` 
              : 'bg-gray-400 cursor-not-allowed'
            } text-white px-4 py-2 rounded transition-colors duration-200 flex items-center justify-center`}
          >
            <FileDown className="mr-2" size={18} />
            Download
          </button>
          <button
            onClick={onPreviewResults}
            disabled={previewDisabled}
            className={`flex-1 ${!previewDisabled
              ? 'bg-indigo-500 hover:bg-indigo-600'
              : 'bg-gray-400 cursor-not-allowed'
            } text-white px-4 py-2 rounded transition-colors duration-200 flex items-center justify-center`}
          >
            <Eye className="mr-2" size={18} />
            Preview
          </button>
          <button 
            onClick={() => setShowDownloadPrompt(false)} 
            className={`${themeConstants.buttonBackgroundColor} hover:${themeConstants.buttonHoverColor} text-white px-4 py-2 rounded transition-colors duration-200 flex items-center justify-center`}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadPrompt;