const fullName = "NM_007203.5(PALM2AKAP2):c.449G>A (p.Arg150Gln)"

function parseVariantName(fullName) {
	if (!fullName) {
	  console.error("Empty or undefined fullName");
	  return null;
	}
  
	console.log("Processing:", fullName);
  
	if (!fullName.includes(':') || !fullName.includes('(') || 
		!fullName.includes(')') || !fullName.startsWith("NM_")) {
	  console.error("Failed basic structure check:", fullName);
	  return null;
	}
  
	try {
	  // Extract the transcript ID and gene symbol
	  const transcriptAndGene = fullName.match(/^([^:]+)\(([^)]+)\)/);
	  if (!transcriptAndGene || transcriptAndGene.length < 3) {
		console.error("Failed to extract transcript and gene symbol:", fullName);
		return null;
	  }
  
	  const transcriptId = transcriptAndGene[1].trim();
	  const geneSymbol = transcriptAndGene[2].trim();
	  console.log("Extracted transcriptId and geneSymbol:", transcriptId, geneSymbol);
  
	  if (!geneSymbol || geneSymbol.length >= 15 || !transcriptId) {
		console.error("Invalid gene symbol or transcriptId:", geneSymbol, transcriptId);
		return null;
	  }
  
	  // Extract the DNA change part
	  const dnaChangeMatch = fullName.match(/:(c\.[^ ]+)/);
	  if (!dnaChangeMatch || dnaChangeMatch.length < 2) {
		console.error("Failed to extract DNA change:", fullName);
		return null;
	  }
  
	  const dnaChange = dnaChangeMatch[1].trim();
	  console.log("Extracted dnaChange:", dnaChange);
  
	  // Extract the protein change part (optional)
	  const proteinChangeMatch = fullName.match(/\(p\.[^)]+\)$/);
	  const proteinChange = proteinChangeMatch ? proteinChangeMatch[0].replace(/[()]/g, '').trim() : null;
	  console.log("Extracted proteinChange:", proteinChange);
  
	  return {
		geneSymbol,
		transcriptId,
		dnaChange,
		proteinChange
	  };
	} catch (error) {
	  console.error("Error parsing variant name:", fullName, error);
	  return null;
	}
  }

  const result = parseVariantName(fullName);
  console.log(result);