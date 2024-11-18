const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  saveQuery,
  getQueryHistory,
  processClinVarQuery,
  processGeneralQuery,
  processVariationIdQuery,
  processFullNameQuery,
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
router.get('/processing-status/:queryId', checkProcessingStatus);
router.get('/results-chunk', fetchResultsChunk);
router.get('/gene-counts/:geneSymbol', getGeneCount);

// ClinVar web query routes
router.post('/clinvar', [
  body('fullNames').optional().isArray(),
  body('variationIDs').optional().isArray(),
  body('clinicalSignificance').optional().isArray(),
  body('startDate').optional().isString(),
  body('endDate').optional().isString(),
  validate
], processClinVarQuery);

router.post('/clinvar/general', [
  body('searchGroups').isArray(),
  body('clinicalSignificance').optional().isArray(),
  body('startDate').optional().isString(),
  body('endDate').optional().isString(),
  validate
], processGeneralQuery);

// Database query routes
router.post('/database/variation-id', [
  body('variationId').notEmpty().withMessage('Variation ID is required'),
  body('clinicalSignificance').optional().isArray(),
  body('startDate').optional().isString(),
  body('endDate').optional().isString(),
  validate
], processVariationIdQuery);

router.post('/database/full-name', [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('clinicalSignificance').optional().isArray(),
  body('startDate').optional().isString(),
  body('endDate').optional().isString(),
  validate
], processFullNameQuery);

router.post('/database/general-search', [
  body('searchGroups').isArray(),
  body('clinicalSignificance').optional().isArray(),
  body('startDate').optional().isString(),
  body('endDate').optional().isString(),
  validate
], processGeneralSearch);

// Download route
router.post('/download', downloadResults);

module.exports = router;