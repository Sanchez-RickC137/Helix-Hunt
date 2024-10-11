// src/utils/dataProcessing.js

export const processClinVarData = (data) => {
	if (!data || typeof data !== 'object') {
	  return { error: 'Invalid data received' };
	}
  
	// Example processing - adjust based on actual data structure
	const processed = {
	  variantInfo: data.variation_set ? data.variation_set[0] : {},
	  clinicalSignificance: data.clinical_significance || {},
	  geneInfo: data.gene_info || {},
	  conditions: data.conditions || [],
	};
  
	return processed;
  };
  
  export const extractTableData = (data) => {
	if (!data || typeof data !== 'object') {
	  return [];
	}
  
	// Example extraction - adjust based on actual data structure
	return Object.entries(data).map(([key, value]) => {
	  return {
		field: key,
		value: typeof value === 'object' ? JSON.stringify(value) : String(value)
	  };
	});
  };