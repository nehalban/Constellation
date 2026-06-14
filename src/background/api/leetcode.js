export async function fetchUserStats(handle) {
    try {
        const query = `
            query getUserProfile($username: String!) {
                userContestRanking(username: $username) {
                    rating
                }
                recentAcSubmissionList(username: $username, limit: 1) {
                    timestamp
                }
            }
        `;
        const res = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { username: handle } })
        });
        const data = await res.json();
        const rating = data.data?.userContestRanking?.rating;
        
        let lastActive = 'N/A';
        let lastActiveParsed = 0;
        const acList = data.data?.recentAcSubmissionList;
        if (acList && acList.length > 0) {
            const timestampSecs = parseInt(acList[0].timestamp, 10);
            lastActiveParsed = timestampSecs * 1000;
            lastActive = new Date(lastActiveParsed).toLocaleDateString();
        }

        return {
            rating: rating ? Math.round(rating).toString() : 'Unrated',
            lastActive,
            lastActiveParsed
        };
    } catch (e) {
        console.error(`Failed to fetch stats for leetcode ${handle}`, e);
    }
    return { rating: 'N/A', lastActive: 'N/A' };
}
