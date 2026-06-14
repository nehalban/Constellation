import * as codeforces from './codeforces.js';
import * as leetcode from './leetcode.js';
import * as hackerrank from './hackerrank.js';
import * as atcoder from './atcoder.js';
import * as geeksforgeeks from './geeksforgeeks.js';
import * as kaggle from './kaggle.js';
import { RequestQueue } from './queue.js';

const apiQueue = new RequestQueue(3, 400); // Generic fallback queue for platforms without native batching

const platforms = {
    codeforces,
    leetcode,
    hackerrank,
    atcoder,
    geeksforgeeks,
    kaggle
};

export async function fetchUserStats(platformName, handle) {
    const platform = platforms[platformName];
    if (platform && platform.fetchUserStats) {
        return platform.fetchUserStats(handle);
    }
    return { rating: 'N/A', lastActive: 'N/A' };
}

export async function fetchBatchStats(platformName, handles) {
    if (!handles || handles.length === 0) return {};
    
    const platform = platforms[platformName];
    
    // If the platform supports native batching (like codeforces), use it.
    if (platform && platform.fetchBatchStats) {
        return platform.fetchBatchStats(handles);
    }
    
    // Fallback: fetch individually using the shared rate limiting queue
    let results = {};
    try {
        await Promise.all(handles.map(handle => 
            apiQueue.add(async () => {
                const stat = await fetchUserStats(platformName, handle);
                results[handle.toLowerCase()] = stat;
            })
        ));
    } catch (e) {
        console.error(`Failed batch fetch for ${platformName}`, e);
    }
    
    return results;
}

export async function fetchProblemStatus(platformName, contestId, index, handles) {
    if (!handles || handles.length === 0) return {};
    
    const platform = platforms[platformName];
    if (platform && platform.fetchProblemStatus) {
        return platform.fetchProblemStatus(contestId, index, handles);
    }
    
    return {};
}
