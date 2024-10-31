/**
 * Utility functions for parsing and processing ClinVar HTML content
 * Provides functionality to extract structured data from ClinVar web pages
 */

const cheerio = require('cheerio');

/**
 * Parses variant details from ClinVar HTML content
 * Extracts information such as gene names, transcript IDs, and variation details
 * 
 * @param {string} html - HTML content from ClinVar variant page
 * @returns {object} Parsed variant details including:
 *   - fullName: Complete variant name
 *   - transcriptID: Transcript identifier
 *   - geneSymbol: Gene symbol/name
 *   - dnaChange: DNA sequence change
 *   - proteinChange: Protein sequence change
 *   - variationID: ClinVar variation ID
 *   - accessionID: ClinVar accession ID
 */
function parseVariantDetails(html) {
  const $ = cheerio.load(html);
  const details = {
    fullName: "",
    transcriptID: "",
    geneSymbol: "",
    dnaChange: "",
    proteinChange: "",
    variationID: "",
    accessionID: "",
  };

  try {
    // Extract full name from first paragraph
    details.fullName = $('dl.dl-leftalign dd p:nth-child(1)').first().text().trim();

    // Parse complex identifier string if it matches expected format
    if (details.fullName.includes(":") && details.fullName.includes("(") && 
        details.fullName.includes(")") && details.fullName.includes(">")) {
      // Extract gene symbol from parentheses
      details.geneSymbol = $('dl.dl-leftalign dd p:nth-child(1)')
        .first()
        .text()
        .trim()
        .split('(')[1]
        .trim()
        .split(')')[0]
        .trim() || "";

      // Only process if gene symbol is valid (less than 10 characters)
      if (details.geneSymbol && details.geneSymbol.length < 10) {
        // Extract DNA change and transcript ID
        details.dnaChange = $('dl.dl-leftalign dd p:nth-child(1)')
          .first()
          .text()
          .trim()
          .split(':')[1]
          .trim()
          .split(' ')[0]
          .trim() || "";
        details.transcriptID = $('dl.dl-leftalign dd p:nth-child(1)')
          .first()
          .text()
          .trim()
          .split('(')[0]
          .trim() || "";
      }
      else {
        details.geneSymbol = "";
      }

      // Extract protein change if DNA change is present
      if (details.dnaChange)
        details.proteinChange = $('dl.dl-leftalign dd p:nth-child(1)')
          .first()
          .text()
          .trim()
          .split(' (')[1]
          .trim()
          .split(')')[0]
          .trim();
    }
  } catch(error) {
    console.error('Error parsing variant details:', error);
  }

  // Extract variation ID and accession ID from definition list
  $('dl.dl-leftalign dd').each((i, el) => {
    const text = $(el).text();
    if (text.includes('Variation ID:')) {
      details.variationID = text.match(/Variation ID: (\d+)/)[1];
    }
    if (text.includes('Accession:')) {
      details.accessionID = text.match(/Accession: (VCV\d+\.\d+)/)[1];
    }
  });

  return details;
}

/**
 * Converts ClinVar HTML table to structured JSON format
 * Parses clinical significance, review status, conditions, and submitter information
 * 
 * @param {string} html - HTML content of ClinVar assertion table
 * @returns {Array<object>} Array of structured data for each table row containing:
 *   - Classification: Clinical significance and evaluation date
 *   - Review status: Review criteria and method
 *   - Condition: Associated conditions and affected status
 *   - Submitter: Submission details and dates
 *   - More information: Additional details including publications and comments
 */
function refinedClinvarHtmlTableToJson(html) {
  const $ = cheerio.load(html);
  const results = [];

  let rows = $('tbody tr');

  rows.each((index, row) => {
    const $row = $(row);
    // Initialize entry object with all expected sections
    const entry = {
      Classification: {},
      'Review status': {},
      Condition: {},
      Submitter: {},
      'More information': {
        Publications: {},
        'Other databases': {},
        Comment: ''
      }
    };

    // Parse Classification column
    const $classificationCell = $row.find('td:nth-child(1)');
    entry.Classification.value = $classificationCell
      .find('.germline-submission > div')
      .contents()
      .first()
      .text()
      .trim();
    entry.Classification.date = $classificationCell
      .find('.smaller')
      .last()
      .text()
      .trim()
      .replace(/[()]/g, '');

    // Parse Review status column
    const $reviewStatusCell = $row.find('td:nth-child(2)');
    entry['Review status'].stars = $reviewStatusCell.find('.stars-html').text().trim();
    entry['Review status']['assertion criteria'] = $reviewStatusCell
      .find('.stars-description')
      .text()
      .trim();
    const $methodDiv = $reviewStatusCell.find('.smaller').last();
    if ($methodDiv.text().startsWith('Method:')) {
      entry['Review status'].method = $methodDiv.text().replace('Method:', '').trim();
    }

    // Parse Condition column
    const $conditionCell = $row.find('td:nth-child(3)');
    entry.Condition.name = $conditionCell.find('a').first().text().trim();
    $conditionCell.find('.smaller').each((i, el) => {
      const text = $(el).text().trim();
      if (text.startsWith('Affected status:')) {
        entry.Condition['Affected status'] = text.replace('Affected status:', '').trim();
      } else if (text.startsWith('Allele origin:')) {
        entry.Condition['Allele origin'] = text.replace('Allele origin:', '').trim();
      }
    });

    // Parse Submitter column
    const $submitterCell = $row.find('td:nth-child(4)');
    entry.Submitter.name = $submitterCell.find('a').first().text().trim();
    const submitterDetails = $submitterCell.find('.smaller').text().trim().split('\n');
    submitterDetails.forEach(detail => {
      const [key, value] = detail.split(':').map(s => s.trim());
      if (key && value) {
        entry.Submitter[key] = value;
      }
    });

    // Parse More information column
    const $moreInfoCell = $row.find('td:nth-child(5)');
    
    // Extract publications
    $moreInfoCell.find('dl.submit-evidence a').each((i, el) => {
      const $link = $(el);
      const pubText = $link.text().trim();
      const pubType = pubText.split('(')[0].trim();
      if (pubType && !pubType.match(/^\d+$/)) {
        const $pubDetailsDiv = $link.closest('dd').find('.pubmed-details');
        if ($pubDetailsDiv.length) {
          const pubDetails = $pubDetailsDiv.text().trim();
          const pubId = pubDetails.split(':')[1]?.trim();
          entry['More information'].Publications[pubType] = pubId;
        }
      }
    });

    // Extract comments
    const $commentDiv = $moreInfoCell.find('.obs-single');
    if ($commentDiv.length) {
      entry['More information'].Comment = $commentDiv.text().replace('Comment:', '').trim();
    }

    results.push(entry);
  });

  return results;
}

module.exports = {
  parseVariantDetails,
  refinedClinvarHtmlTableToJson
};