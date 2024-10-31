/**
 * Result filtering utilities
 * Provides functions for filtering and processing ClinVar query results
 */

/**
 * Filters assertion list based on criteria
 * @param {Array} assertionList - List of ClinVar assertions
 * @param {Array} clinicalSignificance - Selected clinical significance values
 * @param {string} startDate - Start date for filtering
 * @param {string} endDate - End date for filtering
 * @returns {Array} Filtered assertion list
 */
const filterAssertionList = (assertionList, clinicalSignificance, startDate, endDate) => {
	return assertionList.filter(assertion => {
	  // Check clinical significance criteria
	  const meetsSignificanceCriteria = clinicalSignificance.length === 0 || 
		clinicalSignificance.includes(assertion.Classification.value);
  
	  if (!meetsSignificanceCriteria) {
		return false;
	  }
  
	  // If no date range specified, include all
	  if (!startDate && !endDate) {
		return true;
	  }
  
	  // Check date range criteria
	  const lastEvaluatedDate = new Date(assertion.Classification.date);
	  const start = startDate ? new Date(startDate) : null;
	  const end = endDate ? new Date(endDate) : null;
  
	  if (start && end) {
		return lastEvaluatedDate >= start && lastEvaluatedDate <= end;
	  } else if (start) {
		return lastEvaluatedDate >= start;
	  } else if (end) {
		return lastEvaluatedDate <= end;
	  }
  
	  return true;
	});
  };
  
  /**
   * Processes and filters ClinVar query results
   * Applies filters and handles error cases
   * 
   * @param {Array} results - Raw query results
   * @param {Object} filters - Filter criteria
   * @param {Array} filters.clinicalSignificance - Selected clinical significance values
   * @param {string} filters.startDate - Start date in YYYY-MM-DD format
   * @param {string} filters.endDate - End date in YYYY-MM-DD format
   * @returns {Array} Filtered and processed results
   */
  const processAndFilterResults = (results, filters) => {
	if (!results || !Array.isArray(results)) {
	  return [];
	}
  
	return results.map(result => {
	  // Pass through error results
	  if (result.error) {
		return result;
	  }
  
	  // Apply filters to assertions
	  const filteredAssertions = filterAssertionList(
		result.assertionList,
		filters.clinicalSignificance,
		filters.startDate,
		filters.endDate
	  );
  
	  // Mark as no matching data if all assertions filtered out
	  if (filteredAssertions.length === 0) {
		return {
		  ...result,
		  error: 'No matching data',
		  details: 'No variants match the selected clinical significance and/or date range criteria.'
		};
	  }
  
	  return {
		...result,
		assertionList: filteredAssertions
	  };
	});
  };
  
  export { filterAssertionList, processAndFilterResults };