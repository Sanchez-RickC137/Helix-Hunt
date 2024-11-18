const { pool } = require('../config/database');
const axios = require('axios');  // Add this import
const cheerio = require('cheerio');
const { BASE_QUERY } = require('../constants/queries');

const executeRequest = async (config) => {
  return await axios({
    ...config,
    timeout: 30000,
    headers: {
      'Accept-Encoding': 'gzip',
      'Connection': 'keep-alive',
      'User-Agent': 'Mozilla/5.0 (compatible; HelixHunt/1.0; +http://example.com)'
    }
  });
};

// Main database query result processing.
const processDbResults = (results, searchTerm) => {
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
    if (fullName.includes(':') && fullName.includes('(') && fullName.includes(')') && fullName.startsWith("NM_")) {
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
        geneSymbol: geneSymbol || '',
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
const constructSearchQuery = (conditions, clinicalSignificance, startDate, endDate) => {
  let query = `
    WITH filtered_variants AS (
      SELECT DISTINCT vs.* 
      FROM variant_summary vs
      WHERE ${conditions.length > 0 ? conditions.join(' OR ') : '1=1'}
    )
    ${BASE_QUERY.replace('FROM variant_summary vs', 'FROM filtered_variants vs')}
  `;

  if (clinicalSignificance?.length) {
    query += ` AND ss.ClinicalSignificance IN (${clinicalSignificance.map(() => '?').join(',')})`;
  }

  if (startDate) {
    query += ` AND ss.DateLastEvaluated >= ?`;
  }

  if (endDate) {
    query += ` AND ss.DateLastEvaluated <= ?`;
  }

  query += ' ORDER BY ss.DateLastEvaluated DESC';

  return query;
};

/**
 * Constructs SQL query for general search
 * @param {Array} searchGroups - Array of search criteria groups
 * @returns {Object} Object containing SQL query and parameters
 */
const constructGeneralSearchQuery = (searchGroups, clinicalSignificance, startDate, endDate) => {
  const conditions = [];
  const params = [];

  searchGroups.forEach(group => {
    const groupConditions = [];
    
    if (group.geneSymbol || group.dnaChange || group.proteinChange) {
      groupConditions.push('EXISTS (SELECT 1 FROM component_parts cp WHERE cp.variation_id = vs.VariationID');
      
      if (group.geneSymbol) {
        groupConditions.push('AND cp.gene_symbol = ?');
        params.push(group.geneSymbol);
      }
      if (group.dnaChange) {
        groupConditions.push('AND cp.dna_change = ?');
        params.push(group.dnaChange);
      }
      if (group.proteinChange) {
        groupConditions.push('AND cp.protein_change = ?');
        params.push(group.proteinChange);
      }
      
      groupConditions.push(')');
    }

    if (groupConditions.length > 0) {
      conditions.push(`(${groupConditions.join(' ')})`);
    }
  });

  let query = `
    WITH filtered_variants AS (
      SELECT DISTINCT vs.* 
      FROM variant_summary vs
      WHERE ${conditions.length > 0 ? conditions.join(' OR ') : '1=1'}
    )
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
    FROM filtered_variants vs
    LEFT JOIN submission_summary ss ON vs.VariationID = ss.VariationID
  `;

  if (clinicalSignificance?.length) {
    query += ` WHERE FIND_IN_SET(ss.ClinicalSignificance, ?)`;
    params.push(clinicalSignificance.join(','));
  }

  if (startDate || endDate) {
    query += clinicalSignificance?.length ? ' AND ' : ' WHERE ';
    if (startDate) {
      query += 'ss.DateLastEvaluated >= ? ';
      params.push(startDate);
    }
    if (endDate) {
      query += startDate ? 'AND ' : '';
      query += 'ss.DateLastEvaluated <= ?';
      params.push(endDate);
    }
  }

  query += ' ORDER BY ss.DateLastEvaluated DESC';

  return { query, params };
};



const processSingleNonGeneGroup = async (group, clinicalSignificance, startDate, endDate) => {
  const conditions = [];
  const params = [];
  
  if (group.geneSymbol || group.dnaChange || group.proteinChange) {
    conditions.push('EXISTS (SELECT 1 FROM component_parts cp WHERE cp.variation_id = vs.VariationID');
    
    if (group.geneSymbol) {
      conditions.push('AND cp.gene_symbol = ?');
      params.push(group.geneSymbol);
    }
    if (group.dnaChange) {
      conditions.push('AND cp.dna_change = ?');
      params.push(group.dnaChange);
    }
    if (group.proteinChange) {
      conditions.push('AND cp.protein_change = ?');
      params.push(group.proteinChange);
    }
    
    conditions.push(')');
  }

  let query = `
    WITH filtered_variants AS (
      SELECT DISTINCT vs.* 
      FROM variant_summary vs
      WHERE ${conditions.join(' ')}
    )
    ${BASE_QUERY.replace('FROM variant_summary vs', 'FROM filtered_variants vs')}
  `;

  if (clinicalSignificance?.length) {
    query += ` AND ss.ClinicalSignificance IN (${clinicalSignificance.map(() => '?').join(',')})`;
    params.push(...clinicalSignificance);
  }

  if (startDate) {
    query += ` AND ss.DateLastEvaluated >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND ss.DateLastEvaluated <= ?`;
    params.push(endDate);
  }

  query += ' ORDER BY ss.DateLastEvaluated DESC';

  try {
    console.log('Executing single group query:', {
      group,
      conditions,
      params: params.length
    });

    const [results] = await pool.execute(query, params, { timeout: 30000 });
    
    return processDbResults(results, 
      Object.entries(group)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
    );
  } catch (error) {
    console.error('Database query error for group:', group, error);
    return [{
      error: "Query failed",
      details: error.message,
      searchTerms: Object.entries(group)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
    }];
  }
};

const processGeneSymbolOnlyQuery = async (geneSymbol, clinicalSignificance, startDate, endDate) => {
  try {
    console.log('Starting gene symbol query with filters:', {
      geneSymbol,
      clinicalSignificance,
      startDate,
      endDate
    });

    const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${geneSymbol}[gene]&retmax=20000`;
    const response = await executeRequest({ url: esearchUrl, method: 'GET' });
    const $ = cheerio.load(response.data, { xmlMode: true });

    const totalCount = parseInt($('Count').first().text());
    if (!totalCount) {
      return [{
        error: "No results found",
        details: "No variations found for this gene symbol",
        searchTerm: geneSymbol
      }];
    }

    const variationIds = $('IdList Id').map((_, el) => $(el).text()).get();
    console.log(`Retrieved ${variationIds.length} variation IDs for ${geneSymbol}`);

    // Process variation IDs in chunks
    const CHUNK_SIZE = 1000;
    const allResults = [];

    for (let i = 0; i < variationIds.length; i += CHUNK_SIZE) {
      const chunk = variationIds.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(",");
      
      // Start building the query and params array
      let params = [...chunk];
      
      let query = `
        ${BASE_QUERY}
        WHERE vs.VariationID IN (${placeholders})
      `;

      if (clinicalSignificance?.length) {
        const sigPlaceholders = clinicalSignificance.map(() => "?").join(",");
        query += ` AND ss.ClinicalSignificance IN (${sigPlaceholders})`;
        params.push(...clinicalSignificance);
      }

      if (startDate) {
        query += ` AND ss.DateLastEvaluated >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND ss.DateLastEvaluated <= ?`;
        params.push(endDate);
      }

      query += ` ORDER BY ss.DateLastEvaluated DESC`;

      // Debug logging
      console.log('Executing query:', query);

      const [results] = await pool.execute(query, params);
      console.log(`Raw results from database for chunk:`, results.length);
      
      if (results.length > 0) {
        const processedResults = processDbResults(results, geneSymbol);
        console.log(`Processed results for chunk:`, processedResults.length);
        if (processedResults.length > 0) {
          console.log('Sample processed result:', JSON.stringify(processedResults[0], null, 2));
        }
        allResults.push(...processedResults);
      }

      console.log(`Processed ${i + chunk.length}/${variationIds.length} variants from database (Found ${allResults.length} results)`);
    }

    if (allResults.length === 0) {
      console.log('No results found after processing all chunks');
      return [{
        error: "No results found",
        details: "No matching variants found in database",
        searchTerm: geneSymbol
      }];
    }

    console.log(`Total results found: ${allResults.length}`);
    return allResults;

  } catch (error) {
    console.error('Error in gene symbol query:', error);
    return [{
      error: "Query processing failed",
      details: error.message,
      searchTerm: geneSymbol
    }];
  }
};


/**
 * Public interface for processing gene-symbol-only queries
 * Used by the query controller
 */
const processGeneSymbolDatabaseQuery = (geneSymbol, clinicalSignificance, startDate, endDate) => {
  return processGeneSymbolOnlyQuery(geneSymbol, clinicalSignificance, startDate, endDate);
};

module.exports = {
  processDbResults,
  constructGeneralSearchQuery,
  processGeneSymbolDatabaseQuery,
  processSingleNonGeneGroup
}