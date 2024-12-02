const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs/promises');
const { program } = require('commander');
const https = require('https');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const CLINVAR_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

program
  .name('clinvar-fetcher')
  .description('Fetch and parse ClinVar variation data')
  .option('-i, --ids <numbers...>', 'variation IDs to fetch (space-separated)')
  .option('-f, --file <path>', 'path to file containing variation IDs (one per line)')
  .option('-o, --output <path>', 'output file path (default: clinvar_results.json)')
  .option('-c, --concurrent <number>', 'maximum concurrent requests (default: 10)', parseInt, 10)
  .option('-s, --chunk-size <number>', 'IDs per request (default: 250)', parseInt, 250)
  .parse();

const options = program.opts();

// Configure reusable HTTPS agent
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: options.concurrent || 10,
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

async function main() {
  let variationIds = [];

  if (options.file) {
    variationIds = await readIdsFromFile(options.file);
  } else if (options.ids) {
    variationIds = options.ids.map(Number);
  } else {
    console.error('Please provide variation IDs either via --ids or --file');
    process.exit(1);
  }

  const outputPath = options.output || 'clinvar_results.json';
  console.log(`Processing ${variationIds.length} variation IDs...`);

  try {
    const results = await fetchClinVarData(variationIds, options.chunkSize || 250, options.concurrent || 10);
    console.log(`Found ${results.length} assertions`);
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    console.log(`Results written to ${outputPath}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function fetchClinVarData(variationIds, chunkSize = 250, maxConcurrent = 10) {
  console.time('Total execution');
  const chunks = [];
  let processedCount = 0;
  const results = [];
  const RATE_LIMIT_DELAY = 100; // ms between requests

  // Break into chunks
  for (let i = 0; i < variationIds.length; i += chunkSize) {
    chunks.push(variationIds.slice(i, i + chunkSize));
  }

  // Process chunks with concurrency control
  for (let i = 0; i < chunks.length; i += maxConcurrent) {
    const batch = chunks.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (chunk, index) => {
        await new Promise(r => setTimeout(r, index * RATE_LIMIT_DELAY));
        const chunkResult = await fetchChunkWithRetry(chunk);
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

async function fetchChunkWithRetry(chunk, retries = 10, baseDelay = 1000) {
  const url = `${CLINVAR_BASE_URL}?db=clinvar&rettype=vcv&is_variationid&id=${chunk.join(',')}&from_esearch=true`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await api.get(url);
      if (!response.data.includes('VariationArchive')) {
        throw new Error('Invalid response format');
      }
      
      if (!isMainThread) {
        return parseResultsParallel(response.data);
      }
      return parseResults(parser.parse(response.data));
    } catch (error) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Attempt ${attempt}/${retries} failed for chunk. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      
      if (attempt === retries) {
        console.error(`Failed chunk [${chunk[0]}...${chunk[chunk.length-1]}] after ${retries} attempts`);
        return [];
      }
    }
  }
}

function parseResultsParallel(xmlData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { xmlData }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

function parseResults(xmlData) {
  const results = [];
  const archives = Array.isArray(xmlData['ClinVarResult-Set'].VariationArchive) 
    ? xmlData['ClinVarResult-Set'].VariationArchive 
    : [xmlData['ClinVarResult-Set'].VariationArchive];

  for (const archive of archives) {
    const variantDetails = extractVariantDetails(archive);
    const assertions = extractClinicalAssertions(archive);

    assertions.forEach(assertion => {
      results.push({
        SearchTerm: variantDetails.Name,
        TranscriptID: variantDetails.TranscriptID,
        GeneSymbol: variantDetails.GeneSymbol,
        DNAChange: variantDetails.DNAChange,
        ProteinChange: variantDetails.ProteinChange,
        GeneName: variantDetails.Name,
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

  return results;
}

function extractVariantDetails(archive) {
  const name = archive.VariationName;
  const matches = name.match(/NM_[\d.]+\(([\w]+)\):c\.([\w>]+)\s+\((p\.[\w]+)\)/);

  console.log("VCVAccession: ", archive.Accession);
  console.log("FirstInClinVar: ", archive.DateCreated);
  
  return {
    Name: name,
    TranscriptID: matches ? name.split('(')[0] : 'N/A',
    GeneSymbol: matches ? matches[1] : 'N/A',
    DNAChange: matches ? `c.${matches[2]}` : 'N/A',
    ProteinChange: matches ? matches[3] : 'N/A',
    VCVAccession: archive.Accession || 'N/A',
    FirstInClinVar: archive.DateCreated || 'N/A',
    MostRecentSubmission: archive.MostRecentSubmission || 'N/A'
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