/**
 * Download prompt modal component
 * Handles result download options and preview functionality
 * Supports multiple download formats (CSV, TSV, XML)
 * 
 * @param {Object} props
 * @param {Function} props.setShowDownloadPrompt - Controls modal visibility
 * @param {Function} props.onPreviewResults - Handler for results preview
 * @param {Array} props.results - Query results data
 * @param {Object} props.themeConstants - Theme styling constants
 */

import React, { useState } from 'react';
import { FileDown, Eye, X } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';

const DownloadPrompt = ({ setShowDownloadPrompt, onPreviewResults, results, themeConstants }) => {
  const [downloadFormat, setDownloadFormat] = useState('csv');
  const [downloadError, setDownloadError] = useState('');

  /**
   * Handles file download in selected format
   * Creates and triggers download of formatted data
   */
  const handleDownload = async () => {
    try {
      setDownloadError('');
      const response = await axiosInstance.post('/api/download', {
        results: results,
        format: downloadFormat
      }, {
        responseType: 'blob'
      });
      
      // Create and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clinvar_results_${new Date().toISOString().split('T')[0]}.${downloadFormat}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadError('Failed to download results. Please try again.');
    }
  };

  /**
   * Processes results to extract error messages
   * @returns {Array<string>} Array of error messages
   */
  const processResults = () => {
    if (!results || !Array.isArray(results)) {
      return ['No results available'];
    }

    return results.reduce((messages, result) => {
      if (result.error) {
        const message = `${result.searchTerm || 'Query'}: ${result.error}${result.details ? ` - ${result.details}` : ''}`;
        messages.push(message);
      }
      return messages;
    }, []);
  };

  const errorMessages = processResults();
  const hasValidResults = results && Array.isArray(results) && results.some(r => !r.error);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className={`${themeConstants.sectionBackgroundColor} p-6 rounded-lg shadow-xl max-w-md w-full transition-colors duration-200`}>
        <h3 className={`text-xl font-semibold mb-4 ${themeConstants.headingTextColor}`}>
          Query Results Ready
        </h3>
        
        <p className={`mb-6 ${themeConstants.mainTextColor}`}>
          Your HelixHunt query results are ready. You can download them or preview the results.
        </p>

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
            disabled={!hasValidResults}
            className={`flex-1 ${hasValidResults
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