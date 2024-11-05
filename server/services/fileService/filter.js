const fs = require('fs').promises;
const fsSync = require('fs');
const readline = require('readline');

/**
 * Filters file content based on gene symbols
 * @param {string} inputPath - Input file path
 * @param {Set} geneSymbols - Set of gene symbols to match
 * @param {string} outputPath - Output file path
 */
async function filterFile(inputPath, geneSymbols, outputPath) {
  const stats = {
    totalLines: 0,
    matchedLines: 0,
    startTime: Date.now()
  };

  const readStream = fsSync.createReadStream(inputPath);
  const writeStream = fsSync.createWriteStream(outputPath);
  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  
  for await (const line of rl) {
    stats.totalLines++;

    if (isFirstLine) {
      await writeStream.write(line + '\n');
      isFirstLine = false;
      continue;
    }

    const shouldKeep = Array.from(geneSymbols).some(symbol => 
      line.includes(symbol)
    );

    if (shouldKeep) {
      stats.matchedLines++;
      await writeStream.write(line + '\n');
    }
  }

  stats.endTime = Date.now();
  stats.duration = (stats.endTime - stats.startTime) / 1000;

  await new Promise(resolve => writeStream.end(resolve));
  return stats;
}

/**
 * Loads gene symbols from file
 * @param {string} symbolsPath - Path to gene symbols file
 * @returns {Promise<Set>} Set of gene symbols
 */
async function loadGeneSymbols(symbolsPath) {
  const content = await fs.readFile(symbolsPath, 'utf-8');
  return new Set(content.split('\n').map(line => line.trim()).filter(Boolean));
}

/**
 * Main filtering function
 * @param {string} inputPath - File to filter
 * @param {string} symbolsPath - Path to gene symbols file
 * @param {string} outputPath - Where to write filtered results
 */
async function filterFileWithGeneSymbols(inputPath, symbolsPath, outputPath) {
  console.log(`Starting filtering process for ${inputPath}`);
  console.log(`Output will be written to ${outputPath}`);
  
  try {
    const geneSymbols = await loadGeneSymbols(symbolsPath);
    console.log(`Loaded ${geneSymbols.size} gene symbols`);

    const stats = await filterFile(inputPath, geneSymbols, outputPath);

    console.log(`Filtering complete:
      Total lines: ${stats.totalLines}
      Matched lines: ${stats.matchedLines}
      Duration: ${stats.duration} seconds
      Reduction: ${((1 - stats.matchedLines/stats.totalLines) * 100).toFixed(2)}%`);

    return stats;
  } catch (error) {
    console.error('Error during filtering:', error);
    throw error;
  }
}

module.exports = { filterFileWithGeneSymbols };