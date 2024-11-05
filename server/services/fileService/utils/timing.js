// server/services/fileService/utils/timing.js

/**
 * Wraps an async operation and measures its execution time
 * @param {string} operationName - Name of the operation being measured
 * @param {Function} operation - Async function to be measured
 * @returns {Promise<any>} Result of the operation
 */
const timeOperation = async (operationName, operation) => {
	const start = process.hrtime.bigint();  // More precise than performance.now() in Node
	try {
	  const result = await operation();
	  const end = process.hrtime.bigint();
	  const duration = Number(end - start) / 1_000_000; // Convert nanoseconds to milliseconds
	  console.log(`${operationName} took ${duration.toFixed(2)} milliseconds`);
	  return result;
	} catch (error) {
	  const end = process.hrtime.bigint();
	  const duration = Number(end - start) / 1_000_000;
	  console.error(`${operationName} failed after ${duration.toFixed(2)} milliseconds`);
	  throw error;
	}
  };
  
  module.exports = timeOperation;