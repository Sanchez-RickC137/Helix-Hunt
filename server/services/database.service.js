const { pool } = require('../config/database');

/**
 * Transforms raw database records into ClinVar-compatible structure
 * 
 * @param {Array} results - Database query results
 * @param {string} searchTerm - Original search term used
 * @returns {Array} Transformed results in ClinVar format
 */
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

/**
 * Constructs SQL queries for search groups
 * 
 * @param {Array} searchGroups - Array of search criteria groups
 * @returns {Array} Array of query objects with conditions and parameters
 */
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