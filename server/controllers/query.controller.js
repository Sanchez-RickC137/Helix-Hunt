const { pool } = require('../config/database');
const { BASE_QUERY } = require('../constants/queries');
const {
  processClinVarWebQuery,
  processGeneralClinVarWebQuery,
  generateDownloadContent
} = require('../services/clinvar.service');
const { processDbResults } = require('../services/database.service');

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

exports.processClinVarQuery = async (req, res, next) => {
  try {
    const { fullNames, variationIDs, clinicalSignificance, startDate, endDate } = req.body;
    
    if ((!fullNames || fullNames.length === 0) && (!variationIDs || variationIDs.length === 0)) {
      return res.status(400).json({ error: 'Either full name or variant ID is required' });
    }

    const results = [];
    
    for (const fullName of fullNames || []) {
      const result = await processClinVarWebQuery(fullName, null, clinicalSignificance, startDate, endDate);
      results.push(result);
    }
    
    for (const variantId of variationIDs || []) {
      const result = await processClinVarWebQuery(null, variantId, clinicalSignificance, startDate, endDate);
      results.push(result);
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
};

exports.processGeneralQuery = async (req, res, next) => {
  try {
    const { searchGroups, clinicalSignificance, startDate, endDate } = req.body;
    
    if (!searchGroups || searchGroups.length === 0) {
      return res.status(400).json({ error: 'At least one search group is required' });
    }

    const results = [];
    
    for (const group of searchGroups) {
      const searchTerms = [];
      if (group.geneSymbol) searchTerms.push(group.geneSymbol);
      if (group.dnaChange) searchTerms.push(group.dnaChange);
      if (group.proteinChange) searchTerms.push(group.proteinChange);

      if (searchTerms.length === 0) continue;

      const searchQuery = searchTerms.map(term => `(${encodeURIComponent(term)})`).join(' AND ');
      const groupResults = await processGeneralClinVarWebQuery(searchQuery, group, clinicalSignificance, startDate, endDate);
      
      if (Array.isArray(groupResults)) {
        results.push(...groupResults);
      } else {
        results.push(groupResults);
      }
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
};

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

exports.processGeneralSearch = async (req, res) => {
  try {
    if (!req.body.searchGroups || req.body.searchGroups.length === 0) {
      return res.status(400).json({
        error: "Invalid request",
        details: "At least one search group is required"
      });
    }

    const results = [];
    for (const group of req.body.searchGroups) {
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

      if (conditions.length > 0) {
        const query = `${BASE_QUERY}
          WHERE ${conditions.join(' AND ')}
          ORDER BY ss.DateLastEvaluated DESC`;

        const [groupResults] = await pool.execute(query, params);
        results.push(...groupResults);
      }
    }

    if (results.length === 0) {
      return res.status(404).json({
        error: "Not found",
        details: "No results found matching the search criteria"
      });
    }

    const processedResults = processDbResults(results, 'General Search');
    res.json(processedResults);
  } catch (error) {
    res.status(500).json({
      error: 'Database query failed',
      details: error.message
    });
  }
};

exports.downloadResults = (req, res) => {
  try {
    const { results, format } = req.body;
    const content = generateDownloadContent(results, format);
    
    let contentType;
    switch (format) {
      case 'csv':
        contentType = 'text/csv';
        break;
      case 'tsv':
        contentType = 'text/tab-separated-values';
        break;
      case 'xml':
        contentType = 'application/xml';
        break;
      default:
        throw new Error('Unsupported format');
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=clinvar_results.${format}`);
    res.send(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate download' });
  }
};