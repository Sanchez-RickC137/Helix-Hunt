const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/clinvar', async (req, res) => {
  try {
    const { id, term } = req.query;
    
    if (!id || !term) {
      return res.status(400).json({ error: 'Both id and term parameters are required' });
    }

    console.log(`Fetching data for ID: ${id}, Term: ${term}`);

    // First query to NCBI E-utilities
    const summaryResponse = await axios.get(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=${id}&term=${encodeURIComponent(term)}&retmode=json`);
    
    if (!summaryResponse.data || !summaryResponse.data.result || !summaryResponse.data.result[id]) {
      return res.status(404).json({ error: 'No data found for the given ID and term' });
    }

    const accession = summaryResponse.data.result[id].accession;
    console.log(`Accession number retrieved: ${accession}`);

    // Second query to ClinVar website
    const clinvarResponse = await axios.get(`https://www.ncbi.nlm.nih.gov/clinvar/variation/${accession}/`);
    
    // Parse the HTML to extract the assertion-list table
    const $ = cheerio.load(clinvarResponse.data);
    const assertionListTable = $('#assertion-list').prop('outerHTML');

    if (!assertionListTable) {
      console.log('Assertion list table not found in the HTML');
      return res.status(404).json({ error: 'Assertion list table not found' });
    }

    console.log('Assertion list table extracted successfully');

    // Send the extracted table HTML
    res.send(assertionListTable);
  } catch (error) {
    console.error('Error fetching ClinVar data:', error);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});