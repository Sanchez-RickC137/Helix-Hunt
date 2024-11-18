const { pool } = require('../config/database');
const { BASE_QUERY } = require('../constants/queries');
const {
  processClinVarWebQuery,
  processGeneralClinVarWebQuery,
  generateDownloadContent,
  processClinVarData, 
  extractTableData
} = require('../services/clinvar.service');
const {
  processDbResults,
  constructGeneralSearchQuery,
  processGeneSymbolDatabaseQuery
 } = require('../services/database.service');

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
    
    if (!searchGroups || searchGroups.length === 0) {
      return res.status(400).json({ error: 'At least one search group is required' });
    }

    // Check if this is a gene-symbol-only search
    for (const group of searchGroups) {
      if (group.geneSymbol && !group.dnaChange && !group.proteinChange) {
        const [rows] = await pool.execute(
          'SELECT variant_count FROM gene_variant_counts WHERE gene_symbol = ?',
          [group.geneSymbol]
        );

        if (rows.length > 0) {
          const variantCount = rows[0].variant_count;
          
          // All gene symbol only queries now use database
          return res.json(await processGeneSymbolDatabaseQuery(
            group.geneSymbol,
            clinicalSignificance,
            startDate,
            endDate
          ));
        }
      }
    }

    // Non-gene-symbol-only queries continue with web processing
    const results = await processGeneralClinVarWebQuery(
      searchGroups[0],
      clinicalSignificance,
      startDate,
      endDate
    );

    res.json(results);
  } catch (error) {
    next(error);
  }
};

// Database based, targeted query for variation id
exports.processVariationIdQuery = async (req, res) => {
  try {
    const query = `${BASE_QUERY}
      WHERE vs.VariationID = ?
      ORDER BY ss.DateLastEvaluated DESC`;

    const [results] = await pool.execute(query, [req.body.variationId]);
    
    if (results.length === 0) {
      return res.json([{
        error: "Not found",
        details: "No results found for the specified variation ID",
        searchTerm: req.body.variationId
      }]);
    }
   
    const processedResults = processDbResults(results, req.body.variationId);
    res.json(processedResults);
  } catch (error) {
    res.status(500).json([{
      error: 'Database query failed',
      details: error.message,
      searchTerm: req.body.variationId
    }]);
  }
};

// Database based, targeted query for full name
exports.processFullNameQuery = async (req, res) => {
  try {
    const query = `${BASE_QUERY}
      WHERE vs.Name = ?
      ORDER BY ss.DateLastEvaluated DESC`;

    const [results] = await pool.execute(query, [req.body.fullName]);
    
    if (results.length === 0) {
      return res.json([{
        error: "Not found",
        details: "No results found for the specified full name",
        searchTerm: req.body.fullName
      }]);
    }

    const processedResults = processDbResults(results, req.body.fullName);
    res.json(processedResults);
  } catch (error) {
    res.status(500).json([{
      error: 'Database query failed',
      details: error.message,
      searchTerm: req.body.fullName
    }]);
  }
};

// Database based, general query
exports.processGeneralSearch = async (req, res) => {
  try {
    const { searchGroups, clinicalSignificance, startDate, endDate } = req.body;
    
    if (!searchGroups || !Array.isArray(searchGroups) || searchGroups.length === 0) {
      return res.json([{
        error: "Invalid search criteria",
        details: "At least one search group with criteria is required"
      }]);
    }

    // Check for gene-symbol-only search first
    for (const group of searchGroups) {
      if (group.geneSymbol && !group.dnaChange && !group.proteinChange) {
        const [rows] = await pool.execute(
          'SELECT variant_count FROM gene_variant_counts WHERE gene_symbol = ?',
          [group.geneSymbol]
        );

        if (rows.length > 0) {
          return res.json(await processGeneSymbolDatabaseQuery(
            group.geneSymbol,
            clinicalSignificance,
            startDate,
            endDate
          ));
        }
      }
    }

    // For non-gene-only searches
    const { query, params } = constructGeneralSearchQuery(searchGroups, clinicalSignificance, startDate, endDate);
    console.log('Executing query:', query);
    console.log('With parameters:', params);

    try {
      const [results] = await pool.execute(query, params);
      console.log(`Query returned ${results.length} results`);

      if (!results || results.length === 0) {
        return res.json([{
          error: "No results found",
          details: "No matching variants in database",
          searchTerms: searchGroups.map(group => 
            Object.entries(group)
              .filter(([_, value]) => value)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ')
          )
        }]);
      }

      const processedResults = processDbResults(results, 
        searchGroups.map(group => 
          Object.entries(group)
            .filter(([_, value]) => value)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        ).join(' OR ')
      );

      res.json(processedResults);
    } catch (error) {
      console.error('Database query error:', error);
      // Set a longer timeout and retry once
      console.log('Retrying query with longer timeout...');
      pool.execute(query, params, { timeout: 60000 })
        .then(([results]) => {
          const processedResults = processDbResults(results, 
            searchGroups.map(group => 
              Object.entries(group)
                .filter(([_, value]) => value)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')
            ).join(' OR ')
          );
          res.json(processedResults);
        })
        .catch(retryError => {
          console.error('Retry failed:', retryError);
          throw retryError;
        });
    }
  } catch (error) {
    console.error('Database general search error:', error);
    res.status(500).json([{
      error: 'Database query failed',
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
