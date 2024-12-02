const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs/promises');
const { program } = require('commander');

const CLINVAR_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

program
  .name('clinvar-fetcher')
  .description('Fetch and parse ClinVar variation data')
  .option('-i, --ids <numbers...>', 'variation IDs to fetch (space-separated)')
  .option('-f, --file <path>', 'path to file containing variation IDs (one per line)')
  .option('-o, --output <path>', 'output file path (default: clinvar_results.json)')
  .parse();

const options = program.opts();

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

  try {
    const results = await fetchClinVarData(variationIds);
    console.log(`Found ${results.length} assertions`);
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    console.log(`Results written to ${outputPath}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function timedExecution(fn) {
  const startTime = Date.now();

  try {
    const result = await fn();
    const endTime = Date.now();
    console.log(`Execution completed in ${(endTime - startTime) / 1000} seconds`);
    return result;
  } catch (error) {
    const endTime = Date.now();
    console.error(`Execution failed after ${(endTime - startTime) / 1000} seconds`);
    throw error;
  }
}

async function fetchChunkWithRetry(chunk, parser, retries = 10, delay = 1000) {
  const url = `${CLINVAR_BASE_URL}?db=clinvar&rettype=vcv&is_variationid&id=${chunk.join(',')}&from_esearch=true`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url);
      const xmlData = parser.parse(response.data);
      return parseResults(xmlData); // Assume `parseResults` is defined elsewhere
    } catch (error) {
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay)); // Delay before retrying
        delay *= 2; // Exponential backoff
      } else {
        console.error(`Failed to fetch chunk [${chunk.join(',')}] after ${retries} attempts.`);
        return []; // Skip this chunk after max retries
      }
    }
  }
}

async function fetchClinVarData(variationIds) {
  const chunkSize = 100;
  const chunks = [];

  // Break IDs into chunks
  for (let i = 0; i < variationIds.length; i += chunkSize) {
    chunks.push(variationIds.slice(i, i + chunkSize));
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: 'text',
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true,
    cdataParse: true,
    isArray: (name) => {
      const tags = ['ClinicalAssertion', 'ElementValue', 'AttributeSet', 'Citation'];
      return tags.includes(name);
    }
  });

  const results = await timedExecution(async () =>
    Promise.all(
      chunks.map(chunk => fetchChunkWithRetry(chunk, parser))
    )
  );

  // Flatten the results
  return results.flat();
}

(async function main() {
  const variationIds = [/* variation IDs here */];

  try {
    const results = await fetchClinVarData(variationIds);
    console.log(`Total assertions fetched: ${results.length}`);
  } catch (error) {
    console.error('Error fetching ClinVar data:', error.message);
  }
})();

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
    // Get classification details
    const germlineClass = assertion.Classification?.GermlineClassification;
    const dateEval = assertion.Classification?.DateLastEvaluated;
    const classificationStr = `${germlineClass || 'N/A'} (${dateEval || 'N/A'})`;
    
    // Get assertion method and reference info
    const assertionRef = extractAssertionReference(assertion);
    
    // Get review status (AssertionCriteria)
    const reviewStatus = assertion.Classification?.ReviewStatus || 'N/A';
    
    // Get method type
    const methodType = assertion.ObservedInList?.ObservedIn?.Method?.MethodType || 'N/A';
    
    // Get condition
    const condition = extractCondition(assertion);
    
    // Get all potential comment sources
    const comments = [
      // Description from ObservedData
      assertion.ObservedInList?.ObservedIn?.ObservedData?.Attribute?.text == 'not provided' ? '' : assertion.ObservedInList?.ObservedIn?.ObservedData?.Attribute?.text,
      
      // Comment from Classification
      assertion.Classification?.Comment?.text || assertion.Classification?.Comment
    ].filter(Boolean); // Remove null/undefined values

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

  // Ensure we're working with an array
  const attributeSets = Array.isArray(assertion.AttributeSet) 
    ? assertion.AttributeSet 
    : [assertion.AttributeSet];

  for (const attrSet of attributeSets) {
    if (attrSet.Attribute && attrSet.Attribute.Type === 'AssertionMethod') {
      const method = attrSet.Attribute.text;
      // Fix: Get PMID from Citation array's first element's ID
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