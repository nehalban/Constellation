import { StorageManager } from '../utils/storageManager.js';

export class SettingsManager {
    constructor() {
        this.badgesToggle = document.getElementById('badges-toggle');
        this.contextBannerToggle = document.getElementById('context-banner-toggle');
        this.exportBtn = document.getElementById('export-data-btn');
        this.importBtn = document.getElementById('import-data-btn');
        this.importInput = document.getElementById('import-file-input');
        this.clearBtn = document.getElementById('clear-data-btn');
        this.themeToggle = document.getElementById('theme-toggle');
    }

    init(onStateChange) {
        this.initTheming(onStateChange);
        this.initDataManagement(onStateChange);
    }

    initTheming(onStateChange) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.setAttribute('data-theme', 'dark');
            this.themeToggle.checked = true;
        }

        chrome.storage.local.get(['showBadges', 'showContextBanner'], (res) => {
            this.badgesToggle.checked = res.showBadges !== false; // Default true
            this.contextBannerToggle.checked = res.showContextBanner !== false; // Default true
        });

        this.themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            }
        });

        this.badgesToggle.addEventListener('change', (e) => {
            chrome.storage.local.set({ showBadges: e.target.checked }, () => {
                if (typeof chrome !== 'undefined' && chrome.tabs) {
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        if (tabs[0] && tabs[0].url && tabs[0].url.includes('codeforces.com')) {
                            chrome.tabs.reload(tabs[0].id);
                        }
                    });
                }
            });
        });

        this.contextBannerToggle.addEventListener('change', (e) => {
            chrome.storage.local.set({ showContextBanner: e.target.checked });
            const banner = document.getElementById('current-problem-context');
            if (banner) {
                if (!e.target.checked) {
                    banner.style.display = 'none';
                } else {
                    if (onStateChange) onStateChange();
                }
            }
        });
    }

    initDataManagement(onStateChange) {
        this.exportBtn.addEventListener('click', async () => {
            const data = await StorageManager.getData();
            const identities = Object.values(data.identities || {});
            const json = JSON.stringify(identities, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `constellation_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        this.importBtn.addEventListener('click', () => {
            this.importInput.click();
        });

        this.importInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    let importedCount = 0;
                    
                    if (Array.isArray(data)) {
                        for (const identity of data) {
                            if (identity.name) {
                                await StorageManager.addOrUpdateIdentity(identity);
                                importedCount++;
                            }
                        }
                    } else if (data && typeof data === 'object') {
                        const identities = data.identities ? Object.values(data.identities) : Object.values(data);
                        for (const identity of identities) {
                            if (identity && identity.name) {
                                await StorageManager.addOrUpdateIdentity(identity);
                                importedCount++;
                            }
                        }
                    }
                    
                    alert(`Successfully imported ${importedCount} contacts!`);
                    if (onStateChange) onStateChange();
                } catch (err) {
                    alert('Invalid backup file format.');
                    console.error('Import error:', err);
                }
                this.importInput.value = '';
            };
            reader.readAsText(file);
        });

        this.clearBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to permanently delete all your contacts? This cannot be undone.')) {
                await StorageManager.saveData({}, {});
                if (onStateChange) onStateChange();
                alert('All data cleared.');
            }
        });
    }
}
