# CP Friend Notes (Codeforces & AtCoder)

A Chrome browser extension that allows you to add personal notes to your Codeforces and AtCoder friends. These notes are visible everywhere on the site and sync across all your devices.

## Features

- **Multi-Platform Support** - Works seamlessly on both Codeforces.com and AtCoder.jp
- **Add personal notes** to any user on their profile page
- **See notes everywhere** - Notes appear next to usernames throughout the site (standings, comments, etc.)
- **Cross-device sync** - Your notes are automatically synced across all your Chrome browsers via `chrome.storage.sync`
- **Dynamic DOM Handling** - Uses `MutationObserver` to instantly render notes on paginated standings and dynamic AJAX content without slowing down the page

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension is now active on Codeforces and AtCoder!

## How to Use

### Adding Notes
1. Visit any user's profile page (e.g., `/profile/username` on CF, `/users/username` on AtCoder)
2. You'll see a text input box next to the user's name/title
3. Type your note and press Enter or click outside the box to save

### Viewing Notes
Notes appear as gray text in parentheses next to usernames. You'll see them in contest standings, comment sections, user lists, and anywhere a profile link is referenced.

## Technical Details

- `manifest.json` - Upgraded to Manifest V3 permissions
- `content.js` - Contains platform detection logic, regex-based URL parsing to avoid badge/text conflict bugs, and `MutationObserver` to handle single-page application behavior smoothly.

## Privacy
All notes are stored locally in your browser's sync storage. No data is sent to external servers, and the extension runs solely on the designated domains.
