// Configuration based on the current platform
let config = {};
const hostname = window.location.hostname;

if (hostname.includes("atcoder.jp")) {
    config = {
        site: "atcoder",
        profileRegex: /^\/users\/([^/?#]+)/,
        profileTitleSelector: ".col-md-9 h3, .col-sm-9 h3, h3", 
        linkSelector: "a[href*='/users/']",
        realNameSelector: null
    };
} else if (hostname.includes("leetcode.com")) {
    config = {
        site: "leetcode",
        profileRegex: /^\/u\/([^/?#]+)/,
        profileTitleSelector: ".flex.space-x-4", 
        linkSelector: "a[href*='/u/']",
        realNameSelector: ".text-label-1.dark\\:text-dark-label-1.break-all.text-base.font-semibold, .text-label-1.break-all.text-base.font-semibold"
    };
} else if (hostname.includes("hackerrank.com")) {
    config = {
        site: "hackerrank",
        profileRegex: /^\/(?:profile\/)?([^/?#]+)/,
        profileTitleSelector: ".profile-sidebar, h1.profile-heading, .profile-heading, .profile-name, .username, h1",
        linkSelector: "a[href^='/']",
        realNameSelector: ".hr-heading-02.profile-title.ellipsis, .profile-real-name, p.profile-real-name"
    };
} else if (hostname.includes("kaggle.com")) {
    config = {
        site: "kaggle",
        profileRegex: /^\/([^/?#]+)/,
        profileTitleSelector: ".sc-fUTThT.gXvkDd, h1, [class*='profile-name'], [class*='name']",
        linkSelector: "a[href^='/']",
        realNameSelector: "h1, [class*='real-name']"
    };
} else if (hostname.includes("geeksforgeeks.org")) {
    config = {
        site: "geeksforgeeks",
        profileRegex: /^\/(?:user|profile)\/([^/?#]+)/,
        profileTitleSelector: ".NewProfile_profile__FHfgW, .profile_name, h1, .userName, [class*='profile-name']",
        linkSelector: "a[href*='/user/']",
        realNameSelector: ".NewProfile_name__N_Nlw, .profile_name, h1"
    };
} else {
    // Default to codeforces
    config = {
        site: "codeforces",
        profileRegex: /^\/profile\/([^/?#]+)/,
        profileTitleSelector: ".main-info h1, .title",
        linkSelector: "a[href*='/profile/']",
        realNameSelector: ".main-info div[style*='color: #777']"
    };
}

const HACKERRANK_RESERVED = ['challenges', 'domains', 'contests', 'dashboard', 'leaderboard', 'interview', 'skills-verification', 'work', 'settings', 'auth', 'login', 'logout', 'about', 'careers', 'community', 'privacy', 'terms', 'blog', 'forum', 'tracks', 'skills', 'certificates', 'campaign', 'events', 'hackathons', 'support', 'administration', 'scoring', 'test', 'feedback', 'rest', 'network'];

let StorageManager;
let currentDropdown = null;

// Initialize the content script after StorageManager is loaded
async function initContentScript() {
    try {
        const url = chrome.runtime.getURL('src/utils/storageManager.js');
        const module = await import(url);
        StorageManager = module.StorageManager;
        
        injectProfileEditor();
        chrome.storage.local.get(['showBadges'], (res) => {
            if (res.showBadges !== false) {
                injectNotesEverywhere();
            }
        });

        let debounceTimeout = null;
        const observer = new MutationObserver((mutations) => {
            // Ignore mutations caused by our own injections to prevent infinite loops
            const isSelfMutation = mutations.every(m => {
                const target = m.target;
                return target.classList && (target.classList.contains('cf-note-tag') || target.classList.contains('cf-note-profile-container') || target.closest('.cf-note-profile-container'));
            });
            
            if (isSelfMutation) return;

            if (debounceTimeout) clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                injectProfileEditor();
                chrome.storage.local.get(['showBadges'], (res) => {
                    if (res.showBadges !== false) {
                        injectNotesEverywhere();
                    }
                });
            }, 300);
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Listen for updates from background
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'STATE_SYNC_UPDATE') {
                // Refresh visuals if state changes
                injectProfileEditor();
                chrome.storage.local.get(['showBadges'], (res) => {
                    if (res.showBadges !== false) {
                        injectNotesEverywhere();
                    }
                });
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (currentDropdown && !currentDropdown.contains(e.target)) {
                currentDropdown.style.display = 'none';
            }
        });

    } catch (e) {
        console.error("[Constellation] Failed to load StorageManager", e);
    }
}

// Inject input box on profile page with dropdown search
async function injectProfileEditor() {
    const urlMatch = window.location.pathname.match(config.profileRegex);
    if (!urlMatch) return;

    const handle = urlMatch[1];
    
    // Prevent injecting textboxes on HackerRank or Kaggle system pages that mimic profile URLs
    const isSystemPage = (config.site === 'hackerrank' || config.site === 'kaggle') && HACKERRANK_RESERVED.includes(handle.toLowerCase());
    if (isSystemPage) {
        return;
    }

    const titleEl = document.querySelector(config.profileTitleSelector);

    if (titleEl && !document.querySelector(".cf-note-profile-container")) {
        const container = document.createElement("div");
        container.className = "cf-note-profile-container";
        container.style.display = "inline-block";
        container.style.position = "relative";
        container.style.marginLeft = "12px";
        container.style.verticalAlign = "middle";

        const label = document.createElement("div");
        label.textContent = "Constellation:";
        label.style.fontFamily = "'Brush Script MT', 'Segoe Script', cursive";
        label.style.fontSize = "18px";
        label.style.marginBottom = "4px";
        label.style.color = "inherit";
        label.style.opacity = "0.8";
        
        container.appendChild(label);

        const noteBox = document.createElement("input");
        noteBox.type = "text";
        noteBox.placeholder = "Enter friend's name...";
        noteBox.className = "cf-note-profile";
        noteBox.style.fontSize = "14px";
        noteBox.style.padding = "4px 8px";
        noteBox.style.border = "1px solid #ccc";
        noteBox.style.borderRadius = "4px";
        noteBox.style.fontWeight = "normal";
        noteBox.style.backgroundColor = "transparent";
        noteBox.style.color = "inherit";

        if (config.site === 'hackerrank' && titleEl.classList.contains('profile-sidebar')) {
            container.style.display = "block";
            container.style.marginLeft = "0";
            container.style.marginTop = "16px";
            container.style.width = "100%";
            noteBox.style.width = "100%";
            noteBox.style.boxSizing = "border-box";
            noteBox.style.padding = "8px 12px";
            noteBox.style.backgroundColor = "transparent";
            noteBox.style.color = "inherit"; // Inherit text color for dark mode
            noteBox.style.border = "1px solid #dcdcdc"; // match HackerRank border
        }

        const dropdown = document.createElement("div");
        dropdown.style.position = "absolute";
        dropdown.style.top = "100%";
        dropdown.style.left = "0";
        dropdown.style.width = "100%";
        dropdown.style.backgroundColor = "white";
        dropdown.style.border = "1px solid #ccc";
        dropdown.style.borderRadius = "0 0 4px 4px";
        dropdown.style.maxHeight = "150px";
        dropdown.style.overflowY = "auto";
        dropdown.style.display = "none";
        dropdown.style.zIndex = "1000";
        dropdown.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.1)";

        currentDropdown = dropdown;

        container.appendChild(noteBox);
        container.appendChild(dropdown);
        
        if (config.site === 'codeforces') {
            container.style.display = "block";
            container.style.marginLeft = "0";
            container.style.marginTop = "8px";
            container.style.marginBottom = "8px";
            container.style.boxSizing = "border-box";
            noteBox.style.padding = "4px 8px";
            noteBox.style.backgroundColor = "transparent";
            noteBox.style.color = "inherit";
            noteBox.style.border = "1px solid #dcdcdc";
            
            const mainInfo = titleEl.closest('.main-info');
            if (mainInfo) {
                mainInfo.insertAdjacentElement("afterend", container);
            } else {
                titleEl.insertAdjacentElement("afterend", container);
            }
        } else if (['leetcode', 'kaggle', 'geeksforgeeks'].includes(config.site)) {
            container.style.display = "block";
            container.style.marginLeft = "0";
            container.style.marginTop = "8px";
            container.style.marginBottom = "8px";
            container.style.width = "100%";
            noteBox.style.width = "100%";
            noteBox.style.boxSizing = "border-box";
            noteBox.style.padding = "8px 12px";
            noteBox.style.backgroundColor = "transparent";
            noteBox.style.color = "inherit";
            noteBox.style.border = "1px solid #dcdcdc";
            titleEl.insertAdjacentElement("afterend", container);
        } else {
            titleEl.appendChild(container);
        }

        // Load existing identity
        const identity = await StorageManager.getIdentityByHandle(config.site, handle);
        if (identity && identity.name) {
            noteBox.value = identity.name;
        } else {
            // Attempt to extract real name from DOM for autocomplete
            if (config.realNameSelector) {
                const nameEl = document.querySelector(config.realNameSelector);
                if (nameEl && nameEl.textContent) {
                    // Sometimes format is "Real Name, City", so we extract just the name part if possible
                    let extractedName = nameEl.textContent.trim().split(',')[0].trim();
                    if (extractedName && !extractedName.startsWith("From ")) {
                        noteBox.placeholder = `${extractedName} (Press Tab)`;
                        noteBox.dataset.autocomplete = extractedName;
                    }
                }
            }
        }

        noteBox.addEventListener("click", (e) => e.stopPropagation());
        dropdown.addEventListener("click", (e) => e.stopPropagation());

        let identitiesCache = null;
        let isSavingFromDropdown = false;
        let isSaving = false;
        let activeDropdownIndex = -1;

        const updateDropdownSelection = () => {
            const items = dropdown.querySelectorAll('.dropdown-item');
            items.forEach((item, i) => {
                if (i === activeDropdownIndex) {
                    item.style.backgroundColor = "#f0f0f0";
                } else {
                    item.style.backgroundColor = "transparent";
                }
            });
        };

        noteBox.addEventListener("input", async (e) => {
            activeDropdownIndex = -1;
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                dropdown.style.display = "none";
                return;
            }

            if (!identitiesCache) {
                const data = await StorageManager.getData();
                identitiesCache = Object.values(data.identities);
            }

            const matches = identitiesCache.filter(id => 
                id.name && id.name.toLowerCase().includes(query)
            );

            dropdown.innerHTML = "";
            if (matches.length > 0) {
                dropdown.style.display = "block";
                matches.forEach((match, index) => {
                    const item = document.createElement("div");
                    item.className = "dropdown-item";
                    item.textContent = match.name;
                    item.style.padding = "6px 8px";
                    item.style.cursor = "pointer";
                    item.style.borderBottom = "1px solid #eee";
                    item.style.fontSize = "13px";
                    item.style.color = "#333";
                    
                    item.addEventListener("mouseenter", () => {
                        activeDropdownIndex = index;
                        updateDropdownSelection();
                    });
                    item.addEventListener("mouseleave", () => {
                        activeDropdownIndex = -1;
                        updateDropdownSelection();
                    });
                    
                    // mousedown fires before blur, allowing us to set the flag
                    item.addEventListener("mousedown", () => {
                        isSavingFromDropdown = true;
                    });
                    
                    item.addEventListener("click", async () => {
                        noteBox.value = match.name;
                        dropdown.style.display = "none";
                        // Link handle to this selected existing contact
                        try {
                            await StorageManager.addHandleToIdentity(match.id, config.site, handle);
                        } catch (err) {
                            alert(err.message);
                        }
                        isSavingFromDropdown = false;
                    });
                    
                    dropdown.appendChild(item);
                });
            } else {
                dropdown.style.display = "none";
            }
        });

        // Save as new contact, update existing one, or delete handle
        const saveInput = async () => {
            if (isSavingFromDropdown || isSaving) return;
            isSaving = true;

            try {
                const val = noteBox.value.trim();
                const existing = await StorageManager.getIdentityByHandle(config.site, handle);
                
                dropdown.style.display = "none";

                if (!val) {
                    if (existing) {
                        // Deleting the text removes the handle from the identity
                        await StorageManager.removeHandleFromIdentity(existing.id, config.site, handle);
                        identitiesCache = null; // bust cache
                    }
                    return;
                }

                if (existing) {
                    if (existing.name !== val) {
                        existing.name = val;
                        await StorageManager.addOrUpdateIdentity(existing);
                    }
                } else {
                    // Check if an identity with this exact name already exists
                    let data = await StorageManager.getData();
                    let existingByName = Object.values(data.identities).find(id => id.name.toLowerCase() === val.toLowerCase());
                    
                    if (existingByName) {
                        // Link this handle to the existing contact (supporting multiple accounts)
                        await StorageManager.addHandleToIdentity(existingByName.id, config.site, handle);
                    } else {
                        // Create new fresh contact
                        await StorageManager.addOrUpdateIdentity({
                            name: val,
                            handles: { [config.site]: [handle] }
                        });
                    }
                }
                identitiesCache = null; // bust cache
            } finally {
                isSaving = false;
            }
        };

        noteBox.addEventListener("keydown", (e) => {
            const items = dropdown.querySelectorAll('.dropdown-item');
            
            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (dropdown.style.display === "block" && items.length > 0) {
                    activeDropdownIndex = (activeDropdownIndex + 1) % items.length;
                    updateDropdownSelection();
                }
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (dropdown.style.display === "block" && items.length > 0) {
                    activeDropdownIndex = (activeDropdownIndex - 1 + items.length) % items.length;
                    updateDropdownSelection();
                }
            } else if (e.key === "Tab" && !noteBox.value && noteBox.dataset.autocomplete) {
                e.preventDefault();
                noteBox.value = noteBox.dataset.autocomplete;
                // Just fill it in, they can press enter to save
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (dropdown.style.display === "block" && activeDropdownIndex >= 0 && items[activeDropdownIndex]) {
                    items[activeDropdownIndex].click();
                } else {
                    saveInput();
                    noteBox.blur();
                }
            }
        });
        
        noteBox.addEventListener("blur", saveInput);
    }
}

// Show name next to handle wherever it appears
async function injectNotesEverywhere() {
    const userLinks = document.querySelectorAll(config.linkSelector);
    
    // Process links asynchronously but avoid overlapping duplicate injections
    for (const link of userLinks) {
        if (link.dataset.noteInjecting === "true") continue;
        if (link.parentNode.querySelector(`.cf-note-tag[data-handle]`)) {
            link.dataset.noteInjecting = "true";
            continue;
        }

        let handle = link.dataset.cachedHandle;
        let pathToMatch = link.dataset.cachedPathToMatch;
        const href = link.getAttribute("href");
        
        if (!href) continue;

        if (!handle || !pathToMatch) {
            pathToMatch = href;
            try {
                const urlObj = new URL(href, window.location.origin);
                pathToMatch = urlObj.pathname + urlObj.search + urlObj.hash;
            } catch(e) {}

            const match = pathToMatch.match(config.profileRegex);
            if (!match) {
                link.dataset.noteInjecting = "true"; // mark as invalid so we skip next time
                continue;
            }
            
            handle = match[1];
            link.dataset.cachedHandle = handle;
            link.dataset.cachedPathToMatch = pathToMatch;
        }

        // Skip common non-profile links (especially important for HackerRank/Kaggle which uses broad match)
        const isSystemPage = (config.site === 'hackerrank' || config.site === 'kaggle') && HACKERRANK_RESERVED.includes(handle.toLowerCase());
        if (isSystemPage) {
            continue;
        }

        // Universally prevent injecting notes on sub-tab links (e.g. /username/history or /profile/username/info)
        // by verifying there are no extra path segments after the handle.
        let strictRegexStr = config.profileRegex.source;
        if (strictRegexStr.endsWith('$')) {
            strictRegexStr = strictRegexStr.slice(0, -1);
        }
        const strictRegex = new RegExp(strictRegexStr + '\\/?(?:[?#].*)?$');
        if (!strictRegex.test(pathToMatch)) {
            continue;
        }

        // Root cause fix: Structural/Navigation links vs User Mention links.
        // A user mention link's primary purpose is displaying the user's handle.
        // If the link text is completely different from the handle (like "Algorithm", "Submissions"),
        // it is a structural link and should NOT be annotated.
        const handleLower = handle.toLowerCase();
        const textContent = link.textContent.toLowerCase();
        const textNoSpace = textContent.replace(/\s+/g, '');
        
        let isUserMention = (textNoSpace === handleLower || textNoSpace === '@' + handleLower);
        
        if (!isUserMention) {
            // Check if the text contains the handle with word boundaries (handles names, stars like "★ tourist")
            const regex = new RegExp(`(^|[^a-z0-9_-])${handleLower}([^a-z0-9_-]|$)`);
            if (regex.test(textContent)) {
                isUserMention = true;
            }
        }
        
        if (!isUserMention) {
            continue;
        }

        if (link.parentNode.querySelector(`.cf-note-tag[data-handle="${handle}"]`)) continue;

        // Mark it tentatively so we don't fetch 100 times for the same handle while awaiting
        link.dataset.noteInjecting = "true";

        StorageManager.getIdentityByHandle(config.site, handle).then(identity => {
            if (!identity || !identity.name) return;
            
            if (link.parentNode.querySelector(`.cf-note-tag[data-handle="${handle}"]`)) return;

            const span = document.createElement("span");
            span.textContent = ` (${identity.name})`;
            span.className = "cf-note-tag";
            span.dataset.handle = handle;
            span.style.fontSize = "0.85em";
            span.style.color = "gray";
            span.style.marginLeft = "4px";
            span.style.fontWeight = "normal";

            link.insertAdjacentElement("afterend", span);
        }).catch(err => console.error(err));
    }
}

initContentScript();
