import { StorageManager } from '../utils/storageManager.js';

/**
 * Service Worker (Background Script) for Constellation
 * Handles cross-tab synchronization and background tasks.
 */

// Include a chrome.storage.onChanged listener to detect remote or local state changes.
chrome.storage.onChanged.addListener((changes, areaName) => {
    // Only care about sync storage where our identities live
    if (areaName === 'sync') {
        const isIdentitiesChanged = !!changes[StorageManager.STORAGE_KEYS.IDENTITIES];
        const isLookupIndexChanged = !!changes[StorageManager.STORAGE_KEYS.LOOKUP_INDEX];

        // Broadcast to all active tabs if our data changed
        if (isIdentitiesChanged || isLookupIndexChanged) {
            console.log('[Background] Storage changes detected, broadcasting to content scripts...');
            
            chrome.tabs.query({}, (tabs) => {
                for (const tab of tabs) {
                    // Send message to each tab. Suppress errors for tabs without content scripts.
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'STATE_SYNC_UPDATE',
                        changes: changes
                    }).catch(() => {
                        // Ignore errors from tabs that don't have our content script loaded
                    });
                }
            });
        }
    }
});

// Optional: You can expose StorageManager to other parts of the extension
// or for debugging purposes if needed.
self.StorageManager = StorageManager;

// Listen for stat fetch requests from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'FETCH_USER_STATS') {
        fetchUserStats(request.platform, request.handle)
            .then(sendResponse)
            .catch(err => {
                console.error(err);
                sendResponse({ rating: 'Error', lastActive: 'Error' });
            });
        return true; // Keep the message channel open for async response
    } else if (request.type === 'FETCH_BATCH_STATS') {
        fetchBatchStats(request.platform, request.handles)
            .then(sendResponse)
            .catch(err => {
                console.error(err);
                sendResponse({});
            });
        return true;
    } else if (request.type === 'FETCH_PROBLEM_STATUS') {
        fetchProblemStatus(request.platform, request.contestId, request.index, request.handles)
            .then(sendResponse)
            .catch(err => {
                console.error(err);
                sendResponse({});
            });
        return true;
    }
});

/**
 * RequestQueue throttles asynchronous functions to prevent rate limiting.
 */
class RequestQueue {
    constructor(concurrency = 3, delayMs = 300) {
        this.concurrency = concurrency;
        this.delayMs = delayMs;
        this.queue = [];
        this.activeCount = 0;
    }

    async add(taskFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ taskFn, resolve, reject });
            this._processNext();
        });
    }

    async _processNext() {
        if (this.activeCount >= this.concurrency || this.queue.length === 0) {
            return;
        }

        const { taskFn, resolve, reject } = this.queue.shift();
        this.activeCount++;

        try {
            const result = await taskFn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            setTimeout(() => {
                this.activeCount--;
                this._processNext();
            }, this.delayMs);
        }
    }
}

const cfQueue = new RequestQueue(3, 400); // Codeforces specific queue (max 3 req, 400ms delay between finishes)

async function fetchProblemStatus(platform, contestId, index, handles) {
    if (platform !== 'codeforces' || !handles || handles.length === 0) return {};
    
    let results = {};
    
    // We can fetch submissions for a user in a specific contest.
    // If the API supports semicolon-separated handles for contest.status, we can batch it.
    // Wait, contest.status 'handle' parameter supports a single handle.
    // So we must fetch for each handle individually via Promise.all
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

async function fetchBatchStats(platform, handles) {
    if (!handles || handles.length === 0) return {};
    
    let results = {};
    try {
        if (platform === 'codeforces') {
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
                                    : 'N/A'
                            };
                        });
                    }
                })
            ));
        } else {
            // Fallback for other platforms: fetch individually with rate limiting queue
            // (Reusing cfQueue logic as a generic throttler here)
            await Promise.all(handles.map(handle => 
                cfQueue.add(async () => {
                    const stat = await fetchUserStats(platform, handle);
                    results[handle.toLowerCase()] = stat;
                })
            ));
        }
    } catch (e) {
        console.error(`Failed batch fetch for ${platform}`, e);
    }
    
    return results;
}

async function fetchUserStats(platform, handle) {
    try {
        if (platform === 'codeforces') {
            const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
            const data = await res.json();
            if (data.status === 'OK' && data.result.length > 0) {
                const user = data.result[0];
                const lastActive = user.lastOnlineTimeSeconds 
                    ? new Date(user.lastOnlineTimeSeconds * 1000).toLocaleDateString()
                    : 'N/A';
                return {
                    rating: user.rating ? user.rating.toString() : 'Unrated',
                    lastActive
                };
            }
        } else if (platform === 'leetcode') {
            const query = `
                query getUserProfile($username: String!) {
                    userContestRanking(username: $username) {
                        rating
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
            return {
                rating: rating ? Math.round(rating).toString() : 'Unrated',
                lastActive: 'N/A' // LeetCode GraphQL doesn't easily expose last active
            };
        } else if (platform === 'atcoder') {
            const res = await fetch(`https://atcoder.jp/users/${handle}`);
            const html = await res.text();
            
            // Best effort regex scraping
            const ratingMatch = html.match(/<th class="no-break">Rating<\/th><td><span class='user-[^']+'>([^<]+)<\/span>/) || html.match(/<th class="no-break">Rating<\/th><td><span class="user-[^"]+">([^<]+)<\/span>/);
            const rating = ratingMatch ? ratingMatch[1] : 'Unrated';
            
            return {
                rating,
                lastActive: 'N/A'
            };
        }
    } catch (e) {
        console.error(`Failed to fetch stats for ${platform} ${handle}`, e);
    }
    
    return { rating: 'N/A', lastActive: 'N/A' };
}
