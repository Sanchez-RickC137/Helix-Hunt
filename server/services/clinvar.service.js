const axios = require('axios');
const cheerio = require('cheerio');
const { Parser } = require('json2csv');
const xml2js = require('xml2js');
const { parseVariantDetails, refinedClinvarHtmlTableToJson } = require('../utils/clinvarUtils');
const largeResultHandler = require('../utils/largeResultHandler');
const { processGeneSymbolOnlyQuery } = require('./database.service');

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 10,
  perMilliseconds: 1000,
  queue: [],
  activeRequests: 0,
  lastReset: Date.now()
};

// Batch and retry configuration
const BATCH_SIZE = 100;
const CONCURRENT_REQUESTS = 20;
const MAX_RETRIES = 10;

// Configure axios defaults
const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'Accept-Encoding': 'gzip',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (compatible; HelixHunt/1.0; +http://example.com)'
  }
});

// Helper functions
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Rate limited request handler
const executeRequest = async (config) => {
  // Wait if too many active requests
  while (RATE_LIMIT.activeRequests >= RATE_LIMIT.maxRequests) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  RATE_LIMIT.activeRequests++;

  try {
    const response = await axios({
      ...config,
      timeout: 30000,
      headers: {
        'Accept-Encoding': 'gzip',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (compatible; HelixHunt/1.0; +http://example.com)'
      }
    });

    RATE_LIMIT.activeRequests--;
    return response;
  } catch (error) {
    RATE_LIMIT.activeRequests--;
    throw error;
  }
};

const processUrlBatch = async (urls, searchQuery, searchGroup = null) => {
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
        const assertionList = refinedClinvarHtmlTableToJson(assertionListTable);

        return {
          searchTerm: searchQuery,
          variantDetails,
          assertionList
        };
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

  for (let i = 0; i < urls.length; i += CONCURRENT_REQUESTS) {
    const batchUrls = urls.slice(i, i + CONCURRENT_REQUESTS);
    const { results } = await processUrlBatch(batchUrls, searchQuery, searchGroup);
    
    allResults.push(...results);
    processedCount += batchUrls.length;

    // Log progress every 100 processed
    if (processedCount % 100 === 0 || processedCount === urls.length) {
      console.log(`Processed ${processedCount}/${urls.length} variants (${allResults.length} successful)`);
    }
  }

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
    const assertionList = refinedClinvarHtmlTableToJson(assertionListTable);

    // Process results based on filters
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

async function processBatchOfUrls(urls, searchTerms, clinicalSignificance, startDate, endDate) {
  try {
    const batchResults = await Promise.all(
      urls.map(async (url) => {
        try {
          const variantResponse = await axios.get(url);
          const variantPage = cheerio.load(variantResponse.data);
          
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
            searchTerm: searchTerms,
            variantDetails,
            assertionList
          } : null;
        } catch (error) {
          console.error('Error processing variant URL:', url, error);
          return null;
        }
      })
    );

    return batchResults.filter(Boolean);
  } catch (error) {
    console.error('Batch processing error:', error);
    return [];
  }
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
    if(searchGroup.geneSymbol)
      searchTerms += ' AND ' + searchGroup.geneSymbol;

    const searchUrl = `https://www.ncbi.nlm.nih.gov/clinvar?term=${encodeURIComponent(searchTerms)}`;
    const response = await axios.get(searchUrl);
    let $ = cheerio.load(response.data);

    // Check if we're already on a VCV page
    if ($('title').text().startsWith('VCV')) {
      const variantDetailsHtml = $('#id_first').html();
      const assertionListTable = $('#assertion-list').prop('outerHTML');

      if (!variantDetailsHtml || !assertionListTable) {
        return [{
          error: "Invalid response",
          details: "Could not parse variant details",
          searchTerms: searchTerms
        }];
      }

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

      return [{
        searchTerms: searchTerms,
        variantDetails,
        assertionList
      }];
    }

    // Handle search results page
    if ($('title').text().includes('No items found')) {
      return [{
        error: "No items found",
        details: "No variants match the search criteria.",
        searchTerm: searchTerms
      }];
    }

    // Collect all matching URLs
    const matchingUrls = new Set();
    const entries = $('.blocklevelaintable');
    
    entries.each((_, entry) => {
      const entryText = $(entry).text().trim();
      const variantUrl = $(entry).attr('href');
      
      const matchesSearch = Object.entries(searchGroup)
        .filter(([_, value]) => value)
        .every(([key, value]) => {
          const searchValue = key === 'geneSymbol' ? `(${value})` : value;
          return entryText.toLowerCase().includes(searchValue.toLowerCase());
        });

      if (matchesSearch && variantUrl) {
        matchingUrls.add(`https://www.ncbi.nlm.nih.gov${variantUrl}`);
      }
    });

    const urlArray = Array.from(matchingUrls);
    const allResults = [];

    // Process URLs in batches
    for (let i = 0; i < urlArray.length; i += BATCH_SIZE) {
      const batch = urlArray.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatchOfUrls(
        batch,
        searchTerms,
        clinicalSignificance,
        startDate,
        endDate
      );
      allResults.push(...batchResults);

      // Add a small delay between batches to avoid overwhelming the server
      if (i + BATCH_SIZE < urlArray.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (allResults.length === 0) {
      return [{
        error: "No matching variants",
        details: "No variants found matching all criteria",
        searchTerm: searchTerms
      }];
    }

    return allResults;

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