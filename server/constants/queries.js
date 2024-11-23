/**
 * Base SQL query for variant retrieval
 * Joins variant_summary and submission_summary tables
 * Note: Column names are lowercase in PostgreSQL
 */
exports.BASE_QUERY = `
SELECT DISTINCT
    vs.variationid,
    vs.name,
    vs.genesymbol,
    vs.clinicalsignificance AS overallclinicalsignificance,
    vs.lastevaluated AS overalllastevaluated,
    vs.reviewstatus AS overallreviewstatus,
    vs.rcvaccession AS accessionid,
    ss.clinicalsignificance,
    ss.datelastevaluated,
    ss.reviewstatus,
    ss.collectionmethod AS method,
    ss.reportedphenotypeinfo AS conditioninfo,
    ss.submitter,
    ss.scv AS submitteraccession,
    ss.description,
    ss.origincounts AS alleleorigin
FROM variant_summary vs
LEFT JOIN submission_summary ss 
    ON vs.variationid = ss.variationid`;

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
