# Constellation 🌌
A Chrome extension that takes the guesswork out of wacky competitive programming handles. Constellation links real names to user profiles across multiple platforms and displays those names everywhere the handle appears, keeping your network clear and organized.

## 🚀 Quick Install

[Install Constellation from the Chrome Web Store](https://chrome.google.com/webstore/detail/biehdabknjilldfnmghpilieknabgclh), then pin it to your toolbar and start building your contacts list!

### Install from source

1. Download or clone this repository to your machine.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle Developer mode on in the top right corner.
4. Click `Load unpacked` and select the Constellation extension folder.

## 📸 See it in Action
![Codeforces friends page](screenshots/cf%20friends%20page.png)
![Extension popup interface](screenshots/popup%20home%20light%20mode.png)
![Contact details in popup](screenshots/contact%20in%20popup.png)
![HackerRank interface](screenshots/Text%20box%20on%20HackerRank.png)
![Codeforces problem status](screenshots/friend%20status%20on%20cf%20problem.png)

## ✨ Key Features at a Glance
- **No More Guessing:** Real names render inline next to usernames everywhere—leaderboards, standings, and comments.

- **Unified Contacts Dashboard:** Use the extension popup as your master directory. All of a person's linked handles are grouped in one place, allowing you to open any of their profiles on any platform in a single click.

- **Platform Leaderboards:** View your friends' ratings and last active statuses directly inside the extension. Sort by Alphabetical, Rating, or Last Active.

- **Problem Context Banner (Codeforces):** Click the extension while viewing any Codeforces problem and instantly see exactly which of your friends have attempted or solved it.

- **Custom Lists & Filtering:** Organize your contacts into groups (e.g., "Study Group", "Rivals"). Filter your master directory or platform leaderboards by these custom lists!

- **Smart Suggestions:** Link multiple handles across different platforms to a single person. Suggests existing contacts and auto-extracts real names from profiles as you type.

- **Data Management:** Export your entire contact directory as a JSON backup, import data seamlessly, or clear your history from the Settings view.

- **Universal Platform Support:** Works flawlessly across Codeforces, AtCoder, LeetCode, HackerRank, Kaggle, and GeeksforGeeks.

- **Smart Dark Mode Integration:** Automatically adapts to the native dark mode of platforms like GeeksforGeeks and Kaggle so your notes and textboxes are always readable.

- **Cross-Device Sync:** Your contacts are automatically synchronized across all your Chrome browsers.

- **Privacy First:** All data is strictly kept in your browser's local sync storage. No external servers, no tracking.

## 📁 Directory Structure
```
constellation/
├── src/
│   ├── background/
│   │   ├── api/
│   │   │   ├── index.js
│   │   │   ├── queue.js
│   │   │   └── [platform-specific].js
│   │   └── background.js
│   ├── content/
│   │   └── content.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   ├── popup.js
│   │   └── settings.js
│   └── utils/
│       └── storageManager.js
├── assets/
│   └── images/
│       ├── logo.png
│       ├── logo_icon.png
│       └── Platform Logos/
├── screenshots/
│   └── Screenshot*.png
├── AI_CONTEXT.md
└── manifest.json
```

## 💡 How to Use
1. Visit any user's profile page (e.g., `/profile/username` on Codeforces, `/users/username` on AtCoder, `/u/username` on LeetCode, etc.).
2. You'll see a "Constellation:" label and a text input box near the user's name/title.
3. Type the user's real name and press Enter. The extension will automatically link this handle to their identity.
4. Click the Constellation extension icon in your browser to open the popup dashboard.
5. Explore the Master Directory, Platform Leaderboards, Custom Lists, and Settings!

## 🛠️ Under the Hood
Constellation is built to be lightweight and fast so it never bogs down your browser during a contest.

- **Architecture:** Fully upgraded to and compliant with Manifest V3. The popup UI is built using ES modules for a clean, modular codebase.

- **Rate Limiting Engine:** A custom background `RequestQueue` strictly throttles API requests (e.g., Codeforces) to prevent HTTP 429/503 limits and IP bans while aggregating stats.

- **Dynamic Rendering:** Heavily utilizes heavily-optimized, debounced `MutationObserver`s to handle complex single-page application behaviors without creating infinite loops or performance bottlenecks.

- **Data Persistence:** Leverages the native `chrome.storage.sync` API for seamless cross-device synchronization.

- **Safe Parsing:** Caches regex-based URL parsing results directly on DOM elements to avoid CPU-heavy recalculations while you scroll.

## Privacy
All notes are stored locally in your browser's sync storage. No data is sent to external servers, and the extension runs solely on the designated domains.

## 🤝 How to Contribute
Constellation is open-source and community-driven! Whether you want to add support for a new competitive programming platform, optimize the DOM logic, or fix a UI bug, contributions are highly encouraged.

To get started:

1. Fork the repository.
2. Create a new branch for your feature (`git checkout -b feature/NewPlatformSupport`).
3. Commit your changes (`git commit -m 'Add support for Platform X'`).
4. Push to your branch (`git push origin feature/NewPlatformSupport`).
5. Open a Pull Request detailing your changes.

If you've found a bug or have a major feature idea, please open an Issue first so we can discuss the implementation!
