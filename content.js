// Configuration based on the current platform
const config = window.location.hostname.includes("atcoder.jp")
    ? {
        site: "atcoder",
        profileRegex: /^\/users\/([^/?#]+)/,
        profileTitleSelector: ".col-md-9 h3, .col-sm-9 h3, h3", 
        linkSelector: "a[href*='/users/']"
    }
    : {
        site: "codeforces",
        profileRegex: /^\/profile\/([^/?#]+)/,
        profileTitleSelector: ".main-info h1, .title",
        linkSelector: "a[href*='/profile/']"
    };

// Save a note for a handle
function saveNote(handle, note) {
    chrome.storage.sync.set({ [handle]: note });
}

// Load a note for a handle
function loadNote(handle, callback) {
    chrome.storage.sync.get([handle], (result) => {
        callback(result[handle] || "");
    });
}

// Inject input box on profile page
function injectProfileEditor() {
    const urlMatch = window.location.pathname.match(config.profileRegex);
    if (!urlMatch) return;

    const handle = urlMatch[1];
    const titleEl = document.querySelector(config.profileTitleSelector);

    // Prevent duplicate injection
    if (titleEl && !document.querySelector(".cf-note-profile")) {
        const noteBox = document.createElement("input");
        noteBox.type = "text";
        noteBox.placeholder = "Your note for this friend…";
        noteBox.className = "cf-note-profile";
        noteBox.style.marginLeft = "12px";
        noteBox.style.fontSize = "14px";
        noteBox.style.padding = "4px 8px";
        noteBox.style.border = "1px solid #ccc";
        noteBox.style.borderRadius = "4px";
        noteBox.style.fontWeight = "normal";

        // Load saved note
        loadNote(handle, (saved) => { noteBox.value = saved; });

        // Save on change
        noteBox.addEventListener("change", () => {
            saveNote(handle, noteBox.value);
        });
        
        // Prevent click events from propagating to parent links if nested
        noteBox.addEventListener("click", (e) => e.stopPropagation());

        titleEl.appendChild(noteBox);
    }
}

// Show note next to handle wherever it appears
function injectNotesEverywhere() {
    const userLinks = document.querySelectorAll(config.linkSelector);

    userLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (!href) return;

        // Extract handle from the URL, not textContent (prevents bug where badges disrupt the string)
        const match = href.match(config.profileRegex);
        if (!match) return;

        const handle = match[1];

        // Skip image links (e.g., profile avatars) or if already injected
        if (link.querySelector('img')) return;
        if (link.parentNode.querySelector(`.cf-note-tag[data-handle="${handle}"]`)) return;

        loadNote(handle, (note) => {
            if (!note) return; 

            // Double check to prevent race conditions during async load
            if (link.parentNode.querySelector(`.cf-note-tag[data-handle="${handle}"]`)) return;

            const span = document.createElement("span");
            span.textContent = ` (${note})`;
            span.className = "cf-note-tag";
            span.dataset.handle = handle;
            span.style.fontSize = "0.85em";
            span.style.color = "gray";
            span.style.marginLeft = "4px";
            span.style.fontWeight = "normal";

            link.insertAdjacentElement("afterend", span);
        });
    });
}

// Initial injection
injectProfileEditor();
injectNotesEverywhere();

// Use MutationObserver instead of setInterval to catch dynamic content (like paginated standings) immediately
const observer = new MutationObserver(() => {
    injectProfileEditor();
    injectNotesEverywhere();
});

// Observe the entire body for element changes
observer.observe(document.body, { childList: true, subtree: true });
