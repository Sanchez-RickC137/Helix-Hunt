export const getGuideSteps = (searchType) => [
	{
	  id: 'search-type-toggle',
	  title: 'Select Search Type',
	  instruction: 'Choose between Targeted search for specific queries or General search for broader exploration.'
	},
	{
	  id: 'query-source-toggle',
	  title: 'Select Data Source',
	  instruction: 'Choose between Web Query for real-time data or Database Query for faster local results.'
	},
	...(searchType === 'targeted' ? [
	  {
		id: 'name-toggle',
		title: 'Choose Input Format',
		instruction: 'Select whether you want to use Transcript ID/Gene Symbol or Full Gene Name format.'
	  },
	  {
		id: 'gene-input',
		title: 'Enter Gene Information',
		instruction: 'Type your gene symbol or name in the input field.'
	  },
	  {
		id: 'dna-change',
		title: 'DNA Change (Optional)',
		instruction: 'If applicable, enter the DNA change information.'
	  },
	  {
		id: 'protein-change',
		title: 'Protein Change (Optional)',
		instruction: 'If applicable, enter the protein change information.'
	  },
	  {
		id: 'add-to-query',
		title: 'Add to Query',
		instruction: 'Click "Add to Query" to include this gene in your search.'
	  },
	  {
		id: 'variation-id',
		title: 'Variation ID (Optional)',
		instruction: 'If you have a specific variation ID, enter it here.'
	  }
	] : [
	  {
		id: 'search-group',
		title: 'Create Search Group',
		instruction: 'Enter your search criteria to create a search group.'
	  }
	]),
	{
	  id: 'clinical-significance',
	  title: 'Clinical Significance',
	  instruction: 'Select any clinical significance filters you want to apply.'
	},
	{
	  id: 'date-range',
	  title: 'Date Range (Optional)',
	  instruction: 'Optionally set a date range to filter your results.'
	},
	{
	  id: 'review-query',
	  title: 'Review Query',
	  instruction: 'Review your query settings and click "Review Query" when ready.'
	}
  ];
  
  export const getStepToSection = (steps) => ({
	[steps.findIndex(step => step.id === 'clinical-significance')]: 'clinical-significance',
	[steps.findIndex(step => step.id === 'date-range')]: 'date-range',
	[steps.findIndex(step => step.id === 'review-query')]: 'review-query'
  });