const { pool } = require('../config/database');

// Main database query result processing.
exports.processDbResults = (results, searchTerm) => {
  if (!results || results.length === 0) {
    return [{
      error: "No results found",
      details: "No matching data in database",
      searchTerm
    }];
  }

  // Group results by VariationID
  const groupedResults = results.reduce((acc, result) => {
    const variationId = result.VariationID;
    if (!acc[variationId]) {
      acc[variationId] = [];
    }
    acc[variationId].push(result);
    return acc;
  }, {});

  // Transform each group into standardized format
  return Object.entries(groupedResults).map(([variationId, submissions]) => {
    const mainResult = submissions[0];
    let fullName = mainResult.Name || '';
    let geneSymbol = '';
    let transcriptId = '';
    let dnaChange = '';
    let proteinChange = '';

    // Parse name components if format matches expected pattern
    if (fullName.includes(':') && fullName.includes('(') && fullName.includes(')')) {
      try {
        const geneParts = fullName.split('(');
        if (geneParts.length > 1) {
          geneSymbol = geneParts[1].split(')')[0].trim();
          
          if (geneSymbol.length < 10) {
            transcriptId = geneParts[0].trim();
            const changeParts = fullName.split(':');
            if (changeParts.length > 1) {
              dnaChange = changeParts[1].split(' ')[0].trim();
              const proteinParts = fullName.match(/\((.*?)\)/g);
              if (proteinParts && proteinParts.length > 1) {
                proteinChange = proteinParts[1].replace(/[()]/g, '').trim();
              }
            }
          }
        }
      } catch (error) {
        console.warn('Error parsing name components:', error);
      }
    }

    return {
      searchTerm,
      variantDetails: {
        fullName: mainResult.Name || '',
        geneSymbol: mainResult.GeneSymbol || '',
        transcriptID: transcriptId,
        dnaChange,
        proteinChange,
        variationID: mainResult.VariationID?.toString() || '',
        accessionID: mainResult.RCVaccession || ''
      },
      assertionList: submissions.map(submission => ({
        Classification: {
          value: submission.ClinicalSignificance || '',
          date: submission.DateLastEvaluated || ''
        },
        'Review status': {
          stars: '',
          'assertion criteria': submission.ReviewStatus || '',
          method: submission.Method || ''
        },
        Condition: {
          name: submission.ConditionInfo?.split(':')[1]?.trim() || '',
          'Affected status': '',
          'Allele origin': submission.AlleleOrigin || ''
        },
        Submitter: {
          name: submission.Submitter || '',
          Accession: submission.SubmitterAccession || '',
          'First in ClinVar': '',
          'Last updated': submission.DateLastEvaluated || ''
        },
        'More information': {
          Publications: {},
          'Other databases': {},
          Comment: submission.Description || ''
        }
      }))
    };
  });
};

// Database general search data processing
exports.constructSearchQuery = (searchGroups) => {
  return searchGroups.map(group => {
    const conditions = [];
    const params = [];
    
    if (group.geneSymbol) {
      conditions.push('vs.GeneSymbol LIKE ?');
      params.push(`%${group.geneSymbol}%`);
    }
    if (group.dnaChange) {
      conditions.push('vs.Name LIKE ?');
      params.push(`%${group.dnaChange}%`);
    }
    if (group.proteinChange) {
      conditions.push('vs.Name LIKE ?');
      params.push(`%${group.proteinChange}%`);
    }

    return {
      conditions: conditions.length > 0 ? conditions.join(' AND ') : null,
      params
    };
  }).filter(query => query.conditions !== null);
};

/**
 * Constructs SQL query for general search
 * @param {Array} searchGroups - Array of search criteria groups
 * @returns {Object} Object containing SQL query and parameters
 */
exports.constructGeneralSearchQuery = (searchGroups) => {
  const conditions = [];
  const params = [];

  searchGroups.forEach(group => {
    const groupConditions = [];
    
    if (group.geneSymbol) {
      groupConditions.push('vs.GeneSymbol = ?');
      params.push(group.geneSymbol);
    }
    if (group.dnaChange) {
      groupConditions.push('vs.Name LIKE ?');
      params.push(`%${group.dnaChange}%`);
    }
    if (group.proteinChange) {
      groupConditions.push('vs.Name LIKE ?');
      params.push(`%${group.proteinChange}%`);
    }

    if (groupConditions.length > 0) {
      conditions.push(`(${groupConditions.join(' AND ')})`);
    }
  });

  const query = `
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
    LEFT JOIN submission_summary ss ON vs.VariationID = ss.VariationID
    WHERE ${conditions.length > 0 ? conditions.join(' OR ') : '1=1'}
    ORDER BY vs.LastEvaluated DESC
  `;

  return { query, params };
};