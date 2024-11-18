/**
 * Utility functions for parsing and processing ClinVar HTML content
 * Provides functionality to extract structured data from ClinVar web pages
 */

const cheerio = require('cheerio');

/**
 * Parses variant details from ClinVar HTML content
 * Uses optimized selectors and caching for better performance
 */
function parseVariantDetails(html) {
  const $ = cheerio.load(html, {
    xml: {
      normalizeWhitespace: true,
    },
    decodeEntities: true
  });
  
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
    // Get the full name text
    details.fullName = $('dl.dl-leftalign dd p:nth-child(1)').first().text().trim();

    // Clean up the full name
    details.fullName = details.fullName
      .replace(/\s+/g, ' ')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .trim();

    // Parse the components
    if (details.fullName) {
      // Extract transcript ID (everything before the first parenthesis)
      const transcriptMatch = details.fullName.match(/^([^(]+)/);
      if (transcriptMatch) {
        details.transcriptID = transcriptMatch[1].split(':')[0].trim();
      }

      // Extract gene symbol (first set of parentheses)
      const geneMatch = details.fullName.match(/\(([^)]+)\)/);
      if (geneMatch) {
        details.geneSymbol = geneMatch[1].trim();
      }

      // Extract DNA change (after colon, before space)
      const dnaMatch = details.fullName.match(/:([^(\s]+)/);
      if (dnaMatch) {
        details.dnaChange = dnaMatch[1].trim();
      }

      // Extract protein change (last set of parentheses)
      const proteinMatch = details.fullName.match(/\(([^)]+)\)$/);
      if (proteinMatch) {
        details.proteinChange = proteinMatch[1].trim();
      }
    }

    // Extract IDs
    $('dl.dl-leftalign dd').each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes('Variation ID:')) {
        const match = text.match(/Variation ID: (\d+)/);
        if (match) details.variationID = match[1];
      }
      if (text.includes('Accession:')) {
        const match = text.match(/Accession: (VCV\d+\.\d+)/);
        if (match) details.accessionID = match[1];
      }
    });

  } catch (error) {
    console.error('Error parsing variant details');
  }

  return details;
}

/**
 * Converts ClinVar HTML table to structured JSON format
 * Uses optimized parsing and caching for better performance
 */
function refinedClinvarHtmlTableToJson(html) {
  const $ = cheerio.load(html, {
    xml: {
      normalizeWhitespace: true
    },
    decodeEntities: false
  });
  
  const results = [];
  const $rows = $('tbody tr');

  $rows.each((_, row) => {
    const $row = $(row);
    const entry = {
      Classification: {},
      'Review status': {
        stars: '',
        'assertion criteria': '',
        method: '',
        'submission_reference': ''
      },
      Condition: {},
      Submitter: {},
      'More information': {
        Publications: {},
        'Other databases': {},
        Comment: ''
      }
    };

    // Cache cell selections
    const $cells = $row.find('td');
    
    // Classification (1st column)
    const $classificationCell = $cells.eq(0);
    entry.Classification.value = $classificationCell.find('.germline-submission > div').contents().first().text().trim();
    entry.Classification.date = $classificationCell.find('.smaller').last().text().trim().replace(/[()]/g, '');

    // Review status (2nd column)
    const $reviewCell = $cells.eq(1);
    entry['Review status'].stars = $reviewCell.find('.stars-html').text().trim();
    entry['Review status']['assertion criteria'] = $reviewCell.find('.stars-description').text().trim();

    const $refLink = $reviewCell.find('a[data-ga-label="germline submissions AC"]');
    if ($refLink.length) {
      const refText = $refLink.text().trim();
      const href = $refLink.attr('href');
      if (href) {
        const pubmedId = href.split('/').pop();
        entry['Review status'].submission_reference = href.includes('pubmed') ?
          `${refText} (Pubmed: ${pubmedId})` :
          `${refText} (${pubmedId})`;
      }
    }

    const $methodDiv = $reviewCell.find('.smaller').last();
    if ($methodDiv.text().startsWith('Method:')) {
      entry['Review status'].method = $methodDiv.text().replace('Method:', '').trim();
    }

    // Condition (3rd column)
    const $conditionCell = $cells.eq(2);
    const conditionText = $conditionCell.find('a').first().text().trim();
    entry.Condition.name = conditionText.includes(':') ? 
      conditionText.split(':')[1].trim() : 
      conditionText;
    
    $conditionCell.find('.smaller').each((_, el) => {
      const text = $(el).text().trim();
      if (text.startsWith('Affected status:')) {
        entry.Condition['Affected status'] = text.replace('Affected status:', '').trim();
      } else if (text.startsWith('Allele origin:')) {
        entry.Condition['Allele origin'] = text.replace('Allele origin:', '').trim();
      }
    });

    // Submitter (4th column)
    const $submitterCell = $cells.eq(3);
    entry.Submitter.name = $submitterCell.find('a').first().text().trim();
    $submitterCell.find('.smaller').text().trim().split('\n').forEach(detail => {
      const [key, value] = detail.split(':').map(s => s.trim());
      if (key && value) {
        entry.Submitter[key] = value;
      }
    });

    // More information (5th column)
    const $moreInfoCell = $cells.eq(4);
    
    // Publications with caching
    const $pubLinks = $moreInfoCell.find('dl.submit-evidence a');
    $pubLinks.each((_, el) => {
      const $link = $(el);
      const pubText = $link.text().trim();
      const pubType = pubText.split('(')[0].trim();
      
      if (pubType && !pubType.match(/^\d+$/)) {
        const $pubDetails = $link.closest('dd').find('.pubmed-details');
        if ($pubDetails.length) {
          const pubId = $pubDetails.text().split(':')[1]?.trim();
          if (pubId) {
            entry['More information'].Publications[pubType] = pubId;
          }
        }
      }
    });

    // Comments with optimized parsing
    let comment = '';
    const $fullComment = $moreInfoCell.find('.full_comment');
    
    if ($fullComment.length) {
      comment = $fullComment.text().replace('(less)', '').trim();
    } else {
      $moreInfoCell.find('.smaller').each((_, el) => {
        const $el = $(el);
        if ($el.find('span:contains("Comment")').length > 0) {
          comment = $el.clone()
            .children('span:contains("Comment")')
            .remove()
            .end()
            .text()
            .trim();
        }
      });
    }

    entry['More information'].Comment = comment;
    results.push(entry);
  });

  return results;
}

module.exports = {
  parseVariantDetails,
  refinedClinvarHtmlTableToJson
};