const fs = require('fs').promises;

async function checkMissingVariations() {
    try {
        // Read the file with variation IDs
        const fileContent = await fs.readFile('variation_ids.txt', 'utf8');
        const inputIds = fileContent.split(' ')
            .map(id => id.trim())
            .filter(Boolean)
            .map(id => String(id)); // Convert all to strings
        console.log(`Found ${inputIds.length} IDs in input file`);

        // Read and parse the JSON results
        const jsonContent = await fs.readFile('clinvar_results.json', 'utf8');
        const results = JSON.parse(jsonContent);
        
        // Get unique variation IDs from results, converted to strings
        const resultIds = new Set(results.map(result => String(result.VariationID)));
        console.log(`Found ${resultIds.size} unique variation IDs in results`);

        // Find missing IDs
        const missingIds = inputIds.filter(id => !resultIds.has(id));
        
        if (missingIds.length > 0) {
            console.log('\nMissing Variation IDs:');
            missingIds.forEach(id => console.log(id));
            console.log(`\nTotal missing: ${missingIds.length}`);

            // Print some context for the first missing ID
            if (missingIds.length > 0) {
                console.log('\nFirst missing ID details:');
                console.log('Missing ID:', missingIds[0]);
                console.log('Type:', typeof missingIds[0]);
                console.log('Sample result ID:', Array.from(resultIds)[0]);
                console.log('Type:', typeof Array.from(resultIds)[0]);
            }
        } else {
            console.log('\nNo missing variation IDs found');
        }

        // Print first few IDs from both sets for verification
        console.log('\nFirst 5 input IDs:', inputIds.slice(0, 5));
        console.log('First 5 result IDs:', Array.from(resultIds).slice(0, 5));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkMissingVariations();