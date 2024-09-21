import React from 'react';

const ReviewModal = ({ 
  isDarkMode, 
  setShowReviewModal, 
  selectedGenes, 
  geneVariationIDs,
  clinicalSignificance, 
  startDate, 
  endDate, 
  outputFormat,
  handleSubmit
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-xl max-w-md w-full transition-colors duration-200`}>
      <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Review Your Query</h3>
      <div className="space-y-2">
        <p><strong>Selected Genes:</strong> {selectedGenes.join(', ') || 'None'}</p>
        <p><strong>Gene Variation IDs:</strong> {geneVariationIDs.join(', ') || 'None'}</p>
        <p><strong>Clinical Significance:</strong> {clinicalSignificance || 'Not selected'}</p>
        <p><strong>Date Range:</strong> {startDate && endDate ? `${startDate} to ${endDate}` : 'Not set'}</p>
        <p><strong>Output Format:</strong> {outputFormat || 'Not selected'}</p>
      </div>
      <div className="mt-6 flex justify-end space-x-4">
        <button 
          onClick={() => setShowReviewModal(false)} 
          className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-300 hover:bg-gray-400'} text-white transition-colors duration-200`}
        >
          Cancel
        </button>
        <button 
          onClick={handleSubmit} 
          className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white transition-colors duration-200`}
        >
          Submit Query
        </button>
      </div>
    </div>
  </div>
);

export default ReviewModal;