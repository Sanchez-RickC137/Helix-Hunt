/**
 * Utility functions for processing ClinVar data
 * Handles data transformation and extraction for the frontend
 */

/**
 * Processes raw ClinVar data into a structured format
 * Extracts relevant information and organizes it for frontend display
 * 
 * @param {object} data - Raw data from ClinVar API or scraping
 * @returns {object} Processed data object containing:
 *   - variantInfo: Variation set information
 *   - clinicalSignificance: Clinical significance details
 *   - geneInfo: Gene-related information
 *   - conditions: Associated conditions
 *   - error: Error message if processing fails
 */
export const processClinVarData = (data) => {
	// Validate input data
	if (!data || typeof data !== 'object') {
	  return { error: 'Invalid data received' };
	}
	
	// Extract and structure the data
	const processed = {
	  variantInfo: data.variation_set ? data.variation_set[0] : {},
	  clinicalSignificance: data.clinical_significance || {},
	  geneInfo: data.gene_info || {},
	  conditions: data.conditions || [],
	};
	
	return processed;
  };
  
  /**
   * Extracts table data from processed ClinVar data
   * Converts complex objects into a format suitable for table display
   * 
   * @param {object} data - Processed ClinVar data
   * @returns {Array<object>} Array of field-value pairs for table display
   */
  export const extractTableData = (data) => {
	if (!data || typeof data !== 'object') {
	  return [];
	}
	
	// Convert object entries to table-friendly format
	return Object.entries(data).map(([key, value]) => {
	  return {
		field: key,
		value: typeof value === 'object' ? JSON.stringify(value) : String(value)
	  };
	});
  };