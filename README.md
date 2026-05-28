# Constellation 🌌
A Chrome extension that takes the guesswork out of wacky competitive programming handles. Constellation links real names to user profiles across multiple platforms and displays those names everywhere the handle appears, keeping your network clear and organized.

## 📸 See it in Action
![Codeforces profile interface](<screenshots/Screenshot 2026-05-28 221112.png>)
![Extension popup interface](<screenshots/Screenshot 2026-05-28 221145.png>)
![HackerRank profile interface](<screenshots/Screenshot 2026-05-28 221213.png>)

## ✨ Key Features at a Glance
- **No More Guessing:** Real names render inline next to usernames everywhere—leaderboards, standings, and comments.

- **Unified Contacts Dashboard:** Use the extension popup as your master directory. All of a person's linked handles are grouped in one place, allowing you to open any of their profiles on any platform in a single click.

- **Smart Suggestions:** Link multiple handles across different platforms to a single person. Suggests existing contacts and auto-extracts real names from profiles as you type.

- **Universal Platform Support:** Works flawlessly across Codeforces, AtCoder, LeetCode, HackerRank, Kaggle, and GeeksforGeeks.

- **Cross-Device Sync:** Your contacts are automatically synchronized across all your Chrome browsers.

- **Privacy First:** All data is strictly kept in your browser's local sync storage. No external servers, no tracking.

## 📁 Directory Structure
```
constellation/
├── src/
│   ├── background/
│   │   └── background.js
│   ├── content/
│   │   └── content.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── utils/
│       └── storageManager.js
├── assets/
│   └── images/
│       ├── logo.png
│       ├── logo_icon.png
│       └── Platform Logos/
├── screenshots/
│   └── Screenshot*.png
└── manifest.json
```

## 🛠️ Under the Hood
Constellation is built to be lightweight and fast so it never bogs down your browser during a contest.

- **Architecture:** Fully upgraded to and compliant with Manifest V3.

- **Dynamic Rendering:** Heavily utilizes MutationObserver to handle complex, single-page application behaviors. This ensures names render instantly on paginated standings and dynamic AJAX content without performance bottlenecks.

- **Data Persistence:** Leverages the native chrome.storage.sync API for seamless cross-device synchronization without the need for a custom backend.

- **Safe Parsing:** Implements regex-based URL parsing and precise platform detection logic to inject DOM elements cleanly without breaking native site badges or UI layouts.

## 🚀 Quick Install

1. Download or clone this repository to your machine.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle Developer mode on in the top right corner.
4. Click `Load unpacked` and select the Constellation extension folder.
5. Pin the extension to your toolbar and start building your contacts list!

## Privacy
All notes are stored locally in your browser's sync storage. No data is sent to external servers, and the extension runs solely on the designated domains.

## 🤝 How to Contribute
Constellation is open-source and community-driven! Whether you want to add support for a new competitive programming platform, optimize the DOM logic, or fix a UI bug, contributions are highly encouraged.

To get started:

1. Fork the repository.

2. Create a new branch for your feature (git checkout -b feature/NewPlatformSupport).
3. Commit your changes (git commit -m 'Add support for Platform X').
4. Push to your branch (git push origin feature/NewPlatformSupport).
5. Open a Pull Request detailing your changes.

If you've found a bug or have a major feature idea, please open an Issue first so we can discuss the implementation!








## How to Use
1. Visit any user's profile page (e.g., `/profile/username` on CF, `/users/username` on AtCoder, `/u/username` on LeetCode, `/profile/username` on HackerRank, `/username` on Kaggle, or `/user/username` on GeeksforGeeks)
2. You'll see a "Constellation:" label and a text input box near the user's name/title
3. Type your note and press Enter or click outside the box to save


