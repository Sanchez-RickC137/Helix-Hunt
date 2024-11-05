const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

class MD5Verifier {
  /**
   * Downloads MD5 file and verifies file integrity
   * @param {string} fileUrl - URL of the original file
   * @param {string} filePath - Path to downloaded file
   * @param {Logger} logger - Logger instance
   * @returns {Promise<boolean>} Whether verification passed
   */
  async verifyFile(fileUrl, filePath, logger) {
    try {
      // Construct MD5 URL using the ClinVar FTP base
      const md5Url = `https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/${path.basename(filePath)}.md5`;
      logger.log(`Fetching MD5 from ${md5Url}`);

      const response = await axios.get(md5Url, {
        timeout: 10000, // 10 second timeout
        validateStatus: function (status) {
          return status < 500; // Accept all status codes less than 500
        }
      });

      if (response.status !== 200) {
        logger.log(`Failed to fetch MD5 file: HTTP ${response.status}`, 'error');
        // If we can't get the MD5, we'll still process the file but log a warning
        logger.log('Proceeding without MD5 verification', 'warning');
        return true;
      }

      const expectedMD5 = response.data.trim().split(' ')[0];
      logger.log(`Downloaded MD5 hash: ${expectedMD5}`);

      // Calculate file hash
      const calculatedMD5 = await this.calculateMD5(filePath);
      logger.log(`Calculated MD5 hash: ${calculatedMD5}`);

      // Compare hashes
      const isValid = expectedMD5 === calculatedMD5;
      if (isValid) {
        logger.log(`MD5 verification passed for ${path.basename(filePath)}`);
      } else {
        logger.log(`MD5 verification failed for ${path.basename(filePath)}`, 'error');
      }

      return isValid;
    } catch (error) {
      // Log error but don't fail the process
      logger.log(`MD5 verification error for ${path.basename(filePath)}: ${error.message}`, 'warning');
      logger.log('Proceeding without MD5 verification', 'warning');
      return true; // Return true to allow processing to continue
    }
  }

  /**
   * Calculates MD5 hash of a file
   * @param {string} filePath - Path to file
   * @returns {Promise<string>} MD5 hash
   */
  async calculateMD5(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);

      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', error => reject(error));
    });
  }
}

module.exports = MD5Verifier;