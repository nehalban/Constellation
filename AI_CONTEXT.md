# AI Context & Architecture Guidelines

Welcome! If you are an AI assistant tasked with modifying or understanding the `Constellation` codebase, read this document first. It outlines the architecture, common gotchas, and workflows to save you time.

## 1. Project Overview
**Constellation** is a Chrome extension that allows users to attach custom notes/friend mentions to user profiles across various competitive programming and data science platforms. It synchronizes cross-device via `chrome.storage.sync`.

### Supported Platforms:
* Codeforces
* AtCoder
* LeetCode
* HackerRank
* Kaggle (UI only, API disabled due to CSRF)
* GeeksForGeeks (GfG)

---

## 2. Codebase Structure

The project strictly follows Manifest V3 (MV3) architecture:

* **`manifest.json`**: Core config. Uses `"service_worker"` for the background script.
* **`src/content/content.js`**: Injected into pages. Responsible for rendering the "Constellation:" text box on profiles and finding/highlighting user handles on leaderboards.
* **`src/background/`**:
  * **`background.js`**: The service worker. Listens for messages from the popup/content scripts to fetch data.
  * **`api/index.js`**: The router that sends API requests to platform-specific scrapers.
  * **`api/{platform}.js`**: Platform-specific logic (e.g., `leetcode.js`, `gfg.js`). **Crucial:** Background fetching is subject to CORS and bot-protection unless the extension has host permissions for that platform!
  * **`api/utils.js`**: Contains a generic `RequestQueue` to ensure we don't spam APIs and trigger rate limits (especially for AtCoder/Codeforces).
* **`src/popup/`**: The frontend UI for the extension icon. Reads from `StorageManager` and sends messages to `background.js` to refresh data.
* **`src/utils/storageManager.js`**: Universal wrapper for `chrome.storage`. Used by content, popup, and background scripts.

---

## 3. Platform Quirks & Limitations (READ BEFORE EDITING)

If you are writing scrapers or UI injections, keep these heavily tested rules in mind:

### GeeksForGeeks (GfG)
* **Architecture**: Uses Next.js. The DOM dynamically re-renders heavily. Content scripts must use `MutationObserver` (handled in `content.js`) carefully to avoid infinite loops.
* **Timezones**: GfG returns timestamps without timezones. You **must** append `+05:30` to any raw date strings before parsing to avoid shifting dates backward into the previous day.
* **Dark Mode**: Managed via the `data-theme="dark"` attribute on the `<html>` tag.

### Kaggle
* **Architecture**: Single Page Application (SPA).
* **API Constraints**: Kaggle severely locks down its APIs. Fetching Kaggle from the background script throws a `400 Bad Request` because Kaggle strictly requires an `X-XSRF-TOKEN` cookie/header, which MV3 extensions cannot read without invasive `"cookies"` permissions.
* **Resolution**: Kaggle background fetches are explicitly disabled (returns `N/A`).

### HackerRank
* **Scraping**: Fetches public JSON models (e.g., `https://www.hackerrank.com/rest/contests/master/hackers/{handle}/profile`).
* **UI Injection**: HackerRank has system pages (like `/skills/verification`) that mimic profile URLs. Ensure `content.js` explicitly checks `window.location.pathname.includes('/profile/')` and handles `404` errors cleanly.

### LeetCode
* **Scraping**: Uses a public GraphQL API (`https://leetcode.com/graphql`). Highly reliable.

---

## 4. UI/UX Rules

1. **Dark Mode Integration**: Do NOT apply static inline styles for text colors. Always inject a dynamic `<style>` block matching the site's dark mode classes (e.g., `html[data-theme="dark"]` for GfG, or `.dark` for Tailwind sites).
2. **Badge Highlighting**: The core functionality of highlighting handles across platforms is handled by `isLinkUserMention()` inside `content.js`.
3. **No Unnecessary Scrapes**: Only use background fetching for stats that the platform natively surfaces (rating, last active). Do not implement complex multi-page scraping in the background worker to avoid rate limits.

---

## 5. Typical Workflow for Modifying API Logic

If asked to fix a stat scraper:
1. Check `src/background/api/{platform}.js`.
2. Remember that background scripts execute outside of the DOM. You cannot use `DOMParser` cleanly. Use Regex to extract data from HTML, or preferably find the site's REST/GraphQL API.
3. Test edge cases where the user does not exist (HTTP 404).

*Happy Coding!*
