const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/clinvar', async (req, res) => {
  console.log('Received request:', JSON.stringify(req.body, null, 2));
  
  try {
    const { fullName, variantId } = req.body;
    console.log(fullName);
    /**
     * 1. Will hold full URL for query
     * 2. Check if variant ID being utilized 
     * 3. If a variant ID is not present, must be using full name
     **/
    let url; // 1
    let searchTerm;
    if (variantId) { // 2
      url = `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variantId}/`;
      console.log('Using Variant ID URL:', url); // Console debug
    } else if (fullName) { // 3
      url = `https://www.ncbi.nlm.nih.gov/clinvar?term=${encodeURIComponent(fullName)}`;
      searchTerm = fullName;
      console.log('Using Full Name URL:', url); // Console debug
    } else {
      console.log('Error: Neither full name nor variant ID provided'); // Console debug
      return res.status(400).json({ error: 'Either full name or variant ID is required' }); // Server debug
    }
      
    console.log(`Fetching data from URL: ${url}`);

    const response = await axios.get(url);
    console.log('Response received, status:', response.status);
    
    let $ = cheerio.load(response.data);

    /**
     * 1. Check if we're on the target page or a search results page. VCV indicates target page
     * 2. We're on a search results page, find the correct link
     * 3. Use cheerio syntax to grab the table with this classname. Same every time
     * 4. Base url
     * 5. Counter for while loop
     * 6. Bool for while loop
     * 7. Entries.text() holds the full gene name to compare with.
     * 8. Check if this entry matches the gene name
     * 9. If matched, update url for target page.
     * 10. Exit loop
     * 11. Counter increment
     */
    if ($('title').text().substring(0, 3) !== "VCV") { // 1
		console.log('On search results page, looking for correct link'); // 2
		const entries = $('.blocklevelaintable'); // 3
		let nextPage = "https://www.ncbi.nlm.nih.gov"; // 4
		let i = 0; // 5
		let isFound = false; // 6
		while (i < entries.length && !isFound) {
		  const entryText = $(entries[i]).text().trim(); // 7
		  console.log(`Checking entry ${i}: ${entryText}`); // Console debug
		  if (entryText === searchTerm) { // 8 
        nextPage += $(entries[i]).attr('href'); // 9 
        isFound = true; // 10
        console.log('Found correct link:', nextPage); // Console debug
		  } else {
			i++; // 11
		  }
		}
      
      // If gene name wasn't found
      if (!isFound) {
        console.log('Error: Target variation not found'); // Console debug
        return res.status(404).json({ error: 'Target variation not found' }); // Server debug
      }

      /**
       * 1. Fetch the target page with axios
       * 2. Load date into $ using cheerio
       */
      console.log('Fetching target page:', nextPage); // Console debug
      const targetResponse = await axios.get(nextPage); // 1
      console.log('Target page received, status:', targetResponse.status); // Console debug
      $ = cheerio.load(targetResponse.data); // 2 
    } else {
      console.log('Already on target page'); // Console debug
    }

	/**
     * 1. Extract the variant-details-list table which represents the identifiers
     * 2. Extract the assertion-list table which represents the submissions
	 * 3. Check for tables
     */
    const variantDetailsHtml = $('#id_first').html(); // 1
    const assertionListTable = $('#assertion-list').prop('outerHTML'); // 2

    if (!variantDetailsHtml || !assertionListTable) {
      console.log('Error: Required data not found in the HTML'); // Console debug
      return res.status(404).json({ error: 'Required data not found' }); // Server debug
    }

    console.log('Data extracted successfully'); // Console debug
    console.log('Variant details HTML (first 200 chars):\n\n', variantDetailsHtml.substring(0, 200)); // Console debug
    console.log('Assertion list table HTML (first 200 chars):\n\n', assertionListTable.substring(0, 200)); // Console debug

	// Export as separate itmes in response object.
    const responseData = {
      variantDetailsHtml,
      assertionListTable
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching ClinVar data:', error);
    res.status(500).json({ error: 'An error occurred while fetching data', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});