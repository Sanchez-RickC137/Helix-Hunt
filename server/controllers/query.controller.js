const { pool } = require('../config/database');
const { BASE_QUERY } = require('../constants/queries');
const { processClinVarWebQuery, processGeneralClinVarWebQuery, generateDownloadContent, processClinVarData, extractTableData } = require('../services/clinvar.service');
const { processDbResults,constructGeneralSearchQuery, processGeneSymbolDatabaseQuery, processSingleNonGeneGroup } = require('../services/database.service');
const format = require('pg-format');
const { createILikePattern, createJsonContains } = require('../utils/postgresUtils');
const PerformanceMonitor = require('../utils/performanceMonitoring');

// Saves a user query if a user is logged in
exports.saveQuery = async (req, res, next) => {
  try {
    const {
      search_type,
      full_names,
      variation_ids,
      search_groups,
      clinical_significance,
      start_date,
      end_date
    } = req.body;
    
    await pool.execute(
      `INSERT INTO query_history 
       (user_id, search_type, full_names, variation_ids, search_groups, 
        clinical_significance, start_date, end_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        search_type || 'targeted',
        JSON.stringify(full_names || []),
        JSON.stringify(variation_ids || []),
        JSON.stringify(search_groups || []),
        JSON.stringify(clinical_significance || []),
        start_date || null,
        end_date || null
      ]
    );
    
    res.json({ message: 'Query saved to history successfully' });
  } catch (error) {
    next(error);
  }
};

// Retrieves a user query history if logged in
exports.getQueryHistory = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM query_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5', 
      [req.userId]
    );
    
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// Web based, targeted query
exports.processClinVarQuery = async (req, res, next) => {
  try {
    const { fullNames, variationIDs, clinicalSignificance, startDate, endDate } = req.body;
    
    if ((!fullNames || fullNames.length === 0) && (!variationIDs || variationIDs.length === 0)) {
      return res.status(400).json({ error: 'Either full name or variant ID is required' });
    }

    const results = [];
    
    for (const fullName of fullNames || []) {
      const result = await processClinVarWebQuery(fullName, null, clinicalSignificance, startDate, endDate);
      results.push(...result); // Spread the result array instead of pushing the whole array
    }
    
    for (const variantId of variationIDs || []) {
      const result = await processClinVarWebQuery(null, variantId, clinicalSignificance, startDate, endDate);
      results.push(...result); // Spread the result array instead of pushing the whole array
    }

    console.log('Results from processClinVarQuery:', JSON.stringify(results, null, 2));
    res.json(results);
  } catch (error) {
    next(error);
  }
};

// Web based, general query
exports.processGeneralQuery = async (req, res, next) => {
  try {
    const { searchGroups, clinicalSignificance, startDate, endDate } = req.body;
    
    if (!searchGroups?.length) {
      return res.status(400).json({ error: 'At least one search group is required' });
    }

    if (searchGroups.length > 5) {
      return res.status(400).json({ 
        error: 'Too many search groups',
        details: 'Maximum of 5 search groups allowed per query'
      });
    }

    // Separate groups by type
    const geneOnlyGroups = searchGroups.filter(group => 
      group.geneSymbol && !group.dnaChange && !group.proteinChange
    );
    
    const nonGeneGroups = searchGroups.filter(group => 
      !(group.geneSymbol && !group.dnaChange && !group.proteinChange)
    );

    // Process all groups in parallel
    const results = await Promise.all([
      // Process gene-only groups in parallel
      ...geneOnlyGroups.map(group => 
        processGeneSymbolDatabaseQuery(
          group.geneSymbol,
          clinicalSignificance,
          startDate,
          endDate
        )
      ),
      // Process non-gene groups individually in parallel
      ...nonGeneGroups.map(group => 
        processGeneralClinVarWebQuery(
          group,
          clinicalSignificance,
          startDate,
          endDate
        )
      )
    ]);

    // Flatten results array and remove any error entries
    const flattenedResults = results
      .flat()
      .filter(result => !result.error);

    if (flattenedResults.length === 0) {
      return res.json([{
        error: "No results found",
        details: "No matching variants found for any search criteria",
        searchTerms: searchGroups.map(group => 
          Object.entries(group)
            .filter(([_, value]) => value)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        )
      }]);
    }

    res.json(flattenedResults);
  } catch (error) {
    next(error);
  }
};

/* Processes single or multiple variation IDs and full names concurrently */
exports.processDatabaseQuery = async (req, res) => {
  try {
    const { fullNames, variationIDs, clinicalSignificance, startDate, endDate } = req.body;
    
    if ((!fullNames || fullNames.length === 0) && (!variationIDs || variationIDs.length === 0)) {
      return res.status(400).json({ error: 'Either full name or variant ID is required' });
    }

    const promises = [];

    // Process all variation IDs in parallel
    if (variationIDs?.length > 0) {
      const variationPromises = variationIDs.map(id => {
        let paramCount = 1;
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
          WHERE vs."VariationID" = $${paramCount}
          ${clinicalSignificance?.length ? `AND ss.ClinicalSignificance = ANY($${++paramCount})` : ''}
          ${startDate ? `AND ss.DateLastEvaluated::date >= $${++paramCount}::date` : ''}
          ${endDate ? `AND ss.DateLastEvaluated::date <= $${++paramCount}::date` : ''}
          ORDER BY ss.DateLastEvaluated DESC`;

        const params = [id.toString()];
        if (clinicalSignificance?.length) params.push(clinicalSignificance);
        if (startDate) params.push(startDate);
        if (endDate) params.push(endDate);

        console.log('Executing variation ID query:', { query, params });

        return pool.query(query, params)
          .then(result => processDbResults(result.rows, id))
          .catch(error => {
            console.error('Query error for variation ID:', id, error);
            return [{
              error: "Query failed",
              details: error.message,
              searchTerm: id
            }];
          });
      });

      promises.push(...variationPromises);
    }

    // Process all full names in parallel
    if (fullNames?.length > 0) {
      const namePromises = fullNames.map(name => {
        let paramCount = 1;
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
          WHERE vs."Name" = $${paramCount}
          ${clinicalSignificance?.length ? `AND ss.ClinicalSignificance = ANY($${++paramCount})` : ''}
          ${startDate ? `AND ss.DateLastEvaluated::date >= $${++paramCount}::date` : ''}
          ${endDate ? `AND ss.DateLastEvaluated::date <= $${++paramCount}::date` : ''}
          ORDER BY ss.DateLastEvaluated DESC`;

        const params = [name];
        if (clinicalSignificance?.length) params.push(clinicalSignificance);
        if (startDate) params.push(startDate);
        if (endDate) params.push(endDate);

        return pool.query(query, params)
          .then(result => processDbResults(result.rows, name))
          .catch(error => [{
            error: "Query failed",
            details: error.message,
            searchTerm: name
          }]);
      });

      promises.push(...namePromises);
    }

    const allResults = await Promise.all(promises);
    const flattenedResults = allResults.flat().filter(result => !result.error);

    console.log('Total results found:', flattenedResults.length);

    if (flattenedResults.length === 0) {
      return res.json([{
        error: "No results found",
        details: "No matching variants found in database",
        searchTerm: "Multiple search terms"
      }]);
    }

    res.json(flattenedResults);

  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json([{
      error: 'Database query failed',
      details: error.message,
      searchTerm: 'Multiple search terms'
    }]);
  }
};

// Database based, general query
exports.processGeneralSearch = async (req, res) => {
  try {
    const { searchGroups, clinicalSignificance, startDate, endDate } = req.body;
    
    if (!searchGroups?.length) {
      return res.json([{
        error: "Invalid search criteria",
        details: "At least one search group with criteria is required"
      }]);
    }

    if (searchGroups.length > 5) {
      return res.status(400).json({ 
        error: 'Too many search groups',
        details: 'Maximum of 5 search groups allowed per query'
      });
    }

    // Separate groups by type
    const geneOnlyGroups = searchGroups.filter(group => 
      group.geneSymbol && !group.dnaChange && !group.proteinChange
    );
    
    const nonGeneGroups = searchGroups.filter(group => 
      !(group.geneSymbol && !group.dnaChange && !group.proteinChange)
    );

    // Process all groups in parallel with individual queries
    try {
      const results = await Promise.all([
        // Process gene-only groups in parallel
        ...geneOnlyGroups.map(group => 
          processGeneSymbolDatabaseQuery(
            group.geneSymbol,
            clinicalSignificance,
            startDate,
            endDate
          )
        ),
        // Process non-gene groups individually
        ...nonGeneGroups.map(group =>
          processSingleNonGeneGroup(
            group,
            clinicalSignificance,
            startDate,
            endDate
          )
        )
      ]);

      const flattenedResults = results
        .flat()
        .filter(result => !result.error);

      if (flattenedResults.length === 0) {
        return res.json([{
          error: "No results found",
          details: "No matching variants found for any search criteria",
          searchTerms: searchGroups.map(group => 
            Object.entries(group)
              .filter(([_, value]) => value)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ')
          )
        }]);
      }

      res.json(flattenedResults);

    } catch (error) {
      console.error('Database search error:', error);
      res.status(500).json([{
        error: 'Database query failed',
        details: error.message
      }]);
    }
  } catch (error) {
    console.error('General search error:', error);
    res.status(500).json([{
      error: 'Search processing failed',
      details: error.message
    }]);
  }
};

// Helper function for processGeneralQuery
exports.processGeneralSearch = async (req, res) => {
  try {
    const { searchGroups, clinicalSignificance, startDate, endDate } = req.body;
    
    if (!searchGroups?.length) {
      return res.json([{
        error: "Invalid search criteria",
        details: "At least one search group with criteria is required"
      }]);
    }

    if (searchGroups.length > 5) {
      return res.status(400).json({ 
        error: 'Too many search groups',
        details: 'Maximum of 5 search groups allowed per query'
      });
    }

    // Separate groups by type
    const geneOnlyGroups = searchGroups.filter(group => 
      group.geneSymbol && !group.dnaChange && !group.proteinChange
    );
    
    const nonGeneGroups = searchGroups.filter(group => 
      !(group.geneSymbol && !group.dnaChange && !group.proteinChange)
    );

    // Process all groups in parallel with individual queries
    try {
      const results = await Promise.all([
        // Process gene-only groups in parallel
        ...geneOnlyGroups.map(group => 
          processGeneSymbolDatabaseQuery(
            group.geneSymbol,
            clinicalSignificance,
            startDate,
            endDate
          )
        ),
        // Process non-gene groups individually
        ...nonGeneGroups.map(group =>
          processSingleNonGeneGroup(
            group,
            clinicalSignificance,
            startDate,
            endDate
          )
        )
      ]);

      const flattenedResults = results
        .flat()
        .filter(result => !result.error);

      if (flattenedResults.length === 0) {
        return res.json([{
          error: "No results found",
          details: "No matching variants found for any search criteria",
          searchTerms: searchGroups.map(group => 
            Object.entries(group)
              .filter(([_, value]) => value)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ')
          )
        }]);
      }

      res.json(flattenedResults);

    } catch (error) {
      console.error('Database search error:', error);
      res.status(500).json([{
        error: 'Database query failed',
        details: error.message
      }]);
    }
  } catch (error) {
    console.error('General search error:', error);
    res.status(500).json([{
      error: 'Search processing failed',
      details: error.message
    }]);
  }
};

exports.fetchResultsChunk = async (req, res) => {
  const { fileId, offset, limit } = req.query;
  
  try {
    const results = await clinvarService.fetchResultsChunk(
      fileId,
      parseInt(offset) || 0,
      parseInt(limit) || 100
    );
    res.json(results);
  } catch (error) {
    console.error('Error fetching results chunk:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

// Download query Results to file 
exports.downloadResults = async (req, res) => {
  try {
    const { results, format } = req.body;

    if (!results || !format) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const content = generateDownloadContent(results, format);

    // Set appropriate headers
    const contentTypes = {
      csv: 'text/csv',
      tsv: 'text/tab-separated-values',
      xml: 'application/xml'
    };

    res.setHeader('Content-Type', contentTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename=clinvar_results_${new Date().toISOString().split('T')[0]}.${format}`);

    res.send(content);

  } catch (error) {
    console.error('Download generation error:', error);
    res.status(500).json({ error: 'Failed to generate download' });
  }
};

exports.checkProcessingStatus = async (req, res) => {
  const { queryId } = req.params;
  
  try {
    const [rows] = await pool.query(
      'SELECT status, progress, total_items, error_message FROM processing_status WHERE id = ?',
      [queryId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Processing status not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error checking processing status:', error);
    res.status(500).json({ error: 'Failed to check processing status' });
  }
};

const geneCountCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
exports.getGeneCount = async (req, res) => {
  try {
    const { geneSymbol } = req.params;

    // Check cache first
    const cachedData = geneCountCache.get(geneSymbol);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      return res.json(cachedData.data);
    }

    const [rows] = await pool.execute(
      'SELECT variant_count FROM gene_variant_counts WHERE gene_symbol = ?',
      [geneSymbol]
    );

    const result = rows.length === 0 
      ? { variantCount: 0, isDatabaseSearch: false }
      : { 
          variantCount: rows[0].variant_count,
          isDatabaseSearch: rows[0].variant_count > 1000
        };

    // Cache the result
    geneCountCache.set(geneSymbol, {
      timestamp: Date.now(),
      data: result
    });

    res.json(result);

  } catch (error) {
    console.error('Error fetching gene count:', error);
    res.status(500).json({ error: 'Failed to fetch gene count' });
  }
};

// const createOptimizedQuery = (searchGroups, filters) => {
//   let queryParts = [];
//   const params = [];
//   let paramCount = 1;

//   searchGroups.forEach(group => {
//     const groupConditions = [];
    
//     // Use GiST index for text pattern matching
//     if (group.geneSymbol) {
//       groupConditions.push(`cp.gene_symbol ILIKE $${paramCount}`);
//       params.push(`%${group.geneSymbol}%`);
//       paramCount++;
//     }

//     // Use trigram similarity for fuzzy matching
//     if (group.dnaChange) {
//       groupConditions.push(
//         `similarity(cp.dna_change, $${paramCount}) > 0.3 OR cp.dna_change ILIKE $${paramCount + 1}`
//       );
//       params.push(group.dnaChange, `%${group.dnaChange}%`);
//       paramCount += 2;
//     }

//     if (group.proteinChange) {
//       groupConditions.push(
//         `similarity(cp.protein_change, $${paramCount}) > 0.3 OR cp.protein_change ILIKE $${paramCount + 1}`
//       );
//       params.push(group.proteinChange, `%${group.proteinChange}%`);
//       paramCount += 2;
//     }

//     if (groupConditions.length > 0) {
//       queryParts.push(`(${groupConditions.join(' AND ')})`);
//     }
//   });

//   let query = `
//     WITH filtered_variants AS (
//       SELECT DISTINCT vs.* 
//       FROM variant_summary vs
//       INNER JOIN component_parts cp ON vs.variationid = cp.variation_id
//       ${queryParts.length > 0 ? `WHERE ${queryParts.join(' OR ')}` : ''}
//     )
//   `;

//   // Add filters
//   const filterConditions = [];
  
//   if (filters.clinicalSignificance?.length) {
//     filterConditions.push(`clinicalsignificance = ANY($${paramCount})`);
//     params.push(filters.clinicalSignificance);
//     paramCount++;
//   }

//   if (filters.startDate) {
//     filterConditions.push(`datelastevaluated >= $${paramCount}::date`);
//     params.push(filters.startDate);
//     paramCount++;
//   }

//   if (filters.endDate) {
//     filterConditions.push(`datelastevaluated <= $${paramCount}::date`);
//     params.push(filters.endDate);
//     paramCount++;
//   }

//   query += `
//     SELECT *
//     FROM filtered_variants
//     ${filterConditions.length > 0 ? `WHERE ${filterConditions.join(' AND ')}` : ''}
//     ORDER BY datelastevaluated DESC
//   `;

//   return { query, params };
// };

// exports.executeOptimizedQuery = async (searchGroups, filters) => {
//   const startTime = process.hrtime();
//   const client = await pool.connect();
  
//   try {
//     const { query, params } = createOptimizedQuery(searchGroups, filters);
    
//     // Create execution plan
//     const plan = await client.query(`EXPLAIN ANALYZE ${query}`, params);
//     console.log('Query execution plan:', plan.rows);

//     // Execute query
//     const result = await client.query(query, params);
    
//     // Log performance
//     const endTime = process.hrtime(startTime);
//     const executionTime = endTime[0] * 1000 + endTime[1] / 1000000;
    
//     await PerformanceMonitor.logQueryPerformance(
//       query.slice(0, 100), // Use first 100 chars as query ID
//       executionTime,
//       result
//     );

//     return result.rows;
//   } finally {
//     client.release();
//   }
// };

// exports.createMaterializedResults = async (queryId, results) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     // Create materialized results table if it doesn't exist
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS materialized_results (
//         query_id TEXT PRIMARY KEY,
//         results JSONB,
//         created_at TIMESTAMP DEFAULT NOW(),
//         expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 day'
//       )
//     `);

//     // Store results
//     await client.query(
//       `INSERT INTO materialized_results (query_id, results)
//        VALUES ($1, $2)
//        ON CONFLICT (query_id) 
//        DO UPDATE SET results = $2, created_at = NOW(), expires_at = NOW() + INTERVAL '1 day'`,
//       [queryId, JSON.stringify(results)]
//     );

//     await client.query('COMMIT');
//   } catch (error) {
//     await client.query('ROLLBACK');
//     throw error;
//   } finally {
//     client.release();
//   }
// };