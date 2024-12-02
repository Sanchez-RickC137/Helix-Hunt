const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs/promises');
const { program } = require('commander');
const https = require('https');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const CLINVAR_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const ESEARCH_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';

program
  .name('clinvar-fetcher')
  .description('Fetch and parse ClinVar variation data')
  .option('-i, --ids <numbers...>', 'variation IDs to fetch (space-separated)')
  .option('-f, --file <path>', 'path to file containing variation IDs (one per line)')
  .option('-g, --gene <symbol>', 'gene symbol to search')
  // Escape the > in the example
  .option('-d, --dna <change>', 'DNA change to search (e.g., "c.449G>A")')
  .option('-p, --protein <change>', 'protein change to search')
  .option('-o, --output <path>', 'output file path (default: clinvar_results.json)')
  .option('-c, --concurrent <number>', 'maximum concurrent requests (default: 10)', parseInt, 10)
  .option('-s, --chunk-size <number>', 'IDs per request (default: 250)', parseInt, 250)
  .parse(process.argv);

// Configure reusable HTTPS agent
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: program.opts().concurrent || 10,
  maxFreeSockets: 10,
  timeout: 30000
});

// Configure axios instance
const api = axios.create({
  httpsAgent: agent,
  timeout: 30000,
  headers: {
    'Accept-Encoding': 'gzip',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (compatible; HelixHunt/1.0; +http://example.com)'
  }
});

// Configure XML parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  cdataParse: true,
  isArray: (name) => ['ClinicalAssertion', 'ElementValue', 'AttributeSet', 'Citation'].includes(name)
});

async function readIdsFromFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !isNaN(line))
    .map(Number);
}

async function constructSearchAndFetch({geneSymbol, dnaChange, proteinChange}) {
  // Gene-only search handling
  if (geneSymbol && !dnaChange && !proteinChange) {
    // Try with [gene] tag first
    let variationIds = await fetchVariationIdsWithRetry(`${ESEARCH_BASE_URL}?db=clinvar&term=${geneSymbol}[gene]&retmax=20000`);
    
    // If no results, retry without [gene] tag
    if (variationIds.length === 0) {
      console.log(`No results found with [gene] tag for ${geneSymbol}, retrying without tag...`);
      variationIds = await fetchVariationIdsWithRetry(`${ESEARCH_BASE_URL}?db=clinvar&term=${geneSymbol}&retmax=20000`);
    }
    
    return variationIds;
  }

  // Build search terms for other searches
  const searchTerms = [];
  if (geneSymbol) searchTerms.push(`(${geneSymbol}[gene])`);
  if (dnaChange) searchTerms.push(`(${encodeURIComponent(dnaChange)}[text])`);
  if (proteinChange) searchTerms.push(`(${proteinChange}[text])`);

  const searchUrl = `${ESEARCH_BASE_URL}?db=clinvar&term=${searchTerms.join('%20AND%20')}&retmax=500`;
  console.log('Search URL:', searchUrl);
  return fetchVariationIdsWithRetry(searchUrl);
}

async function fetchVariationIdsWithRetry(url, maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await api.get(url);
      if (!response.data.includes('<IdList>')) {
        throw new Error('Invalid response format');
      }
      
      const result = parser.parse(response.data);
      const ids = result.eSearchResult?.IdList?.Id || [];
      return Array.isArray(ids) ? ids : [ids];
    } catch (error) {
      console.warn(`Attempt ${attempt}/${maxRetries} failed. ${error.message}`);
      if (attempt === maxRetries) {
        console.error('Failed to fetch variation IDs after all retries');
        return [];
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return [];
}

async function main() {
  let variationIds = [];
  const options = program.opts();

  // Check if we're doing a search or using direct IDs
  if (options.gene || options.dna || options.protein) {
    // Search mode
    const searchCriteria = {
      geneSymbol: options.gene,
      dnaChange: options.dna,
      proteinChange: options.protein
    };

    console.log('Searching ClinVar with criteria:', searchCriteria);
    variationIds = await constructSearchAndFetch(searchCriteria);
    
    if (variationIds.length === 0) {
      console.error('No matching variations found');
      process.exit(1);
    }

    console.log(`Found ${variationIds.length} matching variations`);
  } else if (options.file) {
    variationIds = await readIdsFromFile(options.file);
  } else if (options.ids) {
    variationIds = options.ids.map(Number);
  } else {
    console.error('Please provide either search criteria or variation IDs');
    process.exit(1);
  }

  const outputPath = options.output || 'clinvar_results.json';
  console.log(`Processing ${variationIds.length} variation IDs...`);

  try {
    const searchCriteria = {
      geneSymbol: options.gene,
      dnaChange: options.dna,
      proteinChange: options.protein
    };

    const results = await fetchClinVarData(
      variationIds, 
      options.chunkSize || 250, 
      options.concurrent || 10,
      searchCriteria
    );
    
    console.log(`Found ${results.length} matching assertions`);
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    console.log(`Results written to ${outputPath}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function validateVariationResult(result, searchCriteria) {
  // Skip validation for gene-only searches
  if (!searchCriteria || 
      (searchCriteria.geneSymbol && !searchCriteria.dnaChange && !searchCriteria.proteinChange)) {
    return true;
  }

  const molecularName = result.Name || '';
  const starAlleleName = result.Name2 || '';

  const { dnaChange, proteinChange } = searchCriteria;

  if (dnaChange && 
      !(molecularName.includes(dnaChange) || starAlleleName.includes(dnaChange))) {
    return false;
  }

  if (proteinChange && 
      !(molecularName.includes(proteinChange) || starAlleleName.includes(proteinChange))) {
    return false;
  }

  return true;
}

async function fetchClinVarData(variationIds, chunkSize = 250, maxConcurrent = 10, searchCriteria = null) {
  console.time('Total execution');
  const chunks = [];
  let processedCount = 0;
  const results = [];
  const RATE_LIMIT_DELAY = 300; // ms between requests

  // Check if this is a gene-only search
  const isGeneOnlySearch = searchCriteria?.geneSymbol && 
                          !searchCriteria?.dnaChange && 
                          !searchCriteria?.proteinChange;

  // Break into chunks
  for (let i = 0; i < variationIds.length; i += chunkSize) {
    chunks.push(variationIds.slice(i, i + chunkSize));
  }

  console.log(`Split ${variationIds.length} IDs into ${chunks.length} chunks of size ${chunkSize}`);

  // Process chunks with concurrency control
  for (let i = 0; i < chunks.length; i += maxConcurrent) {
    const batch = chunks.slice(i, Math.min(i + maxConcurrent, chunks.length));
    console.log(`Processing batch ${i/maxConcurrent + 1} of ${Math.ceil(chunks.length/maxConcurrent)}`);
    
    const batchResults = await Promise.all(
      batch.map(async (chunk, index) => {
        await new Promise(r => setTimeout(r, index * RATE_LIMIT_DELAY));
        // Pass isGeneOnlySearch flag to skip validation for gene-only searches
        const chunkResult = await fetchChunkWithRetry(chunk, isGeneOnlySearch ? null : searchCriteria);
        processedCount += chunk.length;
        console.log(`Processed ${processedCount}/${variationIds.length} IDs (${Math.round(processedCount/variationIds.length*100)}%)`);
        return chunkResult;
      })
    );
    results.push(...batchResults.flat());
  }

  console.timeEnd('Total execution');
  return results;
}

async function fetchChunkWithRetry(chunk, searchCriteria = null, retries = 10, baseDelay = 1000) {
  console.log(`Processing chunk of ${chunk.length} IDs...`);
  
  const url = `${CLINVAR_BASE_URL}?db=clinvar&rettype=vcv&is_variationid&id=${chunk.join(',')}&from_esearch=true`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await api.get(url);
      if (!response.data.includes('VariationArchive')) {
        throw new Error('Invalid response format');
      }
      
      if (!isMainThread) {
        return parseResultsParallel(response.data, searchCriteria);
      }
      return parseResults(parser.parse(response.data), searchCriteria);
    } catch (error) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Attempt ${attempt}/${retries} failed for chunk of ${chunk.length} IDs. Retrying in ${delay}ms...`);
      console.warn(`Error: ${error.message}`);
      
      if (attempt === retries) {
        console.error(`Failed chunk after ${retries} attempts`);
        return [];
      }
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function parseResultsParallel(xmlData, searchCriteria) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { xmlData, searchCriteria }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

function parseResults(xmlData, searchCriteria) {
	const results = [];
	if (!xmlData['ClinVarResult-Set']?.VariationArchive) {
	  console.log('No variation archives found in response');
	  return results;
	}
  
	const archives = Array.isArray(xmlData['ClinVarResult-Set'].VariationArchive) 
	  ? xmlData['ClinVarResult-Set'].VariationArchive 
	  : [xmlData['ClinVarResult-Set'].VariationArchive];
  
	console.log(`Processing ${archives.length} variation archives`);
	
	let validCount = 0;
	for (const archive of archives) {
	  const variantDetails = extractVariantDetails(archive);
	  
	  // Validate result against search criteria if provided
	  if (searchCriteria) {
		if (!validateVariationResult(variantDetails, searchCriteria)) {
		  continue;
		}
		validCount++;
	  }
  
	  const assertions = extractClinicalAssertions(archive);
	  assertions.forEach(assertion => {
		results.push({
		  SearchTerm: variantDetails.Name,
		  TranscriptID: variantDetails.TranscriptID,
		  GeneSymbol: variantDetails.GeneSymbol,
		  DNAChange: variantDetails.DNAChange,
		  ProteinChange: variantDetails.ProteinChange,
		  GeneName: variantDetails.Name,
      AlleleName: variantDetails.Name2,
		  VariationID: archive.VariationID,
		  AccessionID: variantDetails.VCVAccession,
		  Classification: assertion.classification,
		  LastEvaluated: assertion.dateEvaluated,
		  AssertionReference: assertion.assertionReference,
		  AssertionCriteria: assertion.reviewStatus,
		  Method: assertion.methodType,
		  Condition: assertion.condition,
		  AffectedStatus: assertion.affectedStatus,
		  AlleleOrigin: assertion.origin,
		  Submitter: assertion.submitter,
		  SubmitterAccession: assertion.submitterAccession,
		  FirstInClinVar: variantDetails.FirstInClinVar,
		  MostRecentSubmission: variantDetails.MostRecentSubmission,
		  LastUpdated: assertion.lastUpdated,
		  Comment: assertion.comment
		});
	  });
	}
  
	// console.log(`Validated ${validCount} variations out of ${archives.length}`);
	// console.log(`Generated ${results.length} assertion records`);
	
	return results;
  }

  function extractVariantDetails(archive) {
    const variationName = archive.VariationName;
    const molecularName = archive.ClassifiedRecord?.Haplotype?.SimpleAllele?.Name;
  
    // Extract details from the most appropriate name
    const name = molecularName || variationName; // Prefer molecular name when available
    const matches = name.match(/NM_[\d.]+\(([\w]+)\):c\.([\w>]+)\s+\((p\.[\w]+)\)/);
    
    return {
      Name: molecularName || '',  // Molecular description
      Name2: variationName || '', // Star allele or other variation name
      TranscriptID: matches ? name.split('(')[0] : 'N/A',
      GeneSymbol: matches ? matches[1] : 'N/A',
      DNAChange: matches ? `c.${matches[2]}` : 'N/A',
      ProteinChange: matches ? matches[3] : 'N/A',
      VCVAccession: archive.Accession || 'N/A',
      FirstInClinVar: archive.DateCreated || 'N/A',
      MostRecentSubmission: archive.DateLastUpdated || 'N/A'
    };
  }

function extractClinicalAssertions(archive) {
  const assertions = [];
  const clinicalAssertions = archive.ClassifiedRecord?.ClinicalAssertionList?.ClinicalAssertion || [];
  const assertionArray = Array.isArray(clinicalAssertions) ? clinicalAssertions : [clinicalAssertions];

  assertionArray.forEach(assertion => {
    const germlineClass = assertion.Classification?.GermlineClassification;
    const dateEval = assertion.Classification?.DateLastEvaluated;
    const classificationStr = `${germlineClass || 'N/A'} (${dateEval || 'N/A'})`;
    const assertionRef = extractAssertionReference(assertion);
    const reviewStatus = assertion.Classification?.ReviewStatus || 'N/A';
    const methodType = assertion.ObservedInList?.ObservedIn?.Method?.MethodType || 'N/A';
    const condition = extractCondition(assertion);
    const comments = [
      assertion.ObservedInList?.ObservedIn?.ObservedData?.Attribute?.text == 'not provided' ? '' : assertion.ObservedInList?.ObservedIn?.ObservedData?.Attribute?.text,
      assertion.Classification?.Comment?.text || assertion.Classification?.Comment
    ].filter(Boolean);

    assertions.push({
      classification: classificationStr,
      dateEvaluated: dateEval || 'N/A',
      submissionDate: assertion.SubmissionDate || 'N/A',
      lastUpdated: assertion.DateLastUpdated || 'N/A',
      created: assertion.DateCreated || 'N/A',
      reviewStatus,
      methodType,
      condition,
      affectedStatus: assertion.ObservedInList?.ObservedIn?.Sample?.AffectedStatus || 'N/A',
      origin: extractOrigin(assertion),
      submitter: assertion.ClinVarAccession?.SubmitterName || 'N/A',
      submitterAccession: `${assertion.ClinVarAccession?.Accession || 'N/A'}.${assertion.ClinVarAccession?.Version || '1'}`,
      comment: comments.length > 0 ? comments.join(' ') : '-',
      assertionReference: assertionRef
    });
  });

  return assertions;
}

function extractCondition(assertion) {
	const trait = assertion.TraitSet?.Trait?.Name?.ElementValue;
	if (!trait) return 'N/A';
	
	const traitArray = Array.isArray(trait) ? trait : [trait];
	const preferred = traitArray.find(t => t.Type === 'Preferred');
	return preferred?.text || traitArray[0]?.text || 'N/A';
  }
  
  function extractOrigin(assertion) {
	const origin = assertion.ObservedInList?.ObservedIn?.Sample?.Origin || 'N/A';
	const species = assertion.ObservedInList?.ObservedIn?.Sample?.Species || 'na';
	return `${origin}:${species}`;
  }
  
  function extractAssertionReference(assertion) {
	if (!assertion.AttributeSet) {
	  return 'N/A';
	}
  
	const attributeSets = Array.isArray(assertion.AttributeSet) 
	  ? assertion.AttributeSet 
	  : [assertion.AttributeSet];
  
	for (const attrSet of attributeSets) {
	  if (attrSet.Attribute && attrSet.Attribute.Type === 'AssertionMethod') {
		const method = attrSet.Attribute.text;
		const citations = attrSet.Citation;
		let pmid = null;
		
		if (Array.isArray(citations)) {
		  const citation = citations[0];
		  if (citation?.ID?.Source === 'PubMed') {
			pmid = citation.ID.text;
		  }
		}
		
		if (method && pmid) {
		  return `${method} (PMID: ${pmid})`;
		} else if (method) {
		  return method;
		}
	  }
	}
  
	return 'N/A';
  }
  
  if (require.main === module) {
	main();
  }
  
  module.exports = { fetchClinVarData };