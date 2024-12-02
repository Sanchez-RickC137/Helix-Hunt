const { pool } = require('../config/database');
const axios = require('axios');
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
    const variationId = result.VariationID; // Matches the actual casing from DB
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
          // If GeneSymbol isn't directly available, extract from Name
          if (!geneSymbol) {
            geneSymbol = geneParts[1].split(')')[0].trim();
          }
          
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
        geneSymbol: geneSymbol,
        transcriptID: transcriptId,
        dnaChange,
        proteinChange,
        variationID: mainResult.VariationID?.toString() || '',
        accessionID: ''
      },
      assertionList: submissions.map(submission => ({
        Classification: {
          value: submission.clinicalsignificance || '',
          date: submission.datelastevaluated || ''
        },
        'Review status': {
          stars: '',
          'assertion criteria': submission.reviewstatus || '',
          method: submission.Method || '',
          'submission_reference': ''
        },
        Condition: {
          name: submission.ConditionInfo?.split(':')[1]?.trim() || '',
          'Affected status': '',
          'Allele origin': submission.AlleleOrigin || ''
        },
        Submitter: {
          name: submission.submitter || '',
          Accession: submission.SubmitterAccession || '',
          'First in ClinVar': '',
          'Last updated': submission.datelastevaluated || ''
        },
        'More information': {
          Publications: {},
          'Other databases': {},
          Comment: submission.description || ''
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

// Constructs SQL query for general search 
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

// Single search group for non gene only
const processSingleNonGeneGroup = async (group, clinicalSignificance, startDate, endDate) => {
  const conditions = [];
  const params = [];
  let paramCount = 1;
  
  if (group.geneSymbol || group.dnaChange || group.proteinChange) {
    conditions.push('EXISTS (SELECT 1 FROM component_parts cp WHERE cp.variation_id = vs."VariationID"');
    
    if (group.geneSymbol) {
      conditions.push(`AND cp.gene_symbol = $${paramCount++}`);
      params.push(group.geneSymbol);
    }
    if (group.dnaChange) {
      conditions.push(`AND cp.dna_change = $${paramCount++}`);
      params.push(group.dnaChange);
    }
    if (group.proteinChange) {
      conditions.push(`AND cp.protein_change = $${paramCount++}`);
      params.push(group.proteinChange);
    }
    
    conditions.push(')');
  }

  // Add WHERE conditions
  const whereConditions = [];
  
  if (clinicalSignificance?.length) {
    whereConditions.push(`ss.ClinicalSignificance = ANY($${paramCount++})`);
    params.push(clinicalSignificance);
  }

  if (startDate && startDate !== '' && startDate !== '-') {
    whereConditions.push(`ss.DateLastEvaluated >= $${paramCount++}`);
    params.push(startDate);
  }

  if (endDate && endDate !== '' && endDate !== '-') {
    whereConditions.push(`ss.DateLastEvaluated <= $${paramCount++}`);
    params.push(endDate);
  }

  const query = `
  WITH filtered_variants AS (
    SELECT DISTINCT vs.* 
    FROM "variant_summary" vs
    WHERE ${conditions.join(' ')}
  ),
  filtered_submissions AS (
    SELECT ss.*
    FROM filtered_variants vs
    JOIN submission_summary ss ON vs."VariationID" = ss.VariationID
    WHERE 1=1
    ${clinicalSignificance?.length ? `AND ss.ClinicalSignificance = ANY($${paramCount++})` : ''}
    ${startDate && startDate !== '' && startDate !== '-' ? `AND ss.DateLastEvaluated >= $${paramCount++}` : ''}
    ${endDate && endDate !== '' && endDate !== '-' ? `AND ss.DateLastEvaluated <= $${paramCount++}` : ''}
  )
  SELECT DISTINCT
      vs."VariationID",
      vs."Name",
      vs."GeneSymbol",
      vs."ClinicalSignificance" AS "OverallClinicalSignificance",
      vs."LastEvaluated" AS "OverallLastEvaluated",
      vs."ReviewStatus" AS "OverallReviewStatus",
      vs."RCVaccession" AS "AccessionID",
      fs.ClinicalSignificance,
      fs.DateLastEvaluated,
      fs.ReviewStatus,
      fs.CollectionMethod AS "Method",
      fs.ReportedPhenotypeInfo AS "ConditionInfo",
      fs.Submitter,
      fs.SCV AS "SubmitterAccession",
      fs.Description,
      fs.OriginCounts AS "AlleleOrigin"
  FROM filtered_variants vs
  JOIN filtered_submissions fs ON vs."VariationID" = fs.VariationID
  ORDER BY fs.DateLastEvaluated DESC`;

  try {
    const result = await pool.query(query, params);
    return processDbResults(result.rows, 
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

const QUERY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const queryResultCache = new Map();

// Public interface for processing gene-symbol-only queries, Used by the query controller
const processGeneSymbolDatabaseQuery = async (geneSymbol, clinicalSignificance, startDate, endDate) => {
  // Create cache key based on all parameters
  const cacheKey = JSON.stringify({
    geneSymbol,
    clinicalSignificance,
    startDate,
    endDate
  });

  // Check cache
  const cachedResult = queryResultCache.get(cacheKey);
  if (cachedResult && (Date.now() - cachedResult.timestamp < QUERY_CACHE_TTL)) {
    console.log(`Returning cached results for ${geneSymbol}`);
    return cachedResult.data;
  }

  try {
    console.log(`Starting gene symbol query for ${geneSymbol}`);
    const results = await processGeneSymbolOnlyQuery(
      geneSymbol, 
      clinicalSignificance, 
      startDate, 
      endDate
    );

    // Cache the results
    queryResultCache.set(cacheKey, {
      timestamp: Date.now(),
      data: results
    });

    // Cleanup old cache entries if cache gets too large
    if (queryResultCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of queryResultCache.entries()) {
        if (now - value.timestamp > QUERY_CACHE_TTL) {
          queryResultCache.delete(key);
        }
      }
    }

    return results;
  } catch (error) {
    console.error(`Error in gene symbol query for ${geneSymbol}:`, error);
    throw error;
  }
};

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of queryResultCache.entries()) {
    if (now - value.timestamp > QUERY_CACHE_TTL) {
      queryResultCache.delete(key);
    }
  }
}, QUERY_CACHE_TTL);

// Single search group for gene only
const processGeneSymbolOnlyQuery = async (geneSymbol, clinicalSignificance, startDate, endDate) => {
  try {
    // console.log('Starting gene symbol query with filters:', {
    //   geneSymbol,
    //   clinicalSignificance,
    //   startDate,
    //   endDate
    // });

    let variationIds = await fetchVariationIds(geneSymbol, true);
    
    if (!variationIds.length) {
      // console.log(`No results found with [gene] tag for ${geneSymbol}, retrying without tag...`);
      variationIds = await fetchVariationIds(geneSymbol, false);
    }

    if (!variationIds.length) {
      return [{
        error: "No results found",
        details: "No variations found for this gene symbol",
        searchTerm: geneSymbol
      }];
    }

    // console.log(`Retrieved ${variationIds.length} variation IDs for ${geneSymbol}`);
    
    const CHUNK_SIZE = 1000;
    const allResults = [];
    variationIds = [...new Set(variationIds.map(id => id.toString()))];

    for (let i = 0; i < variationIds.length; i += CHUNK_SIZE) {
      const chunk = variationIds.slice(i, i + CHUNK_SIZE);
      const { query, params } = buildChunkQuery(chunk, clinicalSignificance, startDate, endDate);
      
      // console.log('Executing chunk query:', {
      //   queryPreview: query.substring(0, 200) + '...',
      //   paramCount: params.length,
      //   firstParam: params[0],
      //   lastParam: params[params.length - 1]
      // });
      
      const result = await pool.query(query, params);
      
      if (result.rows.length > 0) {
        const processedResults = processDbResults(result.rows, geneSymbol);
        allResults.push(...processedResults);
      }

      // console.log(`Processed ${i + chunk.length}/${variationIds.length} variants (Found ${allResults.length} results)`);
    }

    if (allResults.length === 0) {
      return [{
        error: "No results found",
        details: "No matching variants found in database",
        searchTerm: geneSymbol
      }];
    }

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

// Helper function go get variation ids for gene only
const fetchVariationIds = async (geneSymbol, useGeneTag = true) => {
  try {
    const searchTerm = useGeneTag ? `${geneSymbol}[gene]` : geneSymbol;
    const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${searchTerm}&retmax=20000`;
    
    const response = await executeRequest({ url: esearchUrl, method: 'GET' });
    const $ = cheerio.load(response.data, { xmlMode: true });
    
    const totalCount = parseInt($('Count').first().text());
    if (!totalCount) {
      return [];
    }

    return $('IdList Id').map((_, el) => $(el).text()).get();
  } catch (error) {
    console.error(`Error fetching variation IDs for ${geneSymbol}:`, error);
    return [];
  }
};

const buildSignificanceCondition = (params, paramCount) => {
  if (!params.length) return '';
  
  // For each significance value, create a normalized comparison
  const conditions = params.map((_, i) => {
    const position = paramCount + i;
    return `LOWER(REGEXP_REPLACE(ss.ClinicalSignificance, '[_-]', ' ', 'g')) = LOWER($${position})`;
  });

  return `AND (${conditions.join(' OR ')})`;
};

/**
 * Updates buildChunkQuery with normalized significance matching
 */
const buildChunkQuery = (chunk, clinicalSignificance, startDate, endDate) => {
  const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(',');
  let params = chunk.map(id => id.toString());
  let paramCount = chunk.length + 1;
  
  // Normalize clinical significance values before adding to params
  const normalizedSignificance = clinicalSignificance?.map(sig => 
    normalizeClinicalSignificance(sig)
  );
  
  const query = `
    SELECT DISTINCT
        vs."VariationID",
        vs."Name",
        vs."GeneSymbol",
        vs."ClinicalSignificance" AS "OverallClinicalSignificance",
        vs."LastEvaluated" AS "OverallLastEvaluated",
        vs."ReviewStatus" AS "OverallReviewStatus",
        vs."RCVaccession" AS "AccessionID",
        ss.ClinicalSignificance,
        ss.DateLastEvaluated,
        ss.ReviewStatus,
        ss.CollectionMethod AS "Method",
        ss.ReportedPhenotypeInfo AS "ConditionInfo",
        ss.Submitter,
        ss.SCV AS "SubmitterAccession",
        ss.Description,
        ss.OriginCounts AS "AlleleOrigin"
    FROM "variant_summary" vs
    LEFT JOIN submission_summary ss 
        ON vs."VariationID" = ss.VariationID
    WHERE vs."VariationID" IN (${placeholders})
    ${normalizedSignificance?.length ? buildSignificanceCondition(normalizedSignificance, paramCount) : ''}
    ${startDate ? `AND ss.DateLastEvaluated::date >= $${paramCount + (normalizedSignificance?.length || 0)}::date` : ''}
    ${endDate ? `AND ss.DateLastEvaluated::date <= $${paramCount + (normalizedSignificance?.length || 0) + (startDate ? 1 : 0)}::date` : ''}
    ORDER BY ss.DateLastEvaluated DESC`;

  if (normalizedSignificance?.length) {
    params.push(...normalizedSignificance);
  }
  if (startDate) params.push(startDate);
  if (endDate) params.push(endDate);

  return { query, params };
};

module.exports = {
  processDbResults,
  constructGeneralSearchQuery,
  processGeneSymbolDatabaseQuery,
  processSingleNonGeneGroup
}