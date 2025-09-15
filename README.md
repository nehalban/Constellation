# Codeforces Friend Notes

A Chrome browser extension that allows you to add personal notes to your Codeforces friends. These notes are visible everywhere on the site and sync across all your devices.

## Features

- **Add personal notes** to any Codeforces user on their profile page
- **See notes everywhere** - notes appear next to usernames throughout the site (standings, comments, etc.)
- **Cross-device sync** - your notes are automatically synced across all your Chrome browsers
- **Lightweight and fast** - minimal impact on page loading
- **Clean interface** - notes appear as subtle gray text next to usernames

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension is now installed and active on Codeforces

## How to Use

### Adding Notes
1. Visit any Codeforces user's profile page (`/profile/username`)
2. You'll see a text input box next to the user's name/title
3. Type your note and press Enter or click outside the box to save
4. The note is automatically saved and will sync across your devices

### Viewing Notes
- Notes appear as gray text in parentheses next to usernames throughout Codeforces
- You'll see them in:
  - Contest standings
  - Comment sections
  - User lists
  - Anywhere a profile link appears

## Screenshots

*Add screenshots here showing:*
- *The note input box on a profile page*
- *Notes appearing in contest standings*
- *Notes in comment sections*

## Technical Details

### Files
- `manifest.json` - Extension configuration and permissions
- `content.js` - Main functionality for injecting notes and saving data

### Permissions
- `storage` - Required to save and sync notes across devices using Chrome's sync storage

### Browser Compatibility
- Chrome (Manifest V3)
- Other Chromium-based browsers (Edge, Brave, etc.)

## Privacy

- All notes are stored locally in your browser's sync storage
- No data is sent to external servers
- Notes are only visible to you
- Extension only runs on Codeforces.com domains

## Development

### Project Structure
```
CodeForces-Friend-notes/
├── manifest.json     # Extension manifest
├── content.js        # Main content script
└── README.md         # This file
```

### Key Functions
- `saveNote(handle, note)` - Saves a note for a specific user
- `loadNote(handle, callback)` - Retrieves a saved note
- `injectProfileEditor()` - Adds note input box to profile pages
- `injectNotesEverywhere()` - Shows notes next to usernames site-wide

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Some ideas for improvements:

- [ ] Support for note categories/tags
- [ ] Import/export functionality
- [ ] Note search feature
- [ ] Custom note colors
- [ ] Firefox support

## Issues

If you encounter any problems or have feature requests, please open an issue on GitHub.

## License

This project is open source. Feel free to use, modify, and distribute as needed.

## Changelog

### v1.2
- Current version with cross-device sync
- Notes appear everywhere on the site
- Improved performance with periodic injection

---

**Made with ❤️ for the Codeforces community**