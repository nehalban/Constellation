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
    const urlMatch = window.location.pathname.match(/^\/profile\/([^/]+)/);
    if (!urlMatch) return;

    const handle = urlMatch[1];
    const titleEl = document.querySelector(".title, .main-info h1");

    if (titleEl && !document.querySelector(".cf-note-profile")) {
        const noteBox = document.createElement("input");
        noteBox.type = "text";
        noteBox.placeholder = "Your note for this friend…";
        noteBox.className = "cf-note-profile";
        noteBox.style.marginLeft = "12px";
        noteBox.style.fontSize = "14px";
        noteBox.style.padding = "4px 6px";

        // Load saved note
        loadNote(handle, (saved) => { noteBox.value = saved; });

        // Save on change
        noteBox.addEventListener("change", () => {
            saveNote(handle, noteBox.value);
        });

        titleEl.appendChild(noteBox);
    }
}

// Show note next to handle wherever it appears
function injectNotesEverywhere() {
    const userLinks = document.querySelectorAll("a[href*='/profile/']");

    userLinks.forEach(link => {
        const handle = link.textContent.trim();

        // Skip if already injected
        if (link.parentNode.querySelector(`.cf-note-tag[data-handle="${handle}"]`)) return;

        loadNote(handle, (note) => {
            if (!note) return; // Only show if user has a note

            const span = document.createElement("span");
            span.textContent = ` (${note})`;
            span.className = "cf-note-tag";
            span.dataset.handle = handle;
            span.style.fontSize = "11px";
            span.style.color = "gray";
            span.style.marginLeft = "3px";

            link.insertAdjacentElement("afterend", span);
        });
    });
}

// Run once + periodically (for dynamic content like standings)
document.addEventListener("DOMContentLoaded", () => {
    injectProfileEditor();
    injectNotesEverywhere();
});
setInterval(() => {
    injectProfileEditor();
    injectNotesEverywhere();
}, 2000);

