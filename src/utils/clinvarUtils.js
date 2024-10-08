const cheerio = require('cheerio');

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
    details.geneSymbol = $('dl.dl-leftalign dd p:nth-child(1)').first().text().trim().split('(')[1].trim().split(')')[0].trim();

    if (details.geneSymbol && details.geneSymbol.length < 10) {
      details.dnaChange = $('dl.dl-leftalign dd p:nth-child(1)').first().text().trim().split(':')[1].trim().split(' ')[0].trim();
      details.transcriptID = $('dl.dl-leftalign dd p:nth-child(1)').first().text().trim().split('(')[0].trim();
    }
    else {
      details.geneSymbol = "";
    }

    if (details.dnaChange)
      details.proteinChange = $('dl.dl-leftalign dd p:nth-child(1)').first().text().trim().split(' (')[1].trim().split(')')[0].trim();

    details.fullName = $('dl.dl-leftalign dd p:nth-child(1)').first().text().trim();

  } catch(error) {
    console.error('Error parsing variant details:', error);
  }

  $('dl.dl-leftalign dd').each((i, el) => {
    const text = $(el).text();
    if (text.includes('Variation ID:')) {
      details.variationId = text.match(/Variation ID: (\d+)/)[1];
    }
    if (text.includes('Accession:')) {
      details.accessionId = text.match(/Accession: (VCV\d+\.\d+)/)[1];
    }
  });

  return details;
}

function refinedClinvarHtmlTableToJson(html) {
  const $ = cheerio.load(html);
  const results = [];

  let rows = $('tbody tr');

  rows.each((index, row) => {
    const $row = $(row);
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

    // Classification
    const $classificationCell = $row.find('td:nth-child(1)');
    entry.Classification.value = $classificationCell.find('.germline-submission > div').contents().first().text().trim();
    entry.Classification.date = $classificationCell.find('.smaller').last().text().trim().replace(/[()]/g, '');

    // Review status
    const $reviewStatusCell = $row.find('td:nth-child(2)');
    entry['Review status'].stars = $reviewStatusCell.find('.stars-html').text().trim();
    entry['Review status']['assertion criteria'] = $reviewStatusCell.find('.stars-description').text().trim();
    const $methodDiv = $reviewStatusCell.find('.smaller').last();
    if ($methodDiv.text().startsWith('Method:')) {
      entry['Review status'].method = $methodDiv.text().replace('Method:', '').trim();
    }

    // Condition
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

    // Submitter
    const $submitterCell = $row.find('td:nth-child(4)');
    entry.Submitter.name = $submitterCell.find('a').first().text().trim();
    const submitterDetails = $submitterCell.find('.smaller').text().trim().split('\n');
    submitterDetails.forEach(detail => {
      const [key, value] = detail.split(':').map(s => s.trim());
      if (key && value) {
        entry.Submitter[key] = value;
      }
    });

    // More information
    const $moreInfoCell = $row.find('td:nth-child(5)');
    
    // Publications
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

    // Comment
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