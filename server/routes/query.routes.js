const express = require('express');
const auth = require('../middleware/auth');
const {
  saveQuery,
  getQueryHistory,
  processClinVarQuery,
  processGeneralQuery,
  processDatabaseQuery,
  processGeneralSearch,
  downloadResults,
  checkProcessingStatus,
  fetchResultsChunk,
  getGeneCount
} = require('../controllers/query.controller');

const router = express.Router();

// Query history routes
router.post('/save-query', auth, saveQuery);
router.get('/query-history', auth, getQueryHistory);

// Processing status routes
router.get('/processing-status/:queryId', checkProcessingStatus);
router.get('/results-chunk/:queryId', fetchResultsChunk);

// Gene count route
router.get('/gene-counts/:geneSymbol', getGeneCount);

// ClinVar web query routes
router.post('/clinvar', processClinVarQuery);
router.post('/clinvar/general', processGeneralQuery);

// Database query routes
router.post('/database', processDatabaseQuery);
router.post('/database/general-search', processGeneralSearch);

// Download route
router.post('/download', downloadResults);

module.exports = router;