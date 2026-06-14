export async function fetchUserStats(handle) {
    try {
        const res = await fetch(`https://atcoder.jp/users/${handle}`);
        const html = await res.text();
        
        // Best effort regex scraping
        const ratingMatch = html.match(/<th class="no-break">Rating<\/th><td><span class='user-[^']+'>([^<]+)<\/span>/) || html.match(/<th class="no-break">Rating<\/th><td><span class="user-[^"]+">([^<]+)<\/span>/);
        const rating = ratingMatch ? ratingMatch[1] : 'Unrated';
        
        return {
            rating,
            lastActive: 'N/A',
            lastActiveParsed: 0
        };
    } catch (e) {
        console.error(`Failed to fetch stats for atcoder ${handle}`, e);
    }
    return { rating: 'N/A', lastActive: 'N/A' };
}
