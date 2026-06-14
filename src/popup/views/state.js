import { StorageManager } from '../../utils/storageManager.js';

export const AppState = {
    contacts: [],
    currentPlatformData: [],
    availableLists: new Set(),
    currentDetailContact: null,
    previousViewForDetail: null,
    
    async loadContacts() {
        try {
            const data = await StorageManager.getData();
            this.contacts = Object.values(data.identities).sort((a, b) => 
                (a.name || '').localeCompare(b.name || '')
            );
            
            this.availableLists.clear();
            this.contacts.forEach(c => {
                if (c.lists && Array.isArray(c.lists)) {
                    c.lists.forEach(l => this.availableLists.add(l));
                }
            });
            return true;
        } catch (error) {
            console.error("Failed to load contacts:", error);
            return false;
        }
    }
};
