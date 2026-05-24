import { StorageManager } from './storageManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('contacts-list');
    const searchInput = document.getElementById('search');

    let contacts = [];

    // Fetch and render data
    const loadContacts = async () => {
        try {
            const data = await StorageManager.getData();
            contacts = Object.values(data.identities).sort((a, b) => 
                (a.name || '').localeCompare(b.name || '')
            );
            renderContacts(contacts);
        } catch (error) {
            console.error("Failed to load contacts:", error);
            listContainer.innerHTML = `<div class="empty-state"><p>Error loading contacts.</p></div>`;
        }
    };

    const renderContacts = (contactsToRender) => {
        listContainer.innerHTML = '';

        if (contactsToRender.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                    <p>No contacts found.</p>
                </div>
            `;
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
            deleteBtn.innerHTML = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            `;
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete ${contact.name}?`)) {
                    try {
                        await StorageManager.deleteIdentity(contact.id);
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
                        }
                        
                        if (logoSrc) {
                            badge.innerHTML = `<img src="${logoSrc}" alt="${platform} logo" class="platform-logo"> <span class="handle-text">${handle}</span>`;
                        } else {
                            badge.textContent = `${platform}: ${handle}`;
                        }
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

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = contacts.filter(c => {
            const nameMatch = c.name && c.name.toLowerCase().includes(query);
            const notesMatch = c.notes && c.notes.toLowerCase().includes(query);
            
            // Check handles for matches
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
    });

    // Listen for background updates to stay in sync dynamically without reopening popup
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync') {
            loadContacts();
        }
    });

    await loadContacts();
});
