// server/services/fileService/downloader.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const BASE_URL = 'https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/';
const REQUIRED_FILES = [
  'variant_summary.txt.gz',
  'submission_summary.txt.gz',
  'summary_of_conflicting_interpretations.txt',
  'hgvs4variation.txt.gz'
];

/**
 * Scrapes the ClinVar FTP directory page
 * @returns {Promise<Array>} Array of file information objects
 */
async function scrapeFileList() {
  try {
    const response = await axios.get(BASE_URL);
    const $ = cheerio.load(response.data);
    const files = [];

    $('tr').each((i, row) => {
      const tds = $(row).find('td');
      if (tds.length >= 4) {
        const fileName = $(tds[0]).find('a').text();
        const lastModified = $(tds[3]).text();
        
        if (fileName && lastModified && REQUIRED_FILES.includes(fileName)) {
          files.push({
            fileName,
            url: `${BASE_URL}${fileName}`,
            lastModified: new Date(lastModified)
          });
        }
      }
    });

    return files;
  } catch (error) {
    console.error('Error scraping file list:', error);
    throw error;
  }
}

/**
 * Downloads a file from the given URL
 * @param {string} url - File URL
 * @param {string} outputPath - Full path for downloaded file
 */
async function downloadFile(url, outputPath) {
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    const writer = fsSync.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading ${url}:`, error);
    throw error;
  }
}

module.exports = {
  scrapeFileList,
  downloadFile,
  REQUIRED_FILES
};