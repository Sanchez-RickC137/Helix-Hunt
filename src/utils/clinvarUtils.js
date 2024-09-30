export function refinedClinvarHtmlTableToJson(table) {
    if (!table) return JSON.stringify({ error: "Table not provided" });

    function cleanText(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    const results = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(table, 'text/html');
    const rows = doc.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const entry = {
            Classification: {},
            'Review status': {},
            Condition: {},
            Submitter: {},
            'More information': {
                Publications: {},
                'Other databases': {},
                Comment: ''
            }
        };

        // Classification
        const classificationCell = row.cells[0];
        const classificationDiv = classificationCell.querySelector('.germline-submission');
        if (classificationDiv) {
            const innerDiv = classificationDiv.querySelector('div');
            if (innerDiv) {
                const valueNode = Array.from(innerDiv.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if (valueNode) {
                    entry.Classification.value = cleanText(valueNode.textContent);
                }
                const dateDivs = innerDiv.querySelectorAll('.smaller');
                if (dateDivs.length > 0) {
                    const dateDiv = dateDivs[dateDivs.length - 1];
                    entry.Classification.date = cleanText(dateDiv.textContent).replace(/[()]/g, '');
                }
            }
        }

        // Review status
        const reviewStatusCell = row.cells[1];
        const starsHtml = reviewStatusCell.querySelector('.stars-html');
        if (starsHtml) {
            entry['Review status'].stars = cleanText(starsHtml.textContent);
        }
        
        const assertionCriteriaDiv = reviewStatusCell.querySelector('.stars-description');
        if (assertionCriteriaDiv) {
            const criteriaText = cleanText(assertionCriteriaDiv.textContent);
            const sourceLink = reviewStatusCell.querySelector('a[data-ga-label="germline submissions AC"]');
            if (sourceLink) {
                const sourceText = cleanText(sourceLink.textContent);
                entry['Review status']['assertion criteria'] = `${criteriaText} (${sourceText})`;
            } else {
                entry['Review status']['assertion criteria'] = criteriaText;
            }
        }

        const methodDiv = reviewStatusCell.querySelector('.smaller:last-child');
        if (methodDiv) {
            entry['Review status'].method = cleanText(methodDiv.textContent).replace('Method:', '').trim();
        }

        // Condition
        const conditionCell = row.cells[2];
        const conditionLink = conditionCell.querySelector('a');
        entry.Condition.name = conditionLink ? cleanText(conditionLink.textContent) : cleanText(conditionCell.childNodes[0].textContent);
        
        const smallerDivs = conditionCell.querySelectorAll('.smaller');
        smallerDivs.forEach(div => {
            const text = cleanText(div.textContent);
            if (text.startsWith('Affected status:')) {
                entry.Condition['Affected status'] = text.replace('Affected status:', '').trim();
            } else if (text.startsWith('Allele origin:')) {
                entry.Condition['Allele origin'] = text.replace('Allele origin:', '').trim();
            }
        });

        // Submitter
        const submitterCell = row.cells[3];
        const submitterLink = submitterCell.querySelector('a');
        if (submitterLink) {
            entry.Submitter.name = cleanText(submitterLink.textContent);
        }
        const submitterDetails = submitterCell.querySelector('.smaller');
        if (submitterDetails) {
            submitterDetails.textContent.split('\n').forEach(line => {
                const [key, value] = cleanText(line).split(':').map(s => s.trim());
                if (key && value) entry.Submitter[key] = value;
            });
        }

        // More information
        const moreInfoCell = row.cells[4];
        
        // Publications
        const publicationsDiv = moreInfoCell.querySelector('dl.submit-evidence');
        if (publicationsDiv) {
            const pubLinks = publicationsDiv.querySelectorAll('a');
            pubLinks.forEach(link => {
                const pubText = cleanText(link.textContent);
                const pubType = pubText.split('(')[0].trim();
                if (pubType && !pubType.match(/^\d+$/)) {
                    const pubDetailsDiv = link.closest('dd').querySelector('.pubmed-details');
                    if (pubDetailsDiv) {
                        const pubDetails = cleanText(pubDetailsDiv.textContent);
                        const pubId = pubDetails.split(':')[1].trim();
                        entry['More information'].Publications[pubType] = pubId;
                    }
                }
            });
        }

        // Other databases
        const otherDbDiv = moreInfoCell.querySelector('div:not(.obs-single)');
        if (otherDbDiv && otherDbDiv.textContent.includes('Other databases')) {
            const links = otherDbDiv.querySelectorAll('a');
            links.forEach(link => {
                entry['More information']['Other databases'][cleanText(link.textContent)] = link.href;
            });
        }

        // Comment
        const commentDiv = moreInfoCell.querySelector('.obs-single .smaller');
        if (commentDiv) {
            entry['More information'].Comment = cleanText(commentDiv.textContent).replace('Comment:', '').trim();
        }

        results.push(entry);
    });

    return JSON.stringify(results, null, 2);
}