const axios = require('axios');
const cheerio = require('cheerio');
const { Parser } = require('json2csv');
const xml2js = require('xml2js');
const { parseVariantDetails, refinedClinvarHtmlTableToJson } = require('../utils/clinvarUtils');
const largeResultHandler = require('../utils/largeResultHandler');
const { processGeneSymbolOnlyQuery } = require('./database.service');

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 100,
  perMilliseconds: 1000,
  availableTokens: 100,
  lastRefill: Date.now(),
};

// Batch and retry configuration
const BATCH_SIZE = 25;
const CONCURRENT_REQUESTS = 50;
const MAX_RETRIES = 10;

const axiosInstance = axios.create({
  baseURL: 'https://www.ncbi.nlm.nih.gov/',
  timeout: 30000,
  headers: {
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (compatible; HelixHunt/1.0; +http://example.com)'
  },
  httpAgent: new (require('http').Agent)({ keepAlive: true }),
  httpsAgent: new (require('https').Agent)({ keepAlive: true })
});

// Helper functions
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Rate limited request handler
const executeRequest = async (config) => {
  while (RATE_LIMIT.availableTokens <= 0) {
    const now = Date.now();
    const elapsed = now - RATE_LIMIT.lastRefill;

    if (elapsed >= RATE_LIMIT.perMilliseconds) {
      RATE_LIMIT.availableTokens = RATE_LIMIT.maxRequests;
      RATE_LIMIT.lastRefill = now;
    } else {
      await delay(50); // Short sleep to avoid tight loop
    }
  }

  RATE_LIMIT.availableTokens--;

  try {
    return await axiosInstance(config);
  } catch (error) {
    throw error;
  }
};

const processUrlBatch = async (urls, searchQuery, clinicalSignificance, startDate, endDate) => {
  const results = [];
  
  const promises = urls.map(async (url) => {
    let retryCount = 0;
    while (retryCount < MAX_RETRIES) {
      try {
        // console.log(url);
        const response = await executeRequest({ url, method: 'GET' });
        const variantPage = cheerio.load(response.data);
        
        const variantDetailsHtml = variantPage('#id_first').html();
        const assertionListTable = variantPage('#assertion-list').prop('outerHTML');
        
        if (!variantDetailsHtml || !assertionListTable) return null;

        const variantDetails = parseVariantDetails(variantDetailsHtml);
        let assertionList = refinedClinvarHtmlTableToJson(assertionListTable);

        // Apply filters
        if (clinicalSignificance?.length) {
          assertionList = assertionList.filter(a => 
            clinicalSignificance.includes(a.Classification.value)
          );
        }
        if (startDate) {
          assertionList = assertionList.filter(a => 
            new Date(a.Classification.date) >= new Date(startDate)
          );
        }
        if (endDate) {
          assertionList = assertionList.filter(a => 
            new Date(a.Classification.date) <= new Date(endDate)
          );
        }

        return assertionList.length > 0 ? {
          searchTerm: searchQuery,
          variantDetails,
          assertionList
        } : null;
      } catch (error) {
        retryCount++;
        if (retryCount === MAX_RETRIES) {
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  });

  const batchResults = await Promise.all(promises);
  results.push(...batchResults.filter(Boolean));

  return { results };
};

const processAllUrls = async (urls, searchQuery, searchGroup = null) => {
  const allResults = [];
  let processedCount = 0;
  let dynamicBatchSize = CONCURRENT_REQUESTS; // Start with the default batch size

  // Function to adjust batch size dynamically
  const adjustBatchSize = (successRate) => {
    if (successRate < 0.8 && dynamicBatchSize > 5) {
      dynamicBatchSize = Math.max(5, Math.floor(dynamicBatchSize * 0.8)); // Decrease batch size
    } else if (successRate > 0.9 && dynamicBatchSize < 50) {
      dynamicBatchSize = Math.min(50, Math.floor(dynamicBatchSize * 1.2)); // Increase batch size
    }
  };

  for (let i = 0; i < urls.length; i += dynamicBatchSize) {
    const batchUrls = urls.slice(i, i + dynamicBatchSize);
    
    // Process a batch of URLs
    const { results } = await processUrlBatch(batchUrls, searchQuery, searchGroup);

    // Track success rate for the current batch
    const successRate = results.length / batchUrls.length;
    adjustBatchSize(successRate);

    // Add batch results to the final collection
    allResults.push(...results);
    processedCount += batchUrls.length;

    // Log progress and success rate
    // console.log(
    //   `Processed ${processedCount}/${urls.length} variants. ` +
    //   `Batch success rate: ${(successRate * 100).toFixed(2)}%. ` +
    //   `Dynamic batch size: ${dynamicBatchSize}.`
    // );

    // Add a small delay to avoid overwhelming the server between batches
    if (i + dynamicBatchSize < urls.length) {
      await delay(100);
    }
  }

  // console.log(
  //   `Completed processing ${processedCount} URLs. ` +
  //   `Total results: ${allResults.length} successful.`
  // );

  return { results: allResults };
};

exports.processClinVarWebQuery = async (fullName, variantId, clinicalSignificance, startDate, endDate) => {
  try {
    let searchUrl;
    if (variantId) {
      searchUrl = `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variantId}/`;
    } else if (fullName) {
      searchUrl = `https://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(fullName)}`;
    } else {
      return [{
        error: "Invalid query",
        details: "Either full name or variant ID is required",
        searchTerm: fullName || variantId
      }];
    }

    const response = await executeRequest({ url: searchUrl, method: 'GET' });
    const $ = cheerio.load(response.data);

    if ($('title').text().includes('No items found')) {
      return [{
        error: "Not found",
        details: "No matching variants found",
        searchTerm: fullName || variantId
      }];
    }

    // Track seen variants with assertion combinations
    const seenEntries = new Set();
    const results = [];

    // Process each variant section
    $('div.variant-section').each((_, section) => {
      const variantDetailsHtml = $(section).find('#id_first').html();
      const assertionListTable = $(section).find('#assertion-list').prop('outerHTML');

      if (!variantDetailsHtml || !assertionListTable) return;

      const variantDetails = parseVariantDetails(variantDetailsHtml);

      let assertionList = refinedClinvarHtmlTableToJson(assertionListTable);

      // Apply filters
      if (clinicalSignificance?.length || startDate || endDate) {
        assertionList = assertionList.filter(a => {
          const matchesSignificance = clinicalSignificance?.length
            ? clinicalSignificance.some(sig => 
                a.Classification.value.toLowerCase().trim() === sig.toLowerCase().trim()
              )
            : true;
            
          const matchesStartDate = startDate
            ? new Date(a.Classification.date) >= new Date(startDate)
            : true;
            
          const matchesEndDate = endDate
            ? new Date(a.Classification.date) <= new Date(endDate)
            : true;

          return matchesSignificance && matchesStartDate && matchesEndDate;
        });
      }

      // Skip if no assertions match after filtering
      if (assertionList.length === 0) return;

      // Check for duplicates (variantDetails + assertionList combo)
      const entryKey = JSON.stringify({ variantDetails, assertionList });
      if (seenEntries.has(entryKey)) return;

      // Add to results and mark as seen
      seenEntries.add(entryKey);
      results.push({
        searchTerm: fullName || variantId,
        variantDetails,
        assertionList
      });
    });

    return results.length > 0 ? results : [{
      error: "No matching results",
      details: "No variants match the specified criteria",
      searchTerm: fullName || variantId
    }];

  } catch (error) {
    console.error('Error in web query:', error);
    return [{
      error: "Query processing failed",
      details: error.message,
      searchTerm: fullName || variantId
    }];
  }
};

// Helper function to consistently normalize clinical significance strings
function normalizeSignificanceString(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/[.,;:\-_]/g, ' ')  // Replace punctuation with spaces
    .trim();
}

exports.processGeneralClinVarWebQuery = async (searchGroup, clinicalSignificance, startDate, endDate) => {
  try {
    // Check for gene-symbol-only search
    const isGeneSymbolOnly = searchGroup.geneSymbol && 
      !searchGroup.dnaChange && 
      !searchGroup.proteinChange;

    if (isGeneSymbolOnly) {
      return await processGeneSymbolOnlyQuery(
        searchGroup.geneSymbol,
        clinicalSignificance,
        startDate,
        endDate
      );
    }

    // Construct search query string
    let searchTerms = '';
    if (searchGroup.dnaChange)
      searchTerms += searchGroup.dnaChange;
    if (searchGroup.proteinChange)
      if (searchGroup.dnaChange)
        searchTerms += ' AND ' + searchGroup.proteinChange;
      else
        searchTerms += searchGroup.proteinChange;
    if (searchGroup.geneSymbol)
      searchTerms += ' AND ' + searchGroup.geneSymbol;

    const searchUrl = `https://www.ncbi.nlm.nih.gov/clinvar?term=${encodeURIComponent(searchTerms)}`;
    const response = await axios.get(searchUrl);
    let $ = cheerio.load(response.data);

    if ($('title').text().startsWith('VCV')) {
      // Handle direct VCV page
      return processDirectVcvPage($, searchTerms, clinicalSignificance, startDate, endDate);
    }

    if ($('title').text().includes('No items found')) {
      return [{
        error: "No items found",
        details: "No variants match the search criteria.",
        searchTerm: searchTerms
      }];
    }

    // Collect all matching URLs
    const matchingUrls = new Set();
    $('.blocklevelaintable').each((_, entry) => {
      const entryText = $(entry).text().trim();
      const variantUrl = $(entry).attr('href');
      const matchesSearch = Object.entries(searchGroup)
        .filter(([_, value]) => value)
        .every(([key, value]) => entryText.toLowerCase().includes(value.toLowerCase()));

      if (matchesSearch && variantUrl) {
        matchingUrls.add(`https://www.ncbi.nlm.nih.gov${variantUrl}`);
      }
    });

    const urlArray = Array.from(matchingUrls);
    if (!urlArray.length) {
      return [{
        error: "No matching variants",
        details: "No variants found matching all criteria",
        searchTerm: searchTerms
      }];
    }

    // Process URLs using the optimized function
    const { results } = await processAllUrls(urlArray, searchTerms, clinicalSignificance, startDate, endDate);

    if (!results.length) {
      return [{
        error: "No matching variants",
        details: "No variants found matching all criteria",
        searchTerm: searchTerms
      }];
    }

    return results;

  } catch (error) {
    return [{
      error: error.response?.status === 404 ? "Not found" : "Server error",
      details: error.message,
      searchTerm: Object.values(searchGroup).filter(Boolean).join(' AND ')
    }];
  }
};

/**
 * Normalizes results data structure for consistent processing
 * Handles both single results and nested array results
 */
const normalizeResults = (results) => {
  if (!Array.isArray(results)) return [];
  
  return results.flatMap(result => {
    // Skip error results
    if (result.error) return [];

    // Handle nested array results (from database queries)
    if (Array.isArray(result)) {
      return result.flatMap(item => {
        if (item.error) return [];
        return processResultItem(item);
      });
    }

    // Handle single result (from web queries or variation ID queries)
    return processResultItem(result);
  });
};

/**
 * Processes individual result items into flat data structure
 */
const processResultItem = (result) => {
  if (!result.variantDetails || !result.assertionList) return [];

  return result.assertionList.map(assertion => ({
    SearchTerm: result.searchTerm || 'N/A',
    TranscriptID: result.variantDetails.transcriptID || 'N/A',
    GeneSymbol: result.variantDetails.geneSymbol || 'N/A',
    DNAChange: result.variantDetails.dnaChange || 'N/A',
    ProteinChange: result.variantDetails.proteinChange || 'N/A',
    GeneName: result.variantDetails.fullName || 'N/A',
    VariationID: result.variantDetails.variationID || 'N/A',
    AccessionID: result.variantDetails.accessionID || 'N/A',
    Classification: `${assertion.Classification?.value || 'N/A'} (${assertion.Classification?.date || 'N/A'})`,
    LastEvaluated: assertion.Classification?.date || 'N/A',
    AssertionReference: assertion['Review status']?.submission_reference || 'N/A',
    AssertionCriteria: assertion['Review status']?.['assertion criteria'] || 'N/A',
    Method: assertion['Review status']?.method || 'N/A',
    Condition: assertion.Condition?.name || 'N/A',
    AffectedStatus: assertion.Condition?.['Affected status'] || 'N/A',
    AlleleOrigin: assertion.Condition?.['Allele origin'] || 'N/A',
    Submitter: assertion.Submitter?.name || 'N/A',
    SubmitterAccession: assertion.Submitter?.Accession || 'N/A',
    FirstInClinVar: assertion.Submitter?.['First in ClinVar'] || 'N/A',
    LastUpdated: assertion.Submitter?.['Last updated'] || 'N/A',
    Comment: assertion['More information']?.Comment || 'N/A'
  }));
};

exports.generateDownloadContent = (results, format) => {
  const normalizedData = normalizeResults(results);
  
  if (normalizedData.length === 0) {
    throw new Error('No valid data to download');
  }

  switch (format) {
    case 'csv':
      const csvParser = new Parser({ 
        fields: Object.keys(normalizedData[0])
      });
      return csvParser.parse(normalizedData);

    case 'tsv':
      const tsvParser = new Parser({ 
        fields: Object.keys(normalizedData[0]),
        delimiter: '\t'
      });
      return tsvParser.parse(normalizedData);

    case 'xml':
      const builder = new xml2js.Builder({
        rootName: 'ClinVarResults',
        xmldec: { version: '1.0', encoding: 'UTF-8' }
      });
      return builder.buildObject({ Result: normalizedData });

    default:
      throw new Error('Unsupported format');
  }
};

exports.processGeneSymbolOnlyQuery = processGeneSymbolOnlyQuery;