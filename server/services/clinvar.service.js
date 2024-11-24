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
  const seenVariants = new Set();
  const results = [];
  
  const promises = urls.map(async (url) => {
    let retryCount = 0;
    while (retryCount < MAX_RETRIES) {
      try {
        const response = await executeRequest({ url, method: 'GET' });
        const variantPage = cheerio.load(response.data);
        
        const variantDetailsHtml = variantPage('#id_first').html();
        const assertionListTable = variantPage('#assertion-list').prop('outerHTML');
        
        if (!variantDetailsHtml || !assertionListTable) return null;

        const variantDetails = parseVariantDetails(variantDetailsHtml);
        
        // Skip if we've already seen this variant
        if (seenVariants.has(variantDetails.variationID)) {
          return null;
        }
        seenVariants.add(variantDetails.variationID);

        let assertionList = refinedClinvarHtmlTableToJson(assertionListTable);

        // Apply filters with case-insensitive matching
        if (clinicalSignificance?.length || startDate || endDate) {
          assertionList = assertionList.filter(a => {
            const matchesSignificance = clinicalSignificance?.length
              ? clinicalSignificance.some(sig => {
                  // Log the comparison for debugging
                  console.log('Comparing:', {
                    assertion: a.Classification.value.toLowerCase().trim(),
                    filter: sig.toLowerCase().trim()
                  });
                  return a.Classification.value.toLowerCase().trim() === sig.toLowerCase().trim();
                })
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

        if (assertionList.length === 0) return null;

        return {
          searchTerm: searchQuery,
          variantDetails,
          assertionList
        };
      } catch (error) {
        retryCount++;
        if (retryCount === MAX_RETRIES) {
          console.error(`Failed to process URL after ${MAX_RETRIES} attempts:`, url, error);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  });

  const batchResults = (await Promise.all(promises)).filter(Boolean);
  results.push(...batchResults);

  return { results };
};

const processAllUrls = async (urls, searchQuery, searchGroup = null) => {
  const allResults = [];
  let processedCount = 0;
  let dynamicBatchSize = CONCURRENT_REQUESTS;

  // Process URLs in batches
  for (let i = 0; i < urls.length; i += dynamicBatchSize) {
    const batchUrls = urls.slice(i, i + dynamicBatchSize);
    
    const { results } = await processUrlBatch(
      batchUrls, 
      searchQuery,
      searchGroup
    );

    allResults.push(...results);
    processedCount += batchUrls.length;

    console.log(
      `Processed ${processedCount}/${urls.length} variants. ` +
      `Found ${results.length} matching results.`
    );

    if (i + dynamicBatchSize < urls.length) {
      await delay(100);
    }
  }

  return { 
    results: allResults 
  };
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

    const variantDetailsHtml = $('#id_first').html();
    const assertionListTable = $('#assertion-list').prop('outerHTML');

    if (!variantDetailsHtml || !assertionListTable) {
      return [{
        error: "Invalid response",
        details: "Could not parse variant details",
        searchTerm: fullName || variantId
      }];
    }
    
    const variantDetails = parseVariantDetails(variantDetailsHtml);
    let assertionList = refinedClinvarHtmlTableToJson(assertionListTable);
    
    // Apply filters
    if (clinicalSignificance?.length || startDate || endDate) {
      assertionList = assertionList.filter(a => {
        const matchesSignificance = clinicalSignificance?.length
          ? clinicalSignificance.includes(a.Classification.value)
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

    assertionList.sort((a, b) => new Date(b.Classification.date) - new Date(a.Classification.date));
    
    return [{
      searchTerm: fullName || variantId,
      variantDetails,
      assertionList
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