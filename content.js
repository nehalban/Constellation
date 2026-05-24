// Configuration based on the current platform
const config = window.location.hostname.includes("atcoder.jp")
    ? {
        site: "atcoder",
        profileRegex: /^\/users\/([^/?#]+)/,
        profileTitleSelector: ".col-md-9 h3, .col-sm-9 h3, h3", 
        linkSelector: "a[href*='/users/']",
        realNameSelector: ".dl-table tr:first-child td"
    }
    : {
        site: "codeforces",
        profileRegex: /^\/profile\/([^/?#]+)/,
        profileTitleSelector: ".main-info h1, .title",
        linkSelector: "a[href*='/profile/']",
        realNameSelector: ".main-info div[style*='color: #777']"
    };

let StorageManager;
let currentDropdown = null;

// Initialize the content script after StorageManager is loaded
async function initContentScript() {
    try {
        const url = chrome.runtime.getURL('storageManager.js');
        const module = await import(url);
        StorageManager = module.StorageManager;
        
        injectProfileEditor();
        injectNotesEverywhere();

        const observer = new MutationObserver(() => {
            injectProfileEditor();
            injectNotesEverywhere();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Listen for updates from background
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'STATE_SYNC_UPDATE') {
                // Refresh visuals if state changes
                injectProfileEditor();
                injectNotesEverywhere();
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
    const titleEl = document.querySelector(config.profileTitleSelector);

    if (titleEl && !document.querySelector(".cf-note-profile-container")) {
        const container = document.createElement("div");
        container.className = "cf-note-profile-container";
        container.style.display = "inline-block";
        container.style.position = "relative";
        container.style.marginLeft = "12px";

        const noteBox = document.createElement("input");
        noteBox.type = "text";
        noteBox.placeholder = "Enter friend's name...";
        noteBox.className = "cf-note-profile";
        noteBox.style.fontSize = "14px";
        noteBox.style.padding = "4px 8px";
        noteBox.style.border = "1px solid #ccc";
        noteBox.style.borderRadius = "4px";
        noteBox.style.fontWeight = "normal";

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
        titleEl.appendChild(container);

        // Load existing identity
        const identity = await StorageManager.getIdentityByHandle(config.site, handle);
        if (identity && identity.name) {
            noteBox.value = identity.name;
        } else {
            // Attempt to extract real name from DOM for autocomplete
            const nameEl = document.querySelector(config.realNameSelector);
            if (nameEl && nameEl.textContent) {
                // Sometimes format is "Real Name, City", so we extract just the name part if possible
                let extractedName = nameEl.textContent.trim().split(',')[0].trim();
                if (extractedName) {
                    noteBox.placeholder = `${extractedName} (Press Tab)`;
                    noteBox.dataset.autocomplete = extractedName;
                }
            }
        }

        noteBox.addEventListener("click", (e) => e.stopPropagation());
        dropdown.addEventListener("click", (e) => e.stopPropagation());

        let identitiesCache = null;
        let isSavingFromDropdown = false;
        let isSaving = false;

        noteBox.addEventListener("input", async (e) => {
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
                matches.forEach(match => {
                    const item = document.createElement("div");
                    item.textContent = match.name;
                    item.style.padding = "6px 8px";
                    item.style.cursor = "pointer";
                    item.style.borderBottom = "1px solid #eee";
                    item.style.fontSize = "13px";
                    item.style.color = "#333";
                    
                    item.addEventListener("mouseenter", () => item.style.backgroundColor = "#f0f0f0");
                    item.addEventListener("mouseleave", () => item.style.backgroundColor = "transparent");
                    
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
            if (e.key === "Tab" && !noteBox.value && noteBox.dataset.autocomplete) {
                e.preventDefault();
                noteBox.value = noteBox.dataset.autocomplete;
                // Just fill it in, they can press enter to save
            } else if (e.key === "Enter") {
                e.preventDefault();
                saveInput();
                noteBox.blur();
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
        const href = link.getAttribute("href");
        if (!href) continue;

        const match = href.match(config.profileRegex);
        if (!match) continue;

        const handle = match[1];

        if (link.querySelector('img')) continue;
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
