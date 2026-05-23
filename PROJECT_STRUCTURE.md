# Complexity Coffee Website - Project Structure & Architecture

This document describes the directory layout, files, and architectural patterns of the Complexity Coffee website.

---

## 1. Directory Structure

```
complexity-coffee/
├── index.html              # Main single-page application entry point
├── CNAME                   # Custom domain mapping
├── NAMING_SCHEME.md        # Documentation for file and asset naming conventions
├── README.md               # Basic project readme
├── TODOs.md                # Project TODO list
├── PROJECT_STRUCTURE.md    # This file (project documentation)
├── css/
│   └── style.css           # Custom SFI theme styles, animations, and modal variables
├── js/
│   └── app.js              # Core application logic, data fetching, template rendering, and routing
├── data/
│   ├── event-formats.json  # Data defining the distinct event formats
│   ├── events.json         # Array of all past and upcoming event objects
│   ├── team.json           # Array of all team members and organizer biographies
│   └── complexity-coffee-data.nb # Wolfram Mathematica notebook data source (historical reference)
└── img/
    ├── general/            # Abstract background textures (marbles, tiles, collages, paint)
    ├── people/             # External speaker profile pictures
    ├── team/               # Team member profile pictures
    └── events/             # Thumbnail illustrations for events grouped by type
        ├── community-talks/
        ├── nascent-research/
        ├── speaker-series/
        └── workshops/
```

---

## 2. Core Architecture

The website is designed as a **dynamic, client-side single-page application (SPA)** that utilizes Tailwind CSS (loaded via CDN) and vanilla JavaScript.

### A. Routing & Navigation
* **Hash-based Routing:** Routing is driven by the URL hash (e.g., `#archive`, `#team`, `#event=ct-1-6`, `#series=Guest%20Talks`).
* **Hash Change Listener:** `js/app.js` registers a global `hashchange` event listener that parses the hash and triggers the appropriate view updates.
* **Page Navigation:** Page transitions toggle the `.is-active` class on elements with the `data-page` attribute (e.g., `home`, `archive`, `team`).
* **Section Scrolling:** If a hash refers to a section on the home page (e.g., `#about`), the script scrolls to it smoothly with a buffer for the sticky header.

### B. Modals (Dynamic Overlays)
Modals are managed dynamically by setting hashes which are intercepted by the hash router:
* **Event Modal:** Displays full event details, speaker taglines, external links (e.g., YouTube recordings, Zoom registration), and descriptions.
* **Series Modal:** Lists all events belonging to a specific category (e.g., Guest Talks).
* **Speaker List Modal:** Secondary modal showing all speakers when there are more than two.
* **Team Modal:** Displays full organizer biographies and links.

### C. Data Management & Lifecycle
1. **Fetch Time:** On page load, `js/app.js` queries `https://worldtimeapi.org/api/ip` to determine the true UTC time. It falls back to the user's local system time if the API fails.
2. **Fetch Data:** It fetches the JSON data sources (`events.json`, `team.json`, `event-formats.json`) asynchronously.
3. **Cache & Process:** Data is stored in local caches (`allEventsCache`, `allTeamDataCache`). Timestamps are normalized to milliseconds, and a helper determines if an event is in the past or future relative to the fetched true time.
4. **Render:**
   * **Upcoming Events:** Future events are sorted chronologically (ascending) and rendered on the home page and archive page. If no upcoming events are scheduled, the section is automatically hidden.
   * **Past Events:** Sorted reverse-chronologically (descending) and rendered in the archive list.
   * **Team Members:** Sorted alphabetically by name and rendered on the team page.

---

## 3. Styling & Theme Philosophy

* **SFI Brand Palette:** The styling mimics the Santa Fe Institute (SFI) aesthetic, featuring:
  * **Ming (Navy):** `#003d5b` (Headers/Footers background)
  * **Sea (Teal):** `#00a9b7` (CTA accents, tags)
  * **Turmeric (Gold):** `#f5a623` (Guest talks tags)
  * **Eggplant (Purple):** `#3c1053` (Workshops tags)
  * **Warm gray/off-white background:** `#ecebe6`
* **Typography:** Modern high-contrast pairings:
  * Display: *Playfair Display* (Serif, heavy weight) for headings and titles.
  * Body: *Inter* (Sans-serif) for readable descriptions.
* **Card Scrims & Micro-animations:**
  * Cards use a subtle scrim overlay (`rgba(0, 0, 0, 0.4)`) and hover scale zoom transitions on thumbnail images to keep the interface engaging and responsive.
