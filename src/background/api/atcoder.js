export async function fetchUserStats(handle) {
    try {
        const [algoRes, heurRes] = await Promise.all([
            fetch(`https://atcoder.jp/users/${handle}?contestType=algo`),
            fetch(`https://atcoder.jp/users/${handle}?contestType=heuristic`)
        ]);

        const algoHtml = await algoRes.text();
        const heurHtml = await heurRes.text();

        const parseHtml = (html) => {
            const ratingMatch = html.match(/<th class="no-break">Rating<\/th><td>.*?<span class=['"]user-[^'"]+['"]>([^<]+)<\/span>/);
            const rating = ratingMatch ? ratingMatch[1] : 'Unrated';
            
            let lastActiveParsed = 0;
            const historyMatch = html.match(/var rating_history=(\[.*?\]);/);
            if (historyMatch) {
                try {
                    const history = JSON.parse(historyMatch[1]);
                    if (history && history.length > 0) {
                        const lastContest = history[history.length - 1];
                        if (lastContest.EndTime) {
                            lastActiveParsed = lastContest.EndTime * 1000;
                        }
                    }
                } catch(e) {}
            }
            return { rating, lastActiveParsed };
        };

        const algoData = parseHtml(algoHtml);
        const heurData = parseHtml(heurHtml);

        let combinedRating = `Algo: ${algoData.rating} | Heur: ${heurData.rating}`;
        if (algoData.rating === 'Unrated' && heurData.rating === 'Unrated') {
            combinedRating = 'Unrated';
        }

        const maxLastActiveParsed = Math.max(algoData.lastActiveParsed, heurData.lastActiveParsed);
        let lastActive = 'N/A';
        if (maxLastActiveParsed > 0) {
            lastActive = new Date(maxLastActiveParsed).toISOString().split('T')[0];
        }

        return {
            rating: combinedRating,
            lastActive,
            lastActiveParsed: maxLastActiveParsed
        };
    } catch (e) {
        console.error(`Failed to fetch stats for atcoder ${handle}`, e);
    }
    return { rating: 'N/A', lastActive: 'N/A' };
}
