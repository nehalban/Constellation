export async function fetchUserStats(handle) {
    try {
        const res = await fetch(`https://www.geeksforgeeks.org/user/${handle}/`);
        const html = await res.text();

        let rating = 'Unrated';
        // Extract the score from the raw HTML payload (typically in the __NEXT_DATA__ or __next_f script payloads)
        const scoreMatch = html.match(/"score"\s*:\s*(\d+)/i) || 
                           html.match(/"codingScore"\s*:\s*(\d+)/i) || 
                           html.match(/score_card_value[^>]*>\s*(\d+)/i) ||
                           html.match(/ScoreContainer_value[^>]*>(?:<[^>]+>)*\s*(\d+)/i);
        if (scoreMatch) {
            rating = scoreMatch[1];
        }

        let lastActive = 'N/A';
        let lastActiveParsed = 0;
        
        // Fetch the user's submissions directly from the API
        try {
            const subRes = await fetch("https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                body: JSON.stringify({ handle })
            });
            const subJson = await subRes.json();

            if (subJson.status === "success" && subJson.result) {
                let maxTime = 0;
                // Iterate through difficulty categories
                for (const category of Object.values(subJson.result)) {
                    for (const prob of Object.values(category)) {
                        if (prob.user_subtime) {
                            // Subtimes look like "2023-12-01 14:30:00" and are in IST
                            const t = new Date(prob.user_subtime.replace(' ', 'T') + '+05:30').getTime();
                            if (!isNaN(t) && t > maxTime) {
                                maxTime = t;
                            }
                        }
                    }
                }
                if (maxTime > 0) {
                    lastActiveParsed = maxTime;
                    lastActive = new Date(lastActiveParsed).toLocaleDateString();
                }
            }
        } catch (apiErr) {
            console.error("Failed to fetch GfG submissions API", apiErr);
        }

        return {
            rating,
            lastActive,
            lastActiveParsed
        };
    } catch (e) {
        console.error(`Failed to fetch stats for geeksforgeeks ${handle}`, e);
    }
    return { rating: 'N/A', lastActive: 'N/A' };
}
