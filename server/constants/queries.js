/**
 * Base SQL query for variant retrieval
 * Joins variant_summary and submission_summary tables
 * Includes all commonly needed fields
 */
exports.BASE_QUERY = `
SELECT DISTINCT
    vs.VariationID,
    vs.Name,
    vs.GeneSymbol,
    vs.Type,
    vs.ClinicalSignificance AS OverallClinicalSignificance,
    vs.LastEvaluated AS OverallLastEvaluated,
    vs.ReviewStatus AS OverallReviewStatus,
    vs.RCVaccession AS AccessionID,
    ss.ClinicalSignificance,
    ss.DateLastEvaluated,
    ss.ReviewStatus,
    ss.CollectionMethod AS Method,
    ss.ReportedPhenotypeInfo AS ConditionInfo,
    ss.Submitter,
    ss.SCV AS SubmitterAccession,
    ss.Description,
    ss.OriginCounts AS AlleleOrigin
FROM variant_summary vs
LEFT JOIN submission_summary ss 
    ON vs.VariationID = ss.VariationID`;

/**
 * Clinical significance values for validation
 */
exports.CLINICAL_SIGNIFICANCE_VALUES = [
  'Pathogenic',
  'Likely pathogenic',
  'Uncertain significance',
  'Likely benign',
  'Benign'
];

/**
 * Download format options and corresponding content types
 */
exports.DOWNLOAD_FORMATS = {
  csv: {
    contentType: 'text/csv',
    extension: 'csv'
  },
  tsv: {
    contentType: 'text/tab-separated-values',
    extension: 'tsv'
  },
  xml: {
    contentType: 'application/xml',
    extension: 'xml'
  }
};