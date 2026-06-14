import { RequestQueue } from './queue.js';

export const cfQueue = new RequestQueue(3, 400); // Codeforces specific queue (max 3 req, 400ms delay between finishes)

export async function fetchUserStats(handle) {
    try {
        const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
        const data = await res.json();
        if (data.status === 'OK' && data.result.length > 0) {
            const user = data.result[0];
            const lastActive = user.lastOnlineTimeSeconds 
                ? new Date(user.lastOnlineTimeSeconds * 1000).toLocaleDateString()
                : 'N/A';
            return {
                rating: user.rating ? user.rating.toString() : 'Unrated',
                lastActive,
                lastActiveParsed: user.lastOnlineTimeSeconds ? user.lastOnlineTimeSeconds * 1000 : 0
            };
        }
    } catch (e) {
        console.error(`Failed to fetch stats for codeforces ${handle}`, e);
    }
    return { rating: 'N/A', lastActive: 'N/A' };
}

export async function fetchBatchStats(handles) {
    if (!handles || handles.length === 0) return {};
    
    let results = {};
    try {
        // Chunk handles into groups of 50 to prevent URL too long or API limits
        const chunkSize = 50;
        const chunks = [];
        for (let i = 0; i < handles.length; i += chunkSize) {
            chunks.push(handles.slice(i, i + chunkSize));
        }

        await Promise.all(chunks.map(chunk => 
            cfQueue.add(async () => {
                const handlesStr = chunk.join(';');
                const res = await fetch(`https://codeforces.com/api/user.info?handles=${handlesStr}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                
                if (data.status === 'OK') {
                    data.result.forEach(user => {
                        results[user.handle.toLowerCase()] = {
                            rating: user.rating ? user.rating.toString() : 'Unrated',
                            lastActive: user.lastOnlineTimeSeconds 
                                ? new Date(user.lastOnlineTimeSeconds * 1000).toLocaleDateString()
                                : 'N/A',
                            lastActiveParsed: user.lastOnlineTimeSeconds ? user.lastOnlineTimeSeconds * 1000 : 0
                        };
                    });
                }
            })
        ));
    } catch (e) {
        console.error(`Failed batch fetch for codeforces`, e);
    }
    
    return results;
}

export async function fetchProblemStatus(contestId, index, handles) {
    if (!handles || handles.length === 0) return {};
    
    let results = {};
    
    try {
        await Promise.all(handles.map(handle => 
            cfQueue.add(async () => {
                try {
                    const res = await fetch(`https://codeforces.com/api/contest.status?contestId=${contestId}&handle=${handle}`);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    
                    if (data.status === 'OK') {
                        const submissions = data.result.filter(s => s.problem.index === index);
                        
                        if (submissions.length === 0) {
                            results[handle.toLowerCase()] = 'No Submission';
                        } else {
                            const isAccepted = submissions.some(s => s.verdict === 'OK');
                            results[handle.toLowerCase()] = isAccepted ? 'Accepted' : 'Attempted';
                        }
                    } else {
                        results[handle.toLowerCase()] = 'No Submission';
                    }
                } catch (e) {
                    console.error(`Failed to fetch status for ${handle}`, e);
                    results[handle.toLowerCase()] = 'Error';
                }
            })
        ));
    } catch (e) {
        console.error('Batch problem status error', e);
    }
    
    return results;
}
