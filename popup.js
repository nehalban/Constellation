import { StorageManager } from './storageManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const listContainer = document.getElementById('contacts-list');
    const searchInput = document.getElementById('search');
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const settingsBtn = document.getElementById('settings-btn');
    const backBtn = document.getElementById('back-btn');
    const themeToggle = document.getElementById('theme-toggle');

    let contacts = [];

    // --- Theming Logic ---
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.checked = true;
        } else if (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.checked = true;
        }
    };

    themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    });

    initTheme();

    // --- Navigation Logic ---
    settingsBtn.addEventListener('click', () => {
        const isSettingsOpen = settingsView.classList.contains('active');
        if (isSettingsOpen) {
            settingsView.classList.remove('active');
            mainView.classList.add('active');
            document.querySelector('.search-container').style.display = 'flex';
        } else {
            mainView.classList.remove('active');
            settingsView.classList.add('active');
            document.querySelector('.search-container').style.display = 'none';
        }
    });

    backBtn.addEventListener('click', () => {
        settingsView.classList.remove('active');
        mainView.classList.add('active');
        document.querySelector('.search-container').style.display = 'flex';
    });

    // --- Rendering Logic ---
    const showSkeleton = () => {
        listContainer.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            listContainer.innerHTML += `
                <li class="skeleton-card">
                    <div class="skeleton skeleton-title"></div>
                    <div style="display: flex; gap: 8px;">
                        <div class="skeleton skeleton-badge"></div>
                        <div class="skeleton skeleton-badge"></div>
                    </div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text-short"></div>
                </li>
            `;
        }
    };

    const showEmptyState = (isSearch = false) => {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                <p>${isSearch ? 'No contacts match your search.' : 'No contacts found.'}</p>
            </div>
        `;
    };

    const renderContacts = (contactsToRender) => {
        listContainer.innerHTML = '';

        if (contactsToRender.length === 0) {
            showEmptyState(searchInput.value.trim().length > 0);
            return;
        }

        contactsToRender.forEach(contact => {
            const li = document.createElement('li');
            li.className = 'contact-card';

            const headerEl = document.createElement('div');
            headerEl.className = 'contact-header';

            const nameEl = document.createElement('h3');
            nameEl.className = 'contact-name';
            nameEl.textContent = contact.name || 'Unnamed Contact';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.title = 'Delete contact';
            deleteBtn.setAttribute('aria-label', `Delete ${contact.name}`);
            deleteBtn.innerHTML = `
                <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/>
                </svg>
            `;
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete ${contact.name}?`)) {
                    try {
                        await StorageManager.deleteIdentity(contact.id);
                        // Refresh handled by storage listener
                    } catch (err) {
                        alert(err.message);
                    }
                }
            });

            headerEl.appendChild(nameEl);
            headerEl.appendChild(deleteBtn);
            li.appendChild(headerEl);

            const handlesContainer = document.createElement('div');
            handlesContainer.className = 'contact-handles';

            if (contact.handles) {
                for (const [platform, handles] of Object.entries(contact.handles)) {
                    handles.forEach(handle => {
                        const badge = document.createElement('span');
                        badge.className = `badge ${platform}`;
                        let logoSrc = '';
                        if (platform === 'codeforces') {
                            logoSrc = 'Platform Logos/CodeForces.png';
                        } else if (platform === 'atcoder') {
                            logoSrc = 'Platform Logos/AtCoder.webp';
                        } else if (platform === 'leetcode') {
                            logoSrc = 'Platform Logos/LeetCode.png';
                        } else if (platform === 'hackerrank') {
                            logoSrc = 'Platform Logos/HackerRank.png';
                        }
                        
                        if (logoSrc) {
                            badge.innerHTML = `<img src="${logoSrc}" alt="${platform}" class="platform-logo"> <span>${handle}</span>`;
                        } else {
                            badge.textContent = `${platform}: ${handle}`;
                        }
                        
                        badge.style.cursor = "pointer";
                        badge.title = `Open ${platform} profile`;
                        
                        badge.addEventListener('click', () => {
                            let url = '';
                            if (platform === 'codeforces') {
                                url = `https://codeforces.com/profile/${handle}`;
                            } else if (platform === 'atcoder') {
                                url = `https://atcoder.jp/users/${handle}`;
                            } else if (platform === 'leetcode') {
                                url = `https://leetcode.com/u/${handle}`;
                            } else if (platform === 'hackerrank') {
                                url = `https://www.hackerrank.com/${handle}`;
                            }
                            
                            if (url) {
                                if (typeof chrome !== 'undefined' && chrome.tabs) {
                                    chrome.tabs.create({ url });
                                } else {
                                    window.open(url, '_blank');
                                }
                            }
                        });
                        
                        handlesContainer.appendChild(badge);
                    });
                }
            }

            if (handlesContainer.hasChildNodes()) {
                li.appendChild(handlesContainer);
            }

            if (contact.notes) {
                const notesEl = document.createElement('p');
                notesEl.className = 'contact-notes';
                notesEl.textContent = contact.notes;
                li.appendChild(notesEl);
            }

            listContainer.appendChild(li);
        });
    };

    // --- Data Loading ---
    const loadContacts = async () => {
        showSkeleton();
        try {
            // Artificial delay to show off the beautiful skeleton animation as requested
            await new Promise(resolve => setTimeout(resolve, 400));
            
            const data = await StorageManager.getData();
            contacts = Object.values(data.identities).sort((a, b) => 
                (a.name || '').localeCompare(b.name || '')
            );
            filterAndRender();
        } catch (error) {
            console.error("Failed to load contacts:", error);
            listContainer.innerHTML = `<div class="empty-state"><p>Error loading contacts.</p></div>`;
        }
    };

    const filterAndRender = () => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) {
            renderContacts(contacts);
            return;
        }

        const filtered = contacts.filter(c => {
            const nameMatch = c.name && c.name.toLowerCase().includes(query);
            const notesMatch = c.notes && c.notes.toLowerCase().includes(query);
            
            let handleMatch = false;
            if (c.handles) {
                for (const handles of Object.values(c.handles)) {
                    if (handles.some(h => h.toLowerCase().includes(query))) {
                        handleMatch = true;
                        break;
                    }
                }
            }
            return nameMatch || notesMatch || handleMatch;
        });
        renderContacts(filtered);
    };

    // --- Event Listeners ---
    searchInput.addEventListener('input', filterAndRender);

    // Sync listener
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'sync') {
                // Background update occurred (e.g. from another tab or content script)
                loadContacts();
            }
        });
    }

    // Initialize
    loadContacts();
});
