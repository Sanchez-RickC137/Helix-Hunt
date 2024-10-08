const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseVariantDetails, refinedClinvarHtmlTableToJson } = require('./src/utils/clinvarUtils');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/clinvar', async (req, res) => {
  console.log('Received request:', JSON.stringify(req.body, null, 2));
  
  try {
    const { fullName, variantId, clinicalSignificance, outputFormat, startDate, endDate } = req.body;
    let url;
    let searchTerm;
    if (variantId) {
      url = `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variantId}/`;
      console.log('Using Variant ID URL:', url);
    } else if (fullName) {
      url = `https://www.ncbi.nlm.nih.gov/clinvar?term=${encodeURIComponent(fullName)}`;
      searchTerm = fullName;
      console.log('Using Full Name URL:', url);
    } else {
      console.log('Error: Neither full name nor variant ID provided');
      return res.status(400).json({ error: 'Either full name or variant ID is required' });
    }
      
    console.log(`Fetching data from URL: ${url}`);

    const response = await axios.get(url);
    console.log('Response received, status:', response.status);
    
    let $ = cheerio.load(response.data);

    if ($('title').text().substring(0, 3) !== "VCV") {
      console.log('On search results page, looking for correct link');
      const entries = $('.blocklevelaintable');
      let nextPage = "https://www.ncbi.nlm.nih.gov";
      let i = 0;
      let isFound = false;
      while (i < entries.length && !isFound) {
        const entryText = $(entries[i]).text().trim();
        console.log(`Checking entry ${i}: ${entryText}`);
        if (entryText === searchTerm) {
          nextPage += $(entries[i]).attr('href');
          isFound = true;
          console.log('Found correct link:', nextPage);
        } else {
          i++;
        }
      }
      
      if (!isFound) {
        console.log('Error: Target variation not found');
        return res.status(404).json({ error: 'Target variation not found' });
      }

      console.log('Fetching target page:', nextPage);
      const targetResponse = await axios.get(nextPage);
      console.log('Target page received, status:', targetResponse.status);
      $ = cheerio.load(targetResponse.data);
    } else {
      console.log('Already on target page');
    }

    const variantDetailsHtml = $('#id_first').html();
    const assertionListTable = $('#assertion-list').prop('outerHTML');

    if (!variantDetailsHtml || !assertionListTable) {
      console.log('Error: Required data not found in the HTML');
      return res.status(404).json({ error: 'Required data not found' });
    }

    console.log('Data extracted successfully');

    // Process the data using the utility functions
    const variantDetails = parseVariantDetails(variantDetailsHtml);
    const assertionList = refinedClinvarHtmlTableToJson(assertionListTable);

    // Prepare the processed data to send to the frontend
    const processedData = {
      variantDetails,
      assertionList
    };

    res.json(processedData);
  } catch (error) {
    console.error('Error fetching ClinVar data:', error);
    res.status(500).json({ error: 'An error occurred while fetching data', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});