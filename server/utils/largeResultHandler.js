const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class LargeResultHandler {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
  }

  async initialize() {
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  /**
   * Save intermediate results to prevent memory buildup
   */
  async saveIntermediateResults(results, identifier) {
    const tempFilePath = path.join(this.tempDir, `${identifier}_intermediate.json.gz`);
    
    try {
      const compressedData = await gzip(JSON.stringify(results));
      await fs.writeFile(tempFilePath, compressedData);
    } catch (error) {
      console.error('Error saving intermediate results:', error);
      // Don't throw - we want to continue processing even if save fails
    }
  }

  /**
   * Load intermediate results if needed
   */
  async loadIntermediateResults(identifier) {
    const tempFilePath = path.join(this.tempDir, `${identifier}_intermediate.json.gz`);
    
    try {
      const exists = await fs.access(tempFilePath)
        .then(() => true)
        .catch(() => false);
      
      if (!exists) return null;

      const compressedData = await fs.readFile(tempFilePath);
      const decompressedData = await gunzip(compressedData);
      return JSON.parse(decompressedData.toString());
    } catch (error) {
      console.error('Error loading intermediate results:', error);
      return null;
    }
  }

  /**
   * Clean up intermediate files
   */
  async cleanup(identifier) {
    try {
      const tempFilePath = path.join(this.tempDir, `${identifier}_intermediate.json.gz`);
      await fs.unlink(tempFilePath).catch(() => {});
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

module.exports = new LargeResultHandler();