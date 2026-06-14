import { StorageManager } from '../utils/storageManager.js';
import { fetchUserStats, fetchBatchStats, fetchProblemStatus } from './api/index.js';

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

// Expose StorageManager for debugging purposes if needed.
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
