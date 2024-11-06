const axios = require('axios');
const cheerio = require('cheerio');
const { Parser } = require('json2csv');
const xml2js = require('xml2js');
const { parseVariantDetails, refinedClinvarHtmlTableToJson } = require('../utils/clinvarUtils');

// Configure axios defaults for optimization
axios.defaults.timeout = 10000;
axios.defaults.headers.common['Accept-Encoding'] = 'gzip';
axios.defaults.headers.common['Connection'] = 'keep-alive';

// Request concurrency management
const MAX_CONCURRENT_REQUESTS = 5;
const requestQueue = [];
let activeRequests = 0;

const processNextRequest = async () => {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) return;
  
  activeRequests++;
  const { config, resolve, reject } = requestQueue.shift();
  
  try {
    const response = await axios(config);
    resolve(response);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    processNextRequest();
  }
};

const queuedRequest = (config) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ config, resolve, reject });
    processNextRequest();
  });
};

// Integrated data processing functions
const processClinVarData = (data) => {
  if (!data || typeof data !== 'object') {
    return { error: 'Invalid data received' };
  }
  
  return {
    variantInfo: data.variation_set ? data.variation_set[0] : {},
    clinicalSignificance: data.clinical_significance || {},
    geneInfo: data.gene_info || {},
    conditions: data.conditions || [],
  };
};

const extractTableData = (data) => {
  if (!data || typeof data !== 'object') {
    return [];
  }
  
  return Object.entries(data).map(([key, value]) => {
    return {
      field: key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    };
  });
};

exports.processClinVarWebQuery = async (fullName, variantId, clinicalSignificance, startDate, endDate) => {
  let url;
  let searchTerm;
  
  if (variantId) {
    searchTerm = variantId;
    url = `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variantId}/`;
  } else if (fullName) {
    url = `https://www.ncbi.nlm.nih.gov/clinvar?term=${encodeURIComponent(fullName)}`;
    searchTerm = fullName;
  } else {
    throw new Error('Either full name or variant ID is required');
  }
   
  try {
    const response = await queuedRequest({ url, method: 'GET' });
    let $ = cheerio.load(response.data);

    if ($('title').text().includes('No items found')) {
      return { 
        error: "No items found", 
        details: "The provided variation ID or name was not found in ClinVar.", 
        searchTerm 
      };
    }

    if ($('title').text().substring(0, 3) !== "VCV") {
      const entries = $('.blocklevelaintable');
      let nextPage = "https://www.ncbi.nlm.nih.gov";
      let i = 0;
      let isFound = false;

      while (i < entries.length && !isFound) {
        const entryText = $(entries[i]).text().trim();
        if (entryText === searchTerm) {
          nextPage += $(entries[i]).attr('href');
          isFound = true;
        }
        i++;
      }
     
      if (!isFound) {
        return { 
          error: "Target variation not found", 
          details: "The specific variation was not found in the search results.", 
          searchTerm 
        };
      }

      const targetResponse = await queuedRequest({ url: nextPage, method: 'GET' });
      $ = cheerio.load(targetResponse.data);
    }

    const variantDetailsHtml = $('#id_first').html();
    const assertionListTable = $('#assertion-list').prop('outerHTML');

    if (!variantDetailsHtml || !assertionListTable) {
      return { 
        error: "Data not found", 
        details: "Required data not found in the HTML", 
        searchTerm 
      };
    }

    const variantDetails = parseVariantDetails(variantDetailsHtml);
    const assertionList = refinedClinvarHtmlTableToJson(assertionListTable);

    return {
      searchTerm,
      variantDetails,
      assertionList
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return { 
        error: "Not found", 
        details: "The requested variation was not found.", 
        searchTerm 
      };
    } else if (error.response?.status === 502) {
      return { 
        error: "Server unavailable", 
        details: "ClinVar server is currently unavailable. Please try again later.", 
        searchTerm 
      };
    } else if (error.request) {
      return { 
        error: "No response", 
        details: "No response received from ClinVar server.", 
        searchTerm 
      };
    }
    return { 
      error: "Unexpected error", 
      details: error.message, 
      searchTerm 
    };
  }
};

exports.processGeneralClinVarWebQuery = async (searchQuery, searchGroup, clinicalSignificance, startDate, endDate) => {
  const url = `https://www.ncbi.nlm.nih.gov/clinvar?term=${searchQuery}`;

  try {
    const response = await queuedRequest({ url, method: 'GET' });
    let $ = cheerio.load(response.data);

    if ($('title').text().includes('No items found')) {
      return {
        error: "No items found",
        details: "No variants match the search criteria.",
        searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`
      };
    }

    const entries = $('.blocklevelaintable');
    const aggregatedResults = [];

    // Process entries in batches
    const batchSize = 5;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batchPromises = [];
      
      for (let j = i; j < Math.min(i + batchSize, entries.length); j++) {
        const entryText = $(entries[j]).text().trim();
        const entryUrl = $(entries[j]).attr('href');
        
        const matchesSearch = Object.values(searchGroup)
          .filter(Boolean)
          .every(term => entryText.toLowerCase().includes(term.toLowerCase()));

        if (matchesSearch) {
          const variantUrl = `https://www.ncbi.nlm.nih.gov${entryUrl}`;
          batchPromises.push(
            queuedRequest({ url: variantUrl, method: 'GET' })
              .then(variantResponse => {
                const variantPage = cheerio.load(variantResponse.data);
                const variantDetailsHtml = variantPage('#id_first').html();
                const assertionListTable = variantPage('#assertion-list').prop('outerHTML');
                
                if (!variantDetailsHtml || !assertionListTable) return null;

                const variantDetails = parseVariantDetails(variantDetailsHtml);
                const assertionList = refinedClinvarHtmlTableToJson(assertionListTable);
                
                return {
                  searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`,
                  variantDetails,
                  assertionList,
                  searchGroup
                };
              })
              .catch(error => {
                console.error('Error processing variant page:', error);
                return null;
              })
          );
        }
      }

      const batchResults = await Promise.all(batchPromises);
      aggregatedResults.push(...batchResults.filter(Boolean));
    }

    if (aggregatedResults.length === 0) {
      return {
        error: "No matching variants",
        details: "No variants found matching all search terms.",
        searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`
      };
    }

    return aggregatedResults;
  } catch (error) {
    return {
      error: error.response?.status === 404 ? "Not found" : "Server error",
      details: error.message,
      searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`
    };
  }
};

exports.generateDownloadContent = (results, format) => {
  const fields = [
    "Transcript ID", "Gene Symbol", "DNA Change", "Protein Change",
    "Gene Name", "Variation ID", "Accession ID", "Classification",
    "Last Evaluated", "Assertion Criteria", "Method", "Condition",
    "Affected Status", "Allele Origin", "Submitter", "Submitter Accession",
    "First in ClinVar", "Last Updated", "Comment"
  ];

  const data = results.flatMap(result => 
    result.assertionList.map(row => ({
      "Transcript ID": result.variantDetails.transcriptID,
      "Gene Symbol": result.variantDetails.geneSymbol,
      "DNA Change": result.variantDetails.dnaChange,
      "Protein Change": result.variantDetails.proteinChange,
      "Gene Name": result.variantDetails.fullName,
      "Variation ID": result.variantDetails.variationID,
      "Accession ID": result.variantDetails.accessionID,
      "Classification": `${row.Classification.value || 'N/A'} (${row.Classification.date || 'N/A'})`,
      "Last Evaluated": row.Classification.date,
      "Assertion Criteria": row['Review status']['assertion criteria'],
      "Method": row['Review status'].method,
      "Condition": row.Condition.name,
      "Affected Status": row.Condition['Affected status'],
      "Allele Origin": row.Condition['Allele origin'],
      "Submitter": row.Submitter.name,
      "Submitter Accession": row.Submitter.Accession,
      "First in ClinVar": row.Submitter['First in ClinVar'],
      "Last Updated": row.Submitter['Last updated'],
      "Comment": row['More information'].Comment
    }))
  );

  if (format === 'csv') {
    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(data);
  } 
  else if (format === 'tsv') {
    const json2csvParser = new Parser({ fields, delimiter: '\t' });
    return json2csvParser.parse(data);
  } 
  else if (format === 'xml') {
    const builder = new xml2js.Builder({
      rootName: 'ClinVarResults',
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });
    
    const xmlObj = {
      Result: data.map(item => ({
        VariantDetails: {
          TranscriptID: item['Transcript ID'],
          GeneSymbol: item['Gene Symbol'],
          DNAChange: item['DNA Change'],
          ProteinChange: item['Protein Change'],
          GeneName: item['Gene Name'],
          VariationID: item['Variation ID'],
          AccessionID: item['Accession ID']
        },
        Classification: {
          Value: item['Classification'].split(' (')[0],
          Date: item['Last Evaluated']
        },
        ReviewStatus: {
          AssertionCriteria: item['Assertion Criteria'],
          Method: item['Method']
        },
        Condition: {
          Name: item['Condition'],
          AffectedStatus: item['Affected Status'],
          AlleleOrigin: item['Allele Origin']
        },
        Submitter: {
          Name: item['Submitter'],
          Accession: item['Submitter Accession'],
          FirstInClinVar: item['First in ClinVar'],
          LastUpdated: item['Last Updated']
        },
        Comment: item['Comment']
      }))
    };
    
    return builder.buildObject(xmlObj);
  }

  throw new Error('Unsupported format');
};

// Export all functionalities
module.exports = {
  processClinVarWebQuery: exports.processClinVarWebQuery,
  processGeneralClinVarWebQuery: exports.processGeneralClinVarWebQuery,
  generateDownloadContent: exports.generateDownloadContent,
  processClinVarData,
  extractTableData
};