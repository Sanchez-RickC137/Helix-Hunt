import React, { useState } from 'react';
import GeneSelection from '../components/GeneSelection';
import QueryParameters from '../components/QueryParameters';
import ReviewModal from '../components/ReviewModal';
import DownloadPrompt from '../components/DownloadPrompt';

const QueryPage = ({ isDarkMode }) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [geneVariationIDs, setGeneVariationIDs] = useState([]);
  const [clinicalSignificance, setClinicalSignificance] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleReviewClick = () => {
    setShowReviewModal(true);
  };

  const handleSubmit = () => {
    console.log('Query submitted', { selectedGenes, geneVariationIDs, clinicalSignificance, outputFormat, startDate, endDate });
    setShowReviewModal(false);
    setShowDownloadPrompt(true);
  };

  return (
    <div className="container mx-auto mt-8 p-4">
      <h1 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Create Your Query
      </h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3">
          <GeneSelection
            isDarkMode={isDarkMode}
            selectedGenes={selectedGenes}
            setSelectedGenes={setSelectedGenes}
          />
        </div>
        <div className="w-full md:w-2/3">
          <QueryParameters
            isDarkMode={isDarkMode}
            selectedGenes={selectedGenes}
            clinicalSignificance={clinicalSignificance}
            setClinicalSignificance={setClinicalSignificance}
            outputFormat={outputFormat}
            setOutputFormat={setOutputFormat}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            geneVariationIDs={geneVariationIDs}
            setGeneVariationIDs={setGeneVariationIDs}
            handleReviewClick={handleReviewClick}
          />
        </div>
      </div>
      {showReviewModal && (
        <ReviewModal
          isDarkMode={isDarkMode}
          setShowReviewModal={setShowReviewModal}
          selectedGenes={selectedGenes}
          geneVariationIDs={geneVariationIDs}
          clinicalSignificance={clinicalSignificance}
          startDate={startDate}
          endDate={endDate}
          outputFormat={outputFormat}
          handleSubmit={handleSubmit}
        />
      )}
      {showDownloadPrompt && (
        <DownloadPrompt
          isDarkMode={isDarkMode}
          setShowDownloadPrompt={setShowDownloadPrompt}
        />
      )}
    </div>
  );
};

export default QueryPage;