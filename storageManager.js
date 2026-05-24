/**
 * Data manager module for handling friend identity syncing across devices.
 * Uses chrome.storage.sync to ensure cross-browser data synchronization.
 */

/**
 * @typedef {Object} Handles
 * @property {string[]} [codeforces] - List of Codeforces handles
 * @property {string[]} [atcoder] - List of AtCoder handles
 * @property {string[]} [platform] - Additional platforms
 */

/**
 * @typedef {Object} Identity
 * @property {string} id - Unique identifier (UUID or timestamp)
 * @property {string} name - Real name or alias
 * @property {string} notes - Multi-line personal notes
 * @property {string[]} tags - Array of string tags (e.g., ["math", "speed"])
 * @property {Handles} handles - Mappings of platforms to arrays of handles
 */

/**
 * @typedef {Object} StorageData
 * @property {Record<string, Identity>} identities - Identities Table
 * @property {Record<string, string>} lookup_index - Lookup Index mapping platform_handle to identityId
 */

export class StorageManager {
    static STORAGE_KEYS = {
        IDENTITIES: 'identities',
        LOOKUP_INDEX: 'lookup_index'
    };

    /**
     * Helper to generate a unique ID
     * @returns {string} Unique UUID-like string
     */
    static generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    /**
     * Checks the chrome.storage.sync quota and logs a warning if usage exceeds 80%.
     * @returns {Promise<void>}
     */
    static async checkQuota() {
        if (!chrome.storage.sync.getBytesInUse) return;

        try {
            const bytesInUse = await chrome.storage.sync.getBytesInUse(null);
            // Limit for sync storage is 100KB (102,400 bytes)
            const quota = chrome.storage.sync.QUOTA_BYTES || 102400; 
            
            if (bytesInUse / quota > 0.8) {
                console.warn(`[StorageManager] WARNING: Storage usage is above 80%! (${bytesInUse} bytes of ${quota} bytes used)`);
            }
        } catch (error) {
            console.error('[StorageManager] Error checking storage quota:', error);
        }
    }

    /**
     * Fetches the complete dataset from storage.
     * @returns {Promise<StorageData>} The Identities Table and Lookup Index
     */
    static async getData() {
        const data = await chrome.storage.sync.get([
            this.STORAGE_KEYS.IDENTITIES, 
            this.STORAGE_KEYS.LOOKUP_INDEX
        ]);
        return {
            identities: data[this.STORAGE_KEYS.IDENTITIES] || {},
            lookup_index: data[this.STORAGE_KEYS.LOOKUP_INDEX] || {}
        };
    }

    /**
     * Saves both the Identities Table and Lookup Index back to storage atomically.
     * @param {Record<string, Identity>} identities 
     * @param {Record<string, string>} lookup_index 
     * @returns {Promise<void>}
     */
    static async saveData(identities, lookup_index) {
        await chrome.storage.sync.set({
            [this.STORAGE_KEYS.IDENTITIES]: identities,
            [this.STORAGE_KEYS.LOOKUP_INDEX]: lookup_index
        });
        await this.checkQuota();
    }

    /**
     * 1. Creates a new identity or updates an existing one.
     * Updates BOTH the Identities Table and the Lookup Index atomically.
     * @param {Partial<Identity>} identityData - The identity data to add or update
     * @returns {Promise<string>} The identity ID that was created or updated
     */
    static async addOrUpdateIdentity(identityData) {
        const { identities, lookup_index } = await this.getData();
        
        const id = identityData.id || this.generateId();
        const existingIdentity = identities[id] || { handles: {} };
        
        const newIdentity = {
            id,
            name: identityData.name !== undefined ? identityData.name : (existingIdentity.name || ''),
            notes: identityData.notes !== undefined ? identityData.notes : (existingIdentity.notes || ''),
            tags: identityData.tags !== undefined ? identityData.tags : (existingIdentity.tags || []),
            handles: identityData.handles !== undefined ? identityData.handles : (existingIdentity.handles || {})
        };

        // Check for handle conflicts before making changes
        if (identityData.handles) {
            for (const [platform, handles] of Object.entries(identityData.handles)) {
                for (const handle of handles) {
                    const key = `${platform}_${handle}`;
                    if (lookup_index[key] && lookup_index[key] !== id) {
                        throw new Error(`Conflict: Handle '${handle}' on '${platform}' is already linked to a different identity (${lookup_index[key]}).`);
                    }
                }
            }
        }

        // Clean up old handles from lookup index
        if (identities[id]) {
            const oldHandles = identities[id].handles || {};
            for (const [platform, handles] of Object.entries(oldHandles)) {
                for (const handle of handles) {
                    const key = `${platform}_${handle}`;
                    delete lookup_index[key];
                }
            }
        }

        // Add new handles to lookup index
        for (const [platform, handles] of Object.entries(newIdentity.handles)) {
            for (const handle of handles) {
                const key = `${platform}_${handle}`;
                lookup_index[key] = id;
            }
        }

        identities[id] = newIdentity;

        // Auto-merge identities if another identity has the exact same name
        const thisName = newIdentity.name.toLowerCase().trim();
        if (thisName) {
            const duplicates = Object.keys(identities).filter(i => 
                i !== id && (identities[i].name || '').toLowerCase().trim() === thisName
            );

            if (duplicates.length > 0) {
                const primary = identities[id];
                for (const dupId of duplicates) {
                    const dup = identities[dupId];
                    // Merge notes
                    if (dup.notes) {
                        primary.notes = primary.notes ? `${primary.notes}\n---\n${dup.notes}` : dup.notes;
                    }
                    // Merge tags
                    if (dup.tags && dup.tags.length > 0) {
                        const mergedTags = new Set([...(primary.tags || []), ...dup.tags]);
                        primary.tags = Array.from(mergedTags);
                    }
                    // Merge handles
                    const dupHandles = dup.handles || {};
                    primary.handles = primary.handles || {};
                    
                    for (const [platform, platHandles] of Object.entries(dupHandles)) {
                        primary.handles[platform] = primary.handles[platform] || [];
                        for (const h of platHandles) {
                            if (!primary.handles[platform].includes(h)) {
                                primary.handles[platform].push(h);
                            }
                            const key = `${platform}_${h}`;
                            lookup_index[key] = id; // Point existing handle to new primary identity
                        }
                    }
                    // Delete the duplicate identity
                    delete identities[dupId];
                }
            }
        }

        await this.saveData(identities, lookup_index);
        return id;
    }

    /**
     * 2. Removes the identity and cleans up all associated keys in the Lookup Index.
     * @param {string} identityId - ID of the identity to delete
     * @returns {Promise<void>}
     */
    static async deleteIdentity(identityId) {
        const { identities, lookup_index } = await this.getData();
        
        if (!identities[identityId]) return;

        const handles = identities[identityId].handles || {};
        for (const [platform, platHandles] of Object.entries(handles)) {
            for (const handle of platHandles) {
                const key = `${platform}_${handle}`;
                delete lookup_index[key];
            }
        }

        delete identities[identityId];
        await this.saveData(identities, lookup_index);
    }

    /**
     * 3. Looks up the identityId from the index, then fetches and returns the full identity object.
     * @param {string} platform - The platform (e.g., "codeforces", "atcoder")
     * @param {string} handle - The user handle on that platform
     * @returns {Promise<Identity|null>} The identity object or null if not found
     */
    static async getIdentityByHandle(platform, handle) {
        const { identities, lookup_index } = await this.getData();
        const key = `${platform}_${handle}`;
        const identityId = lookup_index[key];
        
        if (!identityId || !identities[identityId]) {
            return null;
        }
        
        return identities[identityId];
    }

    /**
     * 4. Appends a new handle to an existing profile and updates the index.
     * @param {string} identityId - ID of the target identity
     * @param {string} platform - The platform of the handle
     * @param {string} newHandle - The new handle to link
     * @returns {Promise<void>}
     */
    static async addHandleToIdentity(identityId, platform, newHandle) {
        const { identities, lookup_index } = await this.getData();
        
        if (!identities[identityId]) {
            throw new Error(`Identity '${identityId}' not found.`);
        }

        const key = `${platform}_${newHandle}`;
        if (lookup_index[key] && lookup_index[key] !== identityId) {
            throw new Error(`Conflict: Handle '${newHandle}' on '${platform}' is already linked to a different identity (${lookup_index[key]}).`);
        }

        const handles = identities[identityId].handles || {};
        handles[platform] = handles[platform] || [];
        
        if (!handles[platform].includes(newHandle)) {
            handles[platform].push(newHandle);
        }
        identities[identityId].handles = handles;
        lookup_index[key] = identityId;
        
        await this.saveData(identities, lookup_index);
    }

    /**
     * 5. Removes the handle from the profile and deletes the index key.
     * @param {string} identityId - ID of the target identity
     * @param {string} platform - The platform of the handle
     * @param {string} handleToRemove - The handle to unlink
     * @returns {Promise<void>}
     */
    static async removeHandleFromIdentity(identityId, platform, handleToRemove) {
        const { identities, lookup_index } = await this.getData();
        
        if (!identities[identityId]) return;

        const handlesArray = identities[identityId].handles?.[platform];
        if (handlesArray) {
            identities[identityId].handles[platform] = handlesArray.filter(h => h !== handleToRemove);
            
            // Clean up empty platform arrays
            if (identities[identityId].handles[platform].length === 0) {
                delete identities[identityId].handles[platform];
            }
        }

        const key = `${platform}_${handleToRemove}`;
        if (lookup_index[key] === identityId) {
            delete lookup_index[key];
        }

        // Auto-delete the identity if it has no handles remaining
        const remainingPlatforms = Object.keys(identities[identityId].handles || {});
        if (remainingPlatforms.length === 0) {
            delete identities[identityId];
        }

        await this.saveData(identities, lookup_index);
    }
}
