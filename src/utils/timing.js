/**
 * Utility for measuring operation execution time
 * Provides timing information for performance monitoring
 */

/**
 * Wraps an async operation and measures its execution time
 * Logs the duration and handles errors while preserving the operation's behavior
 * 
 * @param {string} operationName - Name of the operation being measured
 * @param {Function} operation - Async function to be measured
 * @returns {Promise<any>} Result of the operation
 * @throws {Error} Rethrows any error from the operation after logging timing
 * 
 * @example
 * const result = await timeOperation(
 *   'Fetch user data',
 *   () => fetchUserFromAPI(userId)
 * );
 */
const timeOperation = async (operationName, operation) => {
	const start = performance.now();
	try {
	  const result = await operation();
	  const end = performance.now();
	  console.log(`${operationName} took ${end - start} milliseconds`);
	  return result;
	} catch (error) {
	  const end = performance.now();
	  console.error(`${operationName} failed after ${end - start} milliseconds`);
	  throw error;
	}
  };
  
  export default timeOperation;