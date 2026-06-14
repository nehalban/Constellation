import { StorageManager } from '../utils/storageManager.js';
import { SettingsManager } from './settings.js';

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const listContainer = document.getElementById('contacts-list');
    const searchInput = document.getElementById('search');
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const detailView = document.getElementById('detail-view');
    const platformsView = document.getElementById('platforms-view');
    const settingsBtn = document.getElementById('settings-btn');
    const platformsBtn = document.getElementById('platforms-btn');
    const backBtn = document.getElementById('back-btn');
    const detailBackBtn = document.getElementById('detail-back-btn');
    const platformsBackBtn = document.getElementById('platforms-back-btn');

    // Detail view elements
    const detailName = document.getElementById('detail-name');
    const detailDeleteBtn = document.getElementById('detail-delete-btn');
    const hashtagsList = document.getElementById('hashtags-list');
    const hashtagInput = document.getElementById('hashtag-input');
    const detailHandlesList = document.getElementById('detail-handles-list');
    const detailListsContainer = document.getElementById('detail-lists-container');
    const newListInput = document.getElementById('new-list-input');

    // Platforms view elements
    const platformSelector = document.getElementById('platform-selector');
    const platformSearchInput = document.getElementById('platform-search');
    const platformSortSelect = document.getElementById('platform-sort');
    const platformFriendsList = document.getElementById('platform-friends-list');

    // Context Banner elements
    const contextBanner = document.getElementById('current-problem-context');
    const contextProblemTitle = document.getElementById('context-problem-title');
    const contextProblemSummary = document.getElementById('context-problem-summary');
    const contextFriendsList = document.getElementById('context-friends-list');

    let currentDetailContact = null;
    let previousViewForDetail = mainView;

    let contacts = [];
    let currentPlatformData = [];
    let availableLists = new Set();

    // Filters
    const mainListFilter = document.getElementById('main-list-filter');
    const platformListFilter = document.getElementById('platform-list-filter');

    const settingsManager = new SettingsManager();
    settingsManager.init(() => loadContacts());

    // --- Navigation Logic ---
    settingsBtn.addEventListener('click', () => {
        mainView.classList.remove('active');
        detailView.classList.remove('active');
        platformsView.classList.remove('active');
        settingsView.classList.add('active');
        document.querySelector('.search-container').style.display = 'none';
    });

    platformsBtn.addEventListener('click', () => {
        mainView.classList.remove('active');
        detailView.classList.remove('active');
        settingsView.classList.remove('active');
        platformsView.classList.add('active');
        document.querySelector('.search-container').style.display = 'none';
        
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    const url = tabs[0].url || '';
                    let detectedPlatform = null;
                    if (url.includes('codeforces.com')) detectedPlatform = 'codeforces';
                    else if (url.includes('leetcode.com')) detectedPlatform = 'leetcode';
                    else if (url.includes('hackerrank.com')) detectedPlatform = 'hackerrank';
                    else if (url.includes('atcoder.jp')) detectedPlatform = 'atcoder';
                    else if (url.includes('kaggle.com')) detectedPlatform = 'kaggle';
                    else if (url.includes('geeksforgeeks.org')) detectedPlatform = 'geeksforgeeks';

                    if (detectedPlatform && platformSelector.value !== detectedPlatform) {
                        platformSelector.value = detectedPlatform;
                    }
                    
                    if (platformSelector.value) {
                        renderPlatformFriends(platformSelector.value);
                    }
                }
            });
        } else {
            if (platformSelector.value) {
                renderPlatformFriends(platformSelector.value);
            }
        }
    });

    platformsBackBtn.addEventListener('click', () => {
        platformsView.classList.remove('active');
        mainView.classList.add('active');
        document.querySelector('.search-container').style.display = 'flex';
    });

    backBtn.addEventListener('click', () => {
        settingsView.classList.remove('active');
        mainView.classList.add('active');
        document.querySelector('.search-container').style.display = 'flex';
    });

    detailBackBtn.addEventListener('click', () => {
        detailView.classList.remove('active');
        if (previousViewForDetail === platformsView) {
            platformsView.classList.add('active');
        } else {
            mainView.classList.add('active');
            document.querySelector('.search-container').style.display = 'flex';
        }
        currentDetailContact = null;
    });

    detailDeleteBtn.addEventListener('click', async () => {
        if (!currentDetailContact) return;
        if (confirm(`Are you sure you want to delete ${currentDetailContact.name}?`)) {
            try {
                await StorageManager.deleteIdentity(currentDetailContact.id);
                detailView.classList.remove('active');
                if (previousViewForDetail === platformsView) {
                    platformsView.classList.add('active');
                } else {
                    mainView.classList.add('active');
                    document.querySelector('.search-container').style.display = 'flex';
                }
                currentDetailContact = null;
            } catch (err) {
                alert(err.message);
            }
        }
    });

    // --- Detail View Logic ---
    const renderHashtags = (tags) => {
        hashtagsList.innerHTML = '';
        (tags || []).forEach(tag => {
            const pill = document.createElement('div');
            pill.className = 'hashtag-pill';
            pill.innerHTML = `
                <span>#${tag}</span>
                <button class="hashtag-remove" aria-label="Remove hashtag">
                    <svg fill="currentColor" viewBox="0 0 24 24" width="14" height="14">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            `;
            pill.querySelector('.hashtag-remove').addEventListener('click', async () => {
                if (!currentDetailContact) return;
                currentDetailContact.tags = currentDetailContact.tags.filter(t => t !== tag);
                await StorageManager.addOrUpdateIdentity(currentDetailContact);
                renderHashtags(currentDetailContact.tags);
            });
            hashtagsList.appendChild(pill);
        });
    };

    hashtagInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && hashtagInput.value.trim() && currentDetailContact) {
            const newTag = hashtagInput.value.trim().replace(/^#+/, '').toLowerCase();
            if (newTag) {
                currentDetailContact.tags = currentDetailContact.tags || [];
                if (!currentDetailContact.tags.includes(newTag)) {
                    currentDetailContact.tags.push(newTag);
                    await StorageManager.addOrUpdateIdentity(currentDetailContact);
                    renderHashtags(currentDetailContact.tags);
                }
            }
            hashtagInput.value = '';
        }
    });

    // --- List Management Logic ---
    const renderLists = () => {
        detailListsContainer.innerHTML = '';
        if (!currentDetailContact) return;

        const contactLists = currentDetailContact.lists || [];
        
        // Show all available lists globally, plus any specific to this contact (just in case)
        const allLists = new Set([...Array.from(availableLists), ...contactLists]);

        if (allLists.size === 0) {
            detailListsContainer.innerHTML = '<span style="font-size: 13px; color: var(--md-sys-color-on-surface-variant);">No lists created yet.</span>';
            return;
        }

        Array.from(allLists).sort().forEach(listName => {
            const label = document.createElement('label');
            label.className = 'list-checkbox-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = contactLists.includes(listName);
            
            checkbox.addEventListener('change', async (e) => {
                if (!currentDetailContact) return;
                currentDetailContact.lists = currentDetailContact.lists || [];
                
                if (e.target.checked) {
                    if (!currentDetailContact.lists.includes(listName)) {
                        currentDetailContact.lists.push(listName);
                    }
                } else {
                    currentDetailContact.lists = currentDetailContact.lists.filter(l => l !== listName);
                }
                
                await StorageManager.addOrUpdateIdentity(currentDetailContact);
                loadContacts(); // Refresh global list state
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(listName));
            detailListsContainer.appendChild(label);
        });
    };

    newListInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && newListInput.value.trim() && currentDetailContact) {
            const newList = newListInput.value.trim();
            if (newList) {
                currentDetailContact.lists = currentDetailContact.lists || [];
                if (!currentDetailContact.lists.includes(newList)) {
                    currentDetailContact.lists.push(newList);
                    availableLists.add(newList);
                    await StorageManager.addOrUpdateIdentity(currentDetailContact);
                    renderLists();
                    loadContacts(); // Refresh global dropdowns
                }
            }
            newListInput.value = '';
        }
    });

    const getPlatformLogo = (platform) => {
        if (platform === 'codeforces') return '../../assets/images/Platform Logos/CodeForces.png';
        if (platform === 'atcoder') return '../../assets/images/Platform Logos/AtCoder.webp';
        if (platform === 'leetcode') return '../../assets/images/Platform Logos/LeetCode.png';
        if (platform === 'hackerrank') return '../../assets/images/Platform Logos/HackerRank.png';
        if (platform === 'kaggle') return '../../assets/images/Platform Logos/Kaggle.png';
        if (platform === 'geeksforgeeks') return '../../assets/images/Platform Logos/GeeksforGeeks.png';
        return '';
    };

    const openDetailView = (contact) => {
        currentDetailContact = contact;
        detailName.textContent = contact.name || 'Unnamed Contact';
        
        // Setup Tags
        renderHashtags(contact.tags);
        hashtagInput.value = '';

        // Setup Lists
        renderLists();
        newListInput.value = '';

        // Setup Handles
        detailHandlesList.innerHTML = '';
        let handleCardsData = [];

        if (contact.handles) {
            for (const [platform, handles] of Object.entries(contact.handles)) {
                handles.forEach(handle => {
                    const card = document.createElement('div');
                    card.className = 'handle-stat-card';
                    card.dataset.platform = platform;
                    card.dataset.handle = handle;
                    
                    const logoSrc = getPlatformLogo(platform);
                    const logoHtml = logoSrc ? `<img src="${logoSrc}" class="platform-logo" alt="${platform}">` : '';
                    
                    card.innerHTML = `
                        <div class="handle-stat-header">
                            ${logoHtml}
                            <span>${platform}: ${handle}</span>
                        </div>
                        <div class="handle-stat-row">
                            <span class="stat-label">Rating</span>
                            <span class="stat-value skeleton skeleton-text-short" style="width:50px;"></span>
                        </div>
                        <div class="handle-stat-row">
                            <span class="stat-label">Last Active</span>
                            <span class="stat-value skeleton skeleton-text-short" style="width:80px;"></span>
                        </div>
                    `;
                    
                    const handleData = {
                        card: card,
                        lastActiveParsed: 0,
                    };
                    handleCardsData.push(handleData);
                    detailHandlesList.appendChild(card);

                    // Fetch stats in background
                    chrome.runtime.sendMessage({
                        type: 'FETCH_USER_STATS',
                        platform,
                        handle
                    }, (response) => {
                        const rowEls = card.querySelectorAll('.stat-value');
                        if (rowEls.length >= 2) {
                            rowEls[0].className = 'stat-value';
                            rowEls[0].textContent = response?.rating || 'N/A';
                            
                            rowEls[1].className = 'stat-value';
                            rowEls[1].textContent = response?.lastActive || 'N/A';
                        }
                        
                        // Parse date for sorting
                        if (response?.lastActive && response.lastActive !== 'N/A' && response.lastActive !== 'Error') {
                            const d = new Date(response.lastActive);
                            if (!isNaN(d.getTime())) {
                                handleData.lastActiveParsed = d.getTime();
                            }
                        }

                        // Re-sort the cards dynamically based on parsed date (descending)
                        handleCardsData.sort((a, b) => b.lastActiveParsed - a.lastActiveParsed);
                        handleCardsData.forEach(item => {
                            detailHandlesList.appendChild(item.card);
                        });
                    });
                });
            }
        }
        
        if (platformsView.classList.contains('active')) {
            previousViewForDetail = platformsView;
            platformsView.classList.remove('active');
        } else {
            previousViewForDetail = mainView;
            mainView.classList.remove('active');
        }
        document.querySelector('.search-container').style.display = 'none';
        detailView.classList.add('active');
    };

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
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // prevent opening detail view
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
                            logoSrc = '../../assets/images/Platform Logos/CodeForces.png';
                        } else if (platform === 'atcoder') {
                            logoSrc = '../../assets/images/Platform Logos/AtCoder.webp';
                        } else if (platform === 'leetcode') {
                            logoSrc = '../../assets/images/Platform Logos/LeetCode.png';
                        } else if (platform === 'hackerrank') {
                            logoSrc = '../../assets/images/Platform Logos/HackerRank.png';
                        } else if (platform === 'kaggle') {
                            logoSrc = '../../assets/images/Platform Logos/Kaggle.png';
                        } else if (platform === 'geeksforgeeks') {
                            logoSrc = '../../assets/images/Platform Logos/GeeksforGeeks.png';
                        }
                        
                        if (logoSrc) {
                            badge.innerHTML = `<img src="${logoSrc}" alt="${platform}" class="platform-logo"> <span>${handle}</span>`;
                        } else {
                            badge.textContent = `${platform}: ${handle}`;
                        }
                        
                        badge.style.cursor = "pointer";
                        badge.title = `Open ${platform} profile`;
                        
                        badge.addEventListener('click', (e) => {
                            e.stopPropagation(); // prevent opening detail view
                            let url = '';
                            if (platform === 'codeforces') {
                                url = `https://codeforces.com/profile/${handle}`;
                            } else if (platform === 'atcoder') {
                                url = `https://atcoder.jp/users/${handle}`;
                            } else if (platform === 'leetcode') {
                                url = `https://leetcode.com/u/${handle}`;
                            } else if (platform === 'hackerrank') {
                                url = `https://www.hackerrank.com/${handle}`;
                            } else if (platform === 'geeksforgeeks') {
                                url = `https://www.geeksforgeeks.org/user/${handle}/`;
                            } else if (platform === 'kaggle') {
                                url = `https://www.kaggle.com/${handle}`;
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

            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                openDetailView(contact);
            });

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
            
            // Extract available lists
            availableLists.clear();
            contacts.forEach(c => {
                if (c.lists && Array.isArray(c.lists)) {
                    c.lists.forEach(l => availableLists.add(l));
                }
            });

            // Populate list dropdowns
            const populateDropdown = (select) => {
                const currentVal = select.value;
                select.innerHTML = '<option value="all">All Lists</option>';
                Array.from(availableLists).sort().forEach(list => {
                    const opt = document.createElement('option');
                    opt.value = list;
                    opt.textContent = list;
                    select.appendChild(opt);
                });
                if (Array.from(availableLists).includes(currentVal)) {
                    select.value = currentVal;
                }
            };
            populateDropdown(mainListFilter);
            populateDropdown(platformListFilter);

            filterAndRender();
            // Data is now fetched. Check for problem context if it exists.
            checkProblemContext();
        } catch (error) {
            console.error("Failed to load contacts:", error);
            listContainer.innerHTML = `<div class="empty-state"><p>Error loading contacts.</p></div>`;
        }
    };

    const checkProblemContext = () => {
        chrome.storage.local.get(['showContextBanner'], (res) => {
            if (res.showContextBanner === false) return;
            
            if (typeof chrome === 'undefined' || !chrome.tabs) return;
            
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length === 0) return;
                const url = tabs[0].url;
                if (!url) return;

                // Check if it's a Codeforces problem URL
                const cfMatch = url.match(/codeforces\.com\/(?:contest|problemset\/problem)\/(\d+)(?:\/problem)?\/([A-Za-z0-9]+)/);
                
                if (cfMatch) {
                    const contestId = cfMatch[1];
                    const index = cfMatch[2];
                    renderProblemContext('codeforces', contestId, index);
                }
            });
        });
    };

    const renderProblemContext = (platform, contestId, index) => {
        contextBanner.style.display = 'block';
        contextProblemTitle.textContent = `Problem ${contestId}${index}`;
        contextProblemSummary.textContent = 'Checking friends...';
        contextFriendsList.innerHTML = '';
        
        // Find friends with CF handles
        let handlesToFetch = [];
        let handleToContactMap = {};

        contacts.forEach(contact => {
            if (contact.handles && contact.handles[platform] && contact.handles[platform].length > 0) {
                contact.handles[platform].forEach(handle => {
                    handlesToFetch.push(handle);
                    handleToContactMap[handle.toLowerCase()] = contact;
                });
            }
        });

        if (handlesToFetch.length === 0) {
            contextProblemSummary.textContent = 'No friends found on this platform.';
            return;
        }

        chrome.runtime.sendMessage({
            type: 'FETCH_PROBLEM_STATUS',
            platform,
            contestId,
            index,
            handles: handlesToFetch
        }, (responses) => {
            if (!responses) {
                contextProblemSummary.textContent = 'Failed to fetch status.';
                return;
            }

            let solvedCount = 0;
            let attemptedCount = 0;

            const sortedHandles = Object.keys(responses).sort((a, b) => {
                const mapScore = { 'Accepted': 3, 'Attempted': 2, 'No Submission': 1, 'Error': 0 };
                return mapScore[responses[b]] - mapScore[responses[a]];
            });

            sortedHandles.forEach(handle => {
                const verdict = responses[handle];
                if (verdict === 'Accepted') solvedCount++;
                if (verdict === 'Attempted') attemptedCount++;

                // Skip showing users who haven't even attempted to keep it clean, 
                // unless nobody attempted, then we can just show empty or all.
                // Let's show everyone for now, or just those who attempted/solved.
                if (verdict !== 'Accepted' && verdict !== 'Attempted') return;

                const contact = handleToContactMap[handle];
                
                const row = document.createElement('div');
                row.className = 'context-friend-row';
                
                let verdictClass = 'verdict-none';
                if (verdict === 'Accepted') verdictClass = 'verdict-ok';
                else if (verdict === 'Attempted') verdictClass = 'verdict-wrong';
                
                row.innerHTML = `
                    <span class="context-friend-name">${contact.name || handle} (${handle})</span>
                    <span class="context-friend-verdict ${verdictClass}">${verdict}</span>
                `;
                
                row.addEventListener('click', () => {
                    openDetailView(contact);
                });

                contextFriendsList.appendChild(row);
            });

            if (solvedCount === 0 && attemptedCount === 0) {
                contextProblemSummary.textContent = 'No friends have attempted this.';
                contextFriendsList.innerHTML = `<div style="font-size: 13px; color: var(--md-sys-color-on-surface-variant); padding: 4px 12px;">No attempts found.</div>`;
            } else {
                contextProblemSummary.textContent = `${solvedCount} solved, ${attemptedCount} attempted`;
            }
        });
    };

    const filterAndRender = () => {
        const query = searchInput.value.toLowerCase().trim();
        const selectedList = mainListFilter.value;

        const filtered = contacts.filter(c => {
            // Check list filter
            if (selectedList !== 'all') {
                if (!c.lists || !c.lists.includes(selectedList)) {
                    return false;
                }
            }

            if (!query) return true;

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

    mainListFilter.addEventListener('change', filterAndRender);

    // --- Platform Leaderboard Logic ---
    const applyPlatformFiltersAndSort = () => {
        const query = platformSearchInput.value.toLowerCase().trim();
        const sortMode = platformSortSelect.value;
        const selectedList = platformListFilter.value;
        
        // Filter
        let filteredData = currentPlatformData.filter(item => {
            if (selectedList !== 'all') {
                if (!item.contact.lists || !item.contact.lists.includes(selectedList)) {
                    return false;
                }
            }

            if (!query) return true;

            const nameMatch = item.contact.name && item.contact.name.toLowerCase().includes(query);
            const handleMatch = item.handle.toLowerCase().includes(query);
            return nameMatch || handleMatch;
        });

        // Sort
        filteredData.sort((a, b) => {
            if (sortMode === 'alpha') {
                return (a.contact.name || '').localeCompare(b.contact.name || '');
            } else if (sortMode.startsWith('rating')) {
                const parseRating = (r) => {
                    if (!r || r === 'Unrated' || r === 'N/A' || r === 'Error') return -1;
                    const parsed = parseInt(r, 10);
                    return isNaN(parsed) ? -1 : parsed;
                };

                const ratingA = parseRating(a.rating);
                const ratingB = parseRating(b.rating);

                if (ratingA === ratingB) {
                    // Fallback to alpha if ratings match or both are unrated
                    return (a.contact.name || '').localeCompare(b.contact.name || '');
                }

                if (sortMode === 'rating-desc') {
                    return ratingB - ratingA;
                } else if (sortMode === 'rating-asc') {
                    if (ratingA === -1) return 1;
                    if (ratingB === -1) return -1;
                    return ratingA - ratingB;
                }
            } else if (sortMode.startsWith('active')) {
                const dateA = a.lastActiveParsed || 0;
                const dateB = b.lastActiveParsed || 0;

                if (dateA === dateB) {
                    return (a.contact.name || '').localeCompare(b.contact.name || '');
                }

                if (sortMode === 'active-desc') {
                    return dateB - dateA;
                } else if (sortMode === 'active-asc') {
                    if (dateA === 0) return 1;
                    if (dateB === 0) return -1;
                    return dateA - dateB;
                }
            }
            return 0;
        });

        // Render
        platformFriendsList.innerHTML = '';
        if (filteredData.length === 0) {
            platformFriendsList.innerHTML = `<div class="empty-state"><p>No friends found.</p></div>`;
            return;
        }

        filteredData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'handle-stat-card';
            card.style.cursor = 'pointer';
            
            const ratingHtml = item.rating !== null 
                ? `<span class="stat-value rating-val">${item.rating}</span>`
                : `<span class="stat-value skeleton skeleton-text-short rating-val" style="width:50px;"></span>`;
                
            const activeHtml = item.lastActive !== null
                ? `<span class="stat-value last-active-val">${item.lastActive}</span>`
                : `<span class="stat-value skeleton skeleton-text-short last-active-val" style="width:80px;"></span>`;

            card.innerHTML = `
                <div class="handle-stat-header">
                    <span style="font-size: 16px;">${item.contact.name || 'Unnamed'}</span>
                    <span style="font-weight: normal; color: var(--md-sys-color-on-surface-variant); margin-left: auto;">${item.handle}</span>
                </div>
                <div class="handle-stat-row">
                    <span class="stat-label">Rating</span>
                    ${ratingHtml}
                </div>
                <div class="handle-stat-row">
                    <span class="stat-label">Last Active</span>
                    ${activeHtml}
                </div>
            `;
            
            card.addEventListener('click', () => {
                openDetailView(item.contact);
            });

            platformFriendsList.appendChild(card);
        });
    };

    const renderPlatformFriends = (platform) => {
        platformFriendsList.innerHTML = '';
        currentPlatformData = [];
        
        if (!platform) return;

        // Find contacts with handles on the platform
        let platformContacts = contacts.filter(c => c.handles && c.handles[platform] && c.handles[platform].length > 0);
        
        if (platformContacts.length === 0) {
            platformFriendsList.innerHTML = `<div class="empty-state"><p>No friends found on this platform.</p></div>`;
            return;
        }

        let handlesToFetch = [];

        platformContacts.forEach(contact => {
            contact.handles[platform].forEach(handle => {
                handlesToFetch.push(handle);
                currentPlatformData.push({
                    contact: contact,
                    handle: handle,
                    rating: null,
                    lastActive: null,
                    lastActiveParsed: 0
                });
            });
        });

        // Initial render with skeletons
        applyPlatformFiltersAndSort();

        // Fetch stats
        if (handlesToFetch.length > 0) {
            chrome.runtime.sendMessage({
                type: 'FETCH_BATCH_STATS',
                platform,
                handles: handlesToFetch
            }, (responses) => {
                currentPlatformData.forEach(item => {
                    const handleKey = item.handle.toLowerCase();
                    const response = responses?.[handleKey];
                    if (response) {
                        item.rating = response.rating || 'N/A';
                        item.lastActive = response.lastActive || 'N/A';
                        item.lastActiveParsed = response.lastActiveParsed || 0;
                    } else {
                        item.rating = 'Error';
                        item.lastActive = 'Error';
                        item.lastActiveParsed = 0;
                    }
                });
                
                // Re-render with loaded data
                applyPlatformFiltersAndSort();
            });
        }
    };

    platformSelector.addEventListener('change', (e) => {
        renderPlatformFriends(e.target.value);
    });

    const updateFilterHighlights = () => {
        const listFilterContainer = document.getElementById('list-filter-container');
        if (listFilterContainer) {
            if (platformListFilter.value === 'all') listFilterContainer.classList.remove('active');
            else listFilterContainer.classList.add('active');
        }

        const sortFilterContainer = document.getElementById('sort-filter-container');
        if (sortFilterContainer) {
            if (platformSortSelect.value === 'alpha') sortFilterContainer.classList.remove('active');
            else sortFilterContainer.classList.add('active');
        }
    };

    platformSearchInput.addEventListener('input', applyPlatformFiltersAndSort);
    platformListFilter.addEventListener('change', () => {
        updateFilterHighlights();
        applyPlatformFiltersAndSort();
    });
    platformSortSelect.addEventListener('change', () => {
        updateFilterHighlights();
        applyPlatformFiltersAndSort();
    });

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
