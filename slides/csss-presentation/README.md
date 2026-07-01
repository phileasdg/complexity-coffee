# Interactive Web Presentation Framework

This repository contains a lightweight, minimalist, and high-performance framework for building interactive web-based presentations. It is designed to host complex, data-driven visualizations (such as D3.js force-directed graphs) alongside full-page responsive webpage embeds, unified by glassmorphic controls, keyboard presentation shortcuts, and hash-based URL routing.

---

## 📂 Project Organization & Directory Structure

```text
├── index.html                  # Main presentation template (static container skeleton)
├── styles.css                  # Modern light-themed glassmorphic design system
├── app.js                      # Presentation data loader, dynamic DOM builder & slide routing
├── d3.v7.min.js                # Local D3.js library copy for fast offline rendering
├── server.py                   # Python web server & layout coordinate saver API
│
└── data/                       # Presentation Configuration & Data Folder (Intentional & Structured)
    ├── slides.json             # Slide configurations (titles, descriptions, iframe paths, options)
    ├── data_anonymized.json    # Complexity Global School network raw data
    └── layout_positions.json   # Pre-computed static nodes coordinates mapping
```

---

## 🚀 How the Slideshow Framework Works

1. **Dynamic DOM Rendering**: At startup, `app.js` fetches `data/slides.json`. For every slide defined with `"type": "embed"`, the JS engine programmatically constructs and appends the slide container, context sidebar, links, dynamic QR code image, and interactive iframe wrapper to the page—eliminating duplicate layout code.
2. **State-Driven Visibility**: Slides are styled as overlay sheets. Active slides are made visible while inactive slides have the `.hidden` class applied, which sets their opacity to `0` and overrides pointer events to prevent clicking unseen elements.
3. **Smooth Canvas Transitions**: When transitioning from graph slides to embed slides, the D3 SVG canvas container (`#graph-3d`) smoothly fades out over `450ms` using CSS transitions, yielding complete control and focus to the active interactive iframe.
4. **Presenter Keyboard Mapping**: The system listens to global window keys. Standard presenter remotes/clickers or keyboard buttons will trigger transitions:
   - **Next Slide**: `ArrowRight`, `Space`, `PageDown`
   - **Previous Slide**: `ArrowLeft`, `Backspace`, `PageUp`
5. **URL Hash Routing**: Slide changes update the URL location hash (e.g., `#/slide/3`). When the presentation loads, or when the user navigates using the browser's Back/Forward buttons, the hash is matched and synchronizes the slideshow deck state automatically.

---

## 🛠️ Step-by-Step: Customizing & Adding Slides

To add or edit slides in this presentation, open [data/slides.json](file:///Users/phileasdazeleygaist/Desktop/My%20Websites/csss%20presentation/data/slides.json) and modify or add objects to the slide array:

- **For Graph slides (D3 network visualizer)**:
  ```json
  {
    "type": "graph",
    "title": "Slide Title Header",
    "subtitle": "Slide Subtitle Description",
    "showNameLabel": true
  }
  ```
- **For Embed slides (Iframe webpage)**:
  ```json
  {
    "type": "embed",
    "title": "Slide Header Title",
    "subtitle": "Slide Header Subtitle",
    "iframeUrl": "relative/path/to/website/index.html",
    "sidebar": {
      "title": "Sidebar Header",
      "paragraphs": [
        "Paragraph 1 text description...",
        "Paragraph 2 HTML-enabled details..."
      ],
      "link": "https://example.com",
      "linkLabel": "Open Live Site",
      "qrCodeUrl": "https://example.com"
    }
  }
  ```

The presentation engine will automatically calculate slide boundaries, populate the slide controls indicators (`1 / N`), render the HTML sidebar paragraphs, and wire up the URL hashes.

---

## 🌐 Embedding Interactive Web Projects

To embed interactive web applications or visualizations within the presentation slide deck:

### Option A: Hosted Webpage URL (Recommended & Zero Copy)
You can directly link to the public URLs of your web applications (e.g., hosted on GitHub Pages) by setting the `iframeUrl` parameter in `data/slides.json`:
```json
"iframeUrl": "https://phileasdg.github.io/sympoietic-art-organism/"
```
This is the cleanest approach, as it keeps your presentation folder completely self-contained and free of duplicate folders or symlinks.

### Option B: Local Symbolic Linking (For Offline Development)
If you want to run the presentation offline or test local changes to the sub-projects, you can link the directories locally:
1. Create a symbolic link (symlink) in your presentation workspace pointing directly to the target website folder:
   ```bash
   ln -s "/Users/phileasdazeleygaist/Desktop/My Websites/global-trade-network" "global-trade-network"
   ```
2. In `data/slides.json`, update the `iframeUrl` to use the relative path:
   ```json
   "iframeUrl": "global-trade-network/index.html"
   ```

### 🧹 Clean Embeds using Iframe Detection
To ensure the embedded website's own UI controls, navigation menus, and header bars are hidden when shown inside the slide deck, we use client-side iframe detection in the target projects. 

Add this small detection script and styling block to the `<head>` of the original website's `index.html` file:
```html
<script>
  // Detect if running inside an iframe, and set root element helper class
  if (window.self !== window.top) {
    document.documentElement.classList.add('embed-mode');
  }
</script>
<style>
  /* Embed mode overrides to hide headers, sidebars, and control panels */
  .embed-mode #menu,
  .embed-mode #panel-container,
  .embed-mode #legend,
  .embed-mode .desktop-search,
  .embed-mode #cycle-section,
  .embed-mode #breathing-toggle,
  .embed-mode #theme-toggle,
  .embed-mode #node-details-panel,
  .embed-mode #top-right-controls,
  .embed-mode .modal-overlay {
    display: none !important;
  }
</style>
```
Because this script runs inside the child document itself, it works instantly across both online URLs and local servers without triggering browser CORS blocks. The menus will only hide when loaded in the presentation slides; visiting the visualizers directly as standalone websites remains fully functional.

---

## 🎨 Customizing the Network Graph Physics

The default D3 force-directed layout simulation runs with specific gravity and repulsion coefficients optimized to distribute project components cleanly. 

- **Static Coordinates**: When `layout_positions.json` is present, the simulation pins all nodes to their pre-computed positions so the layout remains fixed.
- **Pinning Layout Changes**: If you drag and reposition nodes, they will remain locked (`fx = x`, `fy = y`) in their new positions.
- **Saving Layout Coordinates**:
  1. Start the local server (`python3 server.py`).
  2. Perform layout coordinate adjustments on the graph by dragging nodes to your desired positions.
  3. Send a POST request to `/save-layout` or write a custom JS trigger. (The helper endpoint in `server.py` writes coordinates directly to `layout_positions.json`).

---

## 🖥️ Local Execution & Server

To run the presentation and support JSON data calls, start the Python server from your terminal:

```bash
python3 server.py
```

Open your browser and navigate to:
👉 **[http://localhost:8080/](http://localhost:8080/)**
