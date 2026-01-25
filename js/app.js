// We wrap everything in a DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {

    // =======================================================
    // === 1. NON-DATA-DEPENDENT UI (Menu, Page Switching)
    // =======================================================

    // --- Global Elements ---
    const body = document.body;

    // --- Mobile Menu Elements ---
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');

    // --- Mobile Menu Logic ---
    function openMenu() {
        menuButton.classList.add('is-active');
        menuButton.setAttribute('aria-expanded', 'true');
        mobileMenu.classList.add('is-open');
        mobileMenu.setAttribute('aria-hidden', 'false');
        overlay.classList.remove('hidden');
        body.style.overflow = 'hidden';
    }

    function closeMenu() {
        menuButton.classList.remove('is-active');
        menuButton.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('is-open');
        mobileMenu.setAttribute('aria-hidden', 'true');
        overlay.classList.add('hidden');
        body.style.overflow = '';
    }

    menuButton.addEventListener('click', () => {
        mobileMenu.classList.contains('is-open') ? closeMenu() : openMenu();
    });

    overlay.addEventListener('click', closeMenu);
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // --- Page Switching Logic ---
    window.showPage = (pageId, anchor) => {
        // Set the active page
        document.querySelectorAll('[data-page]').forEach(page => page.classList.remove('is-active'));
        const targetPage = document.querySelector(`[data-page="${pageId}"]`);
        if (targetPage) targetPage.classList.add('is-active');

        // Note: We removed clearHash() here because handleHashChange drives this now.

        if (anchor) {
            setTimeout(() => {
                const element = document.querySelector(anchor);
                if (element) element.scrollIntoView({ behavior: 'smooth' });
            }, 50);
        } else {
            window.scrollTo(0, 0);
        }
    }

    // =======================================================
    // === 2. MODAL & DYNAMIC CONTENT LOGIC
    // =======================================================

    // --- Main Event Modal Elements ---
    const modalBackdrop = document.getElementById('event-modal-backdrop');
    const modalContainer = document.getElementById('event-modal-container');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalTag = document.getElementById('modal-tag');
    const modalDateTime = document.getElementById('modal-date-time');
    const modalLocation = document.getElementById('modal-location');
    const modalDescription = document.getElementById('modal-description');
    const modalImage = document.getElementById('modal-image');
    const modalCtaButton = document.getElementById('modal-cta-button');
    const modalSpeakerList = document.getElementById('modal-speaker-list');
    const modalSeeMoreBtn = document.getElementById('modal-see-more-speakers');

    // --- Speaker List Modal Elements ---
    const speakerModalBackdrop = document.getElementById('speaker-list-modal-backdrop');
    const speakerModalContainer = document.getElementById('speaker-list-modal-container');
    const speakerModalCloseBtn = document.getElementById('speaker-list-close-btn');
    const fullSpeakerListContainer = document.getElementById('full-speaker-list-container');

    // --- Event Series Modal Elements ---
    const seriesModalBackdrop = document.getElementById('series-modal-backdrop');
    const seriesModalContainer = document.getElementById('series-modal-container');
    const seriesCloseBtn = document.getElementById('series-close-btn');
    const seriesModalTitle = document.getElementById('series-modal-title');
    const seriesModalDescription = document.getElementById('series-modal-description');
    const seriesModalGrid = document.getElementById('series-modal-grid');

    // --- Team Modal Elements ---
    const teamModalBackdrop = document.getElementById('team-modal-backdrop');
    const teamModalContainer = document.getElementById('team-modal-container');
    const teamModalCloseBtn = document.getElementById('team-modal-close-btn');
    const teamModalImage = document.getElementById('team-modal-image');
    const teamModalName = document.getElementById('team-modal-name');
    const teamModalRole = document.getElementById('team-modal-role');
    const teamModalBio = document.getElementById('team-modal-bio');
    const teamModalLinks = document.getElementById('team-modal-links');

    // --- Global Data Caches ---
    let allEventsCache = [];
    let allTeamDataCache = [];
    let currentSpeakers = []; // To hold speakers for the "see more" modal

    // --- Data Definitions ---
    // Defines the static "playlist" cards for the Event Series
    const eventSeries = [
        {
            title: "Guest Talks",
            description: "In-depth lectures from leading researchers and guest lecturers on foundational and cutting-edge topics in complexity science.",
            tag_matcher: "Guest Talk",
            image_path: "img/general/tiling1.jpeg",
            gradient_class: "sfi-gradient-turmeric",
            tag_color_class: "text-white"
        },
        {
            title: "Community Talks",
            description: "Seminar-style talks by CGS participants and EPE network members, designed to showcase ongoing research and projects.",
            tag_matcher: "Community Talks",
            image_path: "img/general/tiling2.jpeg",
            gradient_class: "sfi-gradient-sea",
            tag_color_class: "text-white"
        },
        {
            title: "Nascent Research",
            description: "A rapid-fire series. Presenters share emerging research in 10-minute talks, followed by 10 minutes of Q&A.",
            tag_matcher: "Nascent Research",
            image_path: "img/general/feltpen1.jpeg",
            gradient_class: "sfi-gradient-sea",
            tag_color_class: "text-white"
        },
        {
            title: "Complexity Narratives",
            description: "An epistemologically-forward attempt at historically recontextualizing the ways in which our world systems have developed.",
            tag_matcher: "Complexity Narrative",
            image_path: "img/general/tiling3.jpeg",
            gradient_class: "sfi-gradient-turmeric",
            tag_color_class: "text-white"
        },
        {
            title: "Workshops",
            description: "Hands-on sessions to learn new methods, tools, and skills related to complexity science.",
            tag_matcher: "Workshop",
            image_path: "img/general/paint1.jpeg",
            gradient_class: "sfi-gradient-eggplant",
            tag_color_class: "text-white"
        }
    ];
    // Cache for storing the filtered/sorted event lists for each series
    const seriesEventCache = new Map();

    // --- Image Assets for Randomization (Hero Only) ---
    const marbleImages = [
        "./img/general/marble1.jpeg",
        "./img/general/marble2.jpeg",
        "./img/general/marble3.jpeg",
        "./img/general/marble4.png",
        "./img/general/marble5.png"
    ];

    const generalImages = [
        "./img/general/beads1.jpeg",
        "./img/general/feltpen1.jpeg",
        "./img/general/paint1.jpeg",
        "./img/general/tiling1.jpeg",
        "./img/general/tiling2.jpeg",
        "./img/general/tiling3.jpeg",
        "./img/general/tiling4.jpeg",
        "./img/general/thermal_collage.jpg",
        ...marbleImages // Include marbles in general rotation
    ];

    /**
     * Helper to get a random image from an array (Simple Stateless Random).
     * Used for hero image where repetition is not an issue (single instance).
     */
    function getRandomImage(imageArray) {
        const randomIndex = Math.floor(Math.random() * imageArray.length);
        return imageArray[randomIndex];
    }

    // =======================================================
    // === 3. HELPER FUNCTIONS (STYLING, HTML, DATE)
    // =======================================================

    /**
     * NEW: Helper to safely clear the URL hash without scrolling
     */
    function clearHash() {
        if (window.location.hash) {
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
    }

    /**
     * Formats an event timestamp for display.
     * @param {number} timestamp - The event timestamp *in milliseconds*.
     * @param {string} location - The event's listed location.
     * @param {number} nowTimestamp - The current time in milliseconds.
     * @returns {object} - { dateDisplay, timeDisplay, dateTimeFull, locationDisplay, isPast }
     */
    function formatEventDateTime(timestamp, location, nowTimestamp) {
        const eventDate = new Date(timestamp);
        // Assume default duration of 2 hours (7200000 ms)
        // Event is "past" only if it ended (start + 2h < now)
        const twoHoursMs = 7200000;
        const isPast = (timestamp + twoHoursMs) < nowTimestamp;

        // Format: "October 20, 2025"
        const dateDisplay = eventDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Format: "10:00 AM EST" (Local time with timezone)
        const timeDisplay = eventDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short' // Re-added to show the timezone
        });

        // Format: "October 20, 2025 at 10:00 AM EST"
        const dateTimeFull = `${dateDisplay} at ${timeDisplay}`;

        // Use the location from the JSON directly
        const locationDisplay = location;

        return { dateDisplay, timeDisplay, dateTimeFull, locationDisplay, isPast };
    }

    /**
     * Helper function to get the correct styling for an event card.
     * @param {object} event - The event object
     * @returns {object} - { gradient_class, tag_color_class }
     */
    function getEventStyling(event) {
        // 1. Check if styling is provided in the event JSON (backward compatibility)
        if (event.gradient_class && event.tag_color_class) {
            return {
                gradient_class: event.gradient_class,
                tag_color_class: event.tag_color_class
            };
        }

        // 2. Try to match the event tag to a defined series
        const matchedSeries = eventSeries.find(s => s.tag_matcher.toLowerCase() === event.tag.toLowerCase());
        if (matchedSeries) {
            return {
                gradient_class: matchedSeries.gradient_class,
                tag_color_class: matchedSeries.tag_color_class
            };
        }

        // 3. Fallback to a default
        return {
            gradient_class: 'sfi-gradient-sea',
            tag_color_class: 'text-white'
        };
    }

    /**
 * Helper function to create the HTML for a single event card (Standard Grid View).
 * Style: Clean Light Boxed
 */
    function createEventCardHTML(event) {
        // Determine the speaker text
        let speakerDisplay;
        if (!event.speakers || event.speakers.length === 0 || event.speakers[0].name.toLowerCase() === 'to be announced') {
            speakerDisplay = "Speaker TBA";
        } else if (event.speakers.length === 1) {
            speakerDisplay = event.speakers[0].name;
        } else {
            speakerDisplay = "Various Speakers";
        }

        const { gradient_class, tag_color_class } = getEventStyling(event);
        const imagePath = event.image_path || 'img/general/marble4.png';
        const altText = event.title.replace(/"/g, "'");
        const { dateDisplay } = event.formattedDate;

        return `
            <article class="flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
                <button type="button" class="group text-left w-full h-full flex flex-col bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300" data-event-id="${event.id}">
                    <!-- Image Container -->
                    <div class="relative w-full aspect-video overflow-hidden bg-gray-100">
                        <img src="${imagePath}" alt="${altText}" 
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                             onerror="this.onerror=null; this.src='img/general/marble4.png';">
                        
                        <!-- Floating Tag Badge -->
                        <div class="absolute top-3 left-3">
                            <span class="${gradient_class} ${tag_color_class} text-xs font-bold uppercase tracking-wider px-2 py-1 rounded shadow-sm opacity-95">
                                ${event.tag}
                            </span>
                        </div>
                    </div>

                    <!-- Content (Clean Light) -->
                    <div class="p-5 flex-grow flex flex-col">
                        <h3 class="text-xl font-bold font-serif-display leading-tight text-gray-900 group-hover:text-sfi-sea transition-colors mb-2">
                            ${event.title}
                        </h3>
                        
                        <div class="mt-auto space-y-1 pt-3">
                            <p class="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                ${dateDisplay}
                            </p>
                            <p class="text-sm text-gray-600">
                                ${speakerDisplay}
                            </p>
                        </div>
                    </div>
                </button>
            </article>
        `;
    }

    /**
     * Helper function to create the HTML for a COMPACT event card (List View / Modal).
     * Style: Horizontal Row
     */
    function createCompactEventCardHTML(event) {
        let speakerDisplay;
        if (!event.speakers || event.speakers.length === 0 || event.speakers[0].name.toLowerCase() === 'to be announced') {
            speakerDisplay = "Speaker TBA";
        } else if (event.speakers.length === 1) {
            speakerDisplay = event.speakers[0].name;
        } else {
            speakerDisplay = "Various Speakers";
        }

        const { gradient_class, tag_color_class } = getEventStyling(event);
        const imagePath = event.image_path || './img/general/marble4.png';
        const altText = event.title.replace(/"/g, "'");
        const { dateDisplay } = event.formattedDate;

        return `
            <article class="w-full">
                <button type="button" class="group text-left w-full flex items-center bg-white rounded-lg p-3 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200" data-event-id="${event.id}">
                    <!-- Thumbnail -->
                    <div class="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 mr-4">
                        <img src="${imagePath}" alt="${altText}" 
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                             onerror="this.onerror=null; this.src='./img/general/marble4.png';">
                    </div>

                    <!-- Content -->
                    <div class="flex-grow min-w-0">
                         <div class="flex items-center mb-1">
                            <!-- Tag removed per user request (redundant in series view) -->
                            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">
                                ${dateDisplay}
                            </span>
                        </div>
                        <h3 class="text-lg font-bold font-serif-display leading-tight text-gray-900 group-hover:text-sfi-sea transition-colors truncate">
                            ${event.title}
                        </h3>
                        <p class="text-sm text-gray-600 truncate mt-0.5">
                            ${speakerDisplay}
                        </p>
                    </div>
                    
                    <!-- Arrow -->
                    <div class="ml-4 flex-shrink-0 text-gray-300 group-hover:text-sfi-sea transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                </button>
            </article>
        `;
    }

    /**
     * Helper to create HTML for a single speaker in the modal.
     */
    function createSpeakerHTML(speaker) {
        const websiteLink = speaker.website
            ? `<a href="${speaker.website}" target="_blank" rel="noopener" class="text-sfi-sea text-sm hover:underline">Website</a>`
            : '';

        const speakerImage = speaker.image || './img/general/marble4.png';

        return `
            <div class="flex items-center space-x-4">
                <img src="${speakerImage}" alt="${speaker.name}" class="h-16 w-16 rounded-full object-cover bg-gray-100 flex-shrink-0"
                     onerror="this.onerror=null; this.src='img/general/marble4.png';">
                <div>
                    <p class="font-bold text-lg">${speaker.name}</p>
                    <p class="text-gray-600 text-sm">${speaker.tagline}</p>
                    ${websiteLink}
                </div>
            </div>
        `;
    }

    /**
     * Helper to create HTML for a single Event Series "playlist" card.
     */
    function createSeriesCardHTML(series) {
        const altText = series.title.replace(/"/g, "'");
        return `
            <article class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300">
                <button type="button" class="group text-left w-full flex flex-col h-full" data-series-title="${series.title}">
                    <div class="w-full h-48 overflow-hidden relative">
                        <img src="${series.image_path}" alt="${altText}" 
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                             onerror="this.onerror=null; this.src='./img/general/marble4.png';">
                    </div>
                    
                    <div class="p-6 flex-grow flex flex-col justify-between">
                        <div>
                            <h3 class="text-xl font-bold font-serif-display group-hover:text-sfi-sea transition-colors text-gray-900">
                                ${series.title}
                            </h3>
                            <p class="mt-3 text-sm text-gray-600 line-clamp-3 leading-relaxed">
                                ${series.description}
                            </p>
                        </div>
                        <div class="mt-4 pt-4 border-t border-gray-100 flex items-center text-sfi-sea text-sm font-bold uppercase tracking-wide group-hover:text-sfi-ming transition-colors">
                            View Series
                            <svg class="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </div>
                    </div>
                </button>
            </article>
        `;
    }

    /**
     * Helper to create HTML for a single Team Member card.
     */
    function createTeamCardHTML(teamMember) {
        const altText = teamMember.name.replace(/"/g, "'");
        const imagePath = teamMember.image_path || 'img/general/marble4.png';
        return `
            <article class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <button type="button" class="group text-left w-full" data-member-id="${teamMember.id}">
                    <div class="w-full aspect-square overflow-hidden">
                        <img src="${teamMember.image_path}" alt="${altText}" 
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                             onerror="this.onerror=null; this.src='./img/general/marble4.png';">
                    </div>
                    <div class="p-5">
                        <h3 class="text-2xl font-bold font-serif-display group-hover:text-sfi-sea transition-colors">
                            ${teamMember.name}
                        </h3>
                        ${teamMember.role ? `<p class="mt-1 text-base text-gray-600">${teamMember.role}</p>` : ''}
                    </div>
                </button>
            </article>
        `;
    }


    /**
     * Opens the main event modal with an EVENT OBJECT.
     * @param {object} event - The full event object from allEventsCache.
     */
    const maxSpeakersToShow = 2; // Show 2 speakers before hiding behind "See More"
    function openEventModal(event) {
        if (!event) return;
        // Get all data from the event object
        const { title, tag, description_html, speakers, links, formattedDate } = event;
        const { dateTimeFull, locationDisplay, isPast } = formattedDate;
        const image = event.image_path || './img/general/marble4.png';
        const registerUrl = (links && links.register) ? links.register : "";
        const recordingUrl = (links && links.recording) ? links.recording : "";

        currentSpeakers = speakers || []; // Store for the "See More" modal

        // Populate the modal
        modalTitle.textContent = title;
        modalTag.textContent = tag;
        // Modal tag is always 'text-sfi-sea' for visibility on white background
        modalTag.className = 'text-xs font-bold uppercase tracking-wider text-sfi-sea';
        modalDateTime.textContent = dateTimeFull;
        modalLocation.textContent = locationDisplay;
        modalDescription.innerHTML = description_html;
        modalImage.src = image;
        modalImage.alt = title.replace(/"/g, "'");

        // Populate speaker list
        modalSpeakerList.innerHTML = ''; // Clear previous speakers
        modalSeeMoreBtn.classList.add('hidden'); // Reset: hide by default

        if (currentSpeakers.length > 0) {
            currentSpeakers.slice(0, maxSpeakersToShow).forEach(speaker => {
                const speakerData = {
                    name: speaker.name,
                    tagline: speaker.tagline,
                    image: speaker.image_path,
                    website: speaker.website_url
                };
                modalSpeakerList.innerHTML += createSpeakerHTML(speakerData);
            });

            // Show "See More" button if needed
            if (currentSpeakers.length > maxSpeakersToShow) {
                modalSeeMoreBtn.textContent = `See all ${currentSpeakers.length} speakers`;
                modalSeeMoreBtn.classList.remove('hidden');
            }
        }

        // Configure CTA button
        const isValidLink = (url) => url && url !== "#" && url !== "null" && url.trim() !== "";

        modalCtaButton.removeAttribute('disabled');
        modalCtaButton.classList.remove('bg-gray-400', 'cursor-not-allowed', 'hover:bg-gray-400');
        modalCtaButton.classList.add('bg-sfi-sea', 'hover:bg-sfi-ming');


        // CTA Button Logic (Simplified)
        // Don't show "Join" links for past events
        const isJoinLink = event.cta && event.cta.text && event.cta.text.toLowerCase().includes('join');
        const shouldHide = isPast && isJoinLink;

        if (event.cta && event.cta.url && event.cta.text && !shouldHide) {
            modalCtaButton.href = event.cta.url;
            modalCtaButton.textContent = event.cta.text;
            modalCtaButton.style.display = 'block';

            // Reset styles (in case it was disabled previously)
            modalCtaButton.removeAttribute('disabled');
            modalCtaButton.classList.remove('bg-gray-400', 'cursor-not-allowed', 'hover:bg-gray-400');
            modalCtaButton.classList.add('bg-sfi-sea', 'hover:bg-sfi-ming');
        } else {
            // No CTA defined -> Hide button completely
            modalCtaButton.style.display = 'none';
        }

        // Open the modal
        modalBackdrop.classList.add('is-open');
        modalContainer.classList.add('is-open');
        body.style.overflow = 'hidden';

        // If opening from the series modal, hide the series modal
        if (seriesModalContainer.classList.contains('is-open')) {
            seriesModalContainer.classList.remove('is-open');
        }
    }

    function closeModal() {
        modalBackdrop.classList.remove('is-open');
        modalContainer.classList.remove('is-open');

        // If we were in a series, re-open the series modal
        if (seriesModalBackdrop.classList.contains('is-open')) {
            seriesModalContainer.classList.add('is-open');
        } else {
            // Only restore scroll if no other modal is open
            body.style.overflow = '';
        }
        clearHash(); // NEW: Clear hash on modal close
    }

    // --- Speaker List Modal Logic ---
    function openSpeakerListModal() {
        fullSpeakerListContainer.innerHTML = ''; // Clear old list
        currentSpeakers.forEach(speaker => {
            const speakerData = {
                name: speaker.name,
                tagline: speaker.tagline,
                image: speaker.image_path,
                website: speaker.website_url
            };
            fullSpeakerListContainer.innerHTML += `
                <div class="py-3 border-b border-gray-200 last:border-b-0">
                    ${createSpeakerHTML(speakerData)}
                </div>
            `;
        });
        speakerModalBackdrop.classList.add('is-open');
        speakerModalContainer.classList.add('is-open');

        // Hide the main event modal
        modalContainer.classList.remove('is-open');
    }

    function closeSpeakerListModal() {
        speakerModalBackdrop.classList.remove('is-open');
        speakerModalContainer.classList.remove('is-open');

        // Show the main event modal again
        modalContainer.classList.add('is-open');
    }

    // --- Event Series Modal Logic ---
    function openSeriesModal(seriesTitle) {
        const seriesData = eventSeries.find(s => s.title === seriesTitle);
        if (!seriesData) {
            console.warn(`Series "${seriesTitle}" not found.`);
            return;
        }
        const events = seriesEventCache.get(seriesTitle) || [];

        seriesModalTitle.textContent = seriesData.title;
        seriesModalDescription.textContent = seriesData.description;

        // Populate the grid
        if (events.length > 0) {
            // Use COMPACT cards for the modal loop
            seriesModalGrid.innerHTML = events.map(createCompactEventCardHTML).join('');
        } else {
            seriesModalGrid.innerHTML = '<p class="text-gray-600">No events found for this series.</p>';
        }


        // CRITICAL: Re-attach listeners to the *new* event cards inside this modal
        seriesModalGrid.querySelectorAll('button[data-event-id]').forEach(card => {
            card.addEventListener('click', () => {
                // NEW: Set hash, don't call modal directly
                window.location.hash = `#event=${card.dataset.eventId}`;
            });
        });

        seriesModalBackdrop.classList.add('is-open');
        seriesModalContainer.classList.add('is-open');
        body.style.overflow = 'hidden';
    }

    function closeSeriesModal() {
        seriesModalBackdrop.classList.remove('is-open');
        seriesModalContainer.classList.remove('is-open');

        // Only restore body scroll if the main modal isn't *also* open
        if (!modalContainer.classList.contains('is-open')) {
            body.style.overflow = '';
        }
        clearHash(); // NEW: Clear hash on modal close
    }

    // --- Team Member Modal Logic ---
    function openTeamModal(member) {
        if (!member) return;
        teamModalName.textContent = member.name;

        if (member.role) {
            teamModalRole.textContent = member.role;
            teamModalRole.style.display = 'block';
        } else {
            teamModalRole.style.display = 'none';
        }
        teamModalImage.src = member.image_path;
        teamModalImage.src = member.image_path;
        teamModalImage.alt = member.name;

        if (member.bio_html) {
            teamModalBio.innerHTML = member.bio_html;
            teamModalBio.style.display = 'block';
        } else {
            teamModalBio.style.display = 'none';
        }

        // Populate links
        teamModalLinks.innerHTML = '';
        if (member.links && member.links.length > 0) {
            member.links.forEach(link => {
                teamModalLinks.innerHTML += `
                    <div>
                        <a href="${link.url}" target="_blank" rel="noopener" class="sfi-cta cta-black text-sm">
                            ${link.text}
                            <svg class="arrow-circle-icon" width="24" height="14" viewBox="-395 256 24 14"><path fill="none" d="M-377 263h-17.6m15.4-2.2l2.2 2.2-2.2 2.2"/><circle fill="none" cx="-378.1" cy="263" r="6.8"/></svg>
                        </a>
                    </div>
                `;
            });
        }

        teamModalBackdrop.classList.add('is-open');
        teamModalContainer.classList.add('is-open');
        body.style.overflow = 'hidden';
    }

    function closeTeamModal() {
        teamModalBackdrop.classList.remove('is-open');
        teamModalContainer.classList.remove('is-open');
        body.style.overflow = '';
        clearHash(); // NEW: Clear hash on modal close
    }

    // --- Attach listeners to static modal elements ---
    modalCloseBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    modalSeeMoreBtn.addEventListener('click', openSpeakerListModal);

    speakerModalCloseBtn.addEventListener('click', closeSpeakerListModal);
    speakerModalBackdrop.addEventListener('click', closeSpeakerListModal);

    seriesCloseBtn.addEventListener('click', closeSeriesModal);
    seriesModalBackdrop.addEventListener('click', closeSeriesModal);

    teamModalCloseBtn.addEventListener('click', closeTeamModal);
    teamModalBackdrop.addEventListener('click', closeTeamModal);

    // Global Keydown Listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (speakerModalContainer.classList.contains('is-open')) {
                closeSpeakerListModal();
            } else if (teamModalContainer.classList.contains('is-open')) {
                closeTeamModal(); // This will clear the hash
            } else if (modalContainer.classList.contains('is-open')) {
                closeModal(); // This will clear the hash
            } else if (seriesModalContainer.classList.contains('is-open')) {
                closeSeriesModal(); // This will clear the hash
            } else if (mobileMenu.classList.contains('is-open')) {
                closeMenu();
            }
        }
    });


    // =======================================================
    // === 4. ROUTING & DATA FETCHING (RUNS ON LOAD)
    // =======================================================

    /**
     * NEW: Main hash routing function.
     * This is the ONLY function that opens modals.
     */
    function handleHashChange() {
        const hash = window.location.hash;

        // --- 1. Modal Logic (Preserved) ---
        if (hash.startsWith('#event=')) {
            if (!modalContainer.classList.contains('is-open')) {
                const eventId = hash.substring(7);
                const event = allEventsCache.find(e => e.id === eventId);
                openEventModal(event);
            }
            return; // Stop here if opening a modal
        } else if (hash.startsWith('#team=') && hash.length > 6) { // Ensure it's not just "#team"
            if (!teamModalContainer.classList.contains('is-open')) {
                const teamId = hash.substring(6);
                const member = allTeamDataCache.find(m => m.id === teamId);
                openTeamModal(member);
            }
            return;
        } else if (hash.startsWith('#series=')) {
            if (!seriesModalContainer.classList.contains('is-open')) {
                const seriesTitle = decodeURIComponent(hash.substring(8));
                openSeriesModal(seriesTitle);
            }
            return;
        }

        // --- 2. Page Navigation Logic (New) ---

        // Define page mapping
        // Hashes that map to 'home' but scroll to specific sections
        if (hash === '#about' || hash === '#upcoming' || hash === '#events' || hash === '#get-involved') {
            showPage('home', hash);
        }
        // Direct page hashes
        else if (hash === '#archive') {
            showPage('archive');
        }
        else if (hash === '#team') {
            showPage('team');
        }
        else if (hash === '#home' || hash === '') {
            showPage('home');
        }

        // --- 3. Cleanup ---
        // If we are navigating to a page (not a modal), ensure modals are closed
        if (modalContainer.classList.contains('is-open')) closeModal();
        if (seriesModalContainer.classList.contains('is-open')) closeSeriesModal();
        if (teamModalContainer.classList.contains('is-open')) closeTeamModal();
    }


    /**
     * Main function to fetch time, fetch events, and render them.
     */
    async function loadEvents() {
        // Randomize Hero Image
        // Randomize Hero Image (Smooth Fade)
        // Randomize Hero Image (Slideshow)
        const heroOverlay = document.getElementById('hero-image-overlay');
        const heroBase = document.getElementById('hero-image-base');

        if (heroOverlay && heroBase) {
            // Configuration
            const slideshowInterval = 10000; // 10 seconds per slide
            let currentImageIndex = -1; // -1 to start

            // Helper to get next random image ensuring no repeats
            function getNextImage() {
                let nextUrl;
                do {
                    nextUrl = getRandomImage(generalImages);
                } while (nextUrl === heroBase.src || nextUrl === heroOverlay.src); // Avoid immediate duplicate
                return nextUrl;
            }

            // Function to perform cross-fade
            // activeEl is the one currently visible (fading out)
            // nextEl is the one currently hidden (fading in)
            function transitionSlide(activeEl, nextEl) {
                const nextUrl = getNextImage();

                // Preload
                const tempImg = new Image();
                tempImg.onload = () => {
                    nextEl.src = nextUrl;
                    // Trigger reflow
                    void nextEl.offsetWidth;

                    // Fade In Next
                    nextEl.classList.remove('opacity-0');
                    nextEl.classList.add('opacity-50');

                    // Fade Out Active
                    activeEl.classList.remove('opacity-50');
                    activeEl.classList.add('opacity-0');
                };
                tempImg.src = nextUrl;
            }

            // --- Step 1: Initial Load (Overlay fades in, Base fades out) ---
            // This replaces the static logic we just had.
            const firstRandomUrl = getNextImage();
            const tempImg = new Image();
            tempImg.onload = () => {
                heroOverlay.src = firstRandomUrl;
                void heroOverlay.offsetWidth;

                // Show Overlay
                heroOverlay.classList.remove('opacity-0');
                heroOverlay.classList.add('opacity-50');

                // Hide Base
                heroBase.classList.remove('opacity-50');
                heroBase.classList.add('opacity-0');

                // --- Step 2: Start Slideshow Cycle ---
                // Currently Active: Overlay. Currently Hidden: Base.
                // Next transition: Show Base, Hide Overlay.
                let isOverlayActive = true;

                setInterval(() => {
                    if (isOverlayActive) {
                        // Overlay is visible -> Show Base, Hide Overlay
                        transitionSlide(heroOverlay, heroBase);
                    } else {
                        // Base is visible -> Show Overlay, Hide Base
                        transitionSlide(heroBase, heroOverlay);
                    }
                    isOverlayActive = !isOverlayActive;
                }, slideshowInterval);
            };
            tempImg.src = firstRandomUrl;
        }

        let now;

        // --- 4.1: Get the "true" current time ---
        try {
            const response = await fetch('https://worldtimeapi.org/api/ip');
            if (!response.ok) throw new Error('Time API failed');
            const data = await response.json();
            now = new Date(data.utc_datetime);
            console.log('Using reliable world time:', now);
        } catch (error) {
            console.warn('World time API failed. Falling back to local time.', error);
            now = new Date();
        }

        const nowMs = now.getTime();

        // --- 4.2: Get the event data ---
        const homeUpcomingGrid = document.getElementById('home-upcoming-grid');
        const archiveUpcomingGrid = document.getElementById('archive-upcoming-grid');
        const archiveSeriesGrid = document.getElementById('archive-series-grid');
        const archivePastGrid = document.getElementById('archive-past-grid');

        try {
            const response = await fetch('./data/events.json?v=' + new Date().getTime());
            if (!response.ok) {
                throw new Error(`Events JSON not found (${response.status})`);
            }
            allEventsCache = await response.json(); // Store in cache
        } catch (error) {
            console.error('Failed to fetch or process events:', error);
            const errorMsg = '<p class="text-gray-700 md:col-span-3">Could not load events. Please try refreshing the page.</p>';
            if (homeUpcomingGrid) homeUpcomingGrid.innerHTML = errorMsg;
            if (archiveUpcomingGrid) archiveUpcomingGrid.innerHTML = errorMsg;
            if (archivePastGrid) archivePastGrid.innerHTML = errorMsg;
            if (archiveSeriesGrid) archiveSeriesGrid.innerHTML = '<p class="text-gray-700 md:col-span-3">Could not load event series.</p>';
            return; // Stop execution
        }

        // --- 4.3: Process events, adding formatted date info ---
        allEventsCache.forEach(event => {
            if (typeof event.event_time !== 'number') {
                console.error('Invalid event_time for event:', event.id, event.event_time);
                event.event_time = 0; // Set to 0 if invalid
            } else if (event.event_time.toString().length < 11) {
                // If timestamp is in seconds (e.g., 10 digits), convert to milliseconds
                event.event_time = event.event_time * 1000;
            }

            // Attach the formatted date/time object to each event
            event.formattedDate = formatEventDateTime(event.event_time, event.location, nowMs);
        });

        // --- 4.4: Sort events based on the "true" time ---

        const upcomingEvents = allEventsCache
            .filter(event => !event.formattedDate.isPast)
            .sort((a, b) => a.event_time - b.event_time); // ASC

        const pastEvents = allEventsCache
            .filter(event => event.formattedDate.isPast)
            .sort((a, b) => b.event_time - a.event_time); // DESC

        // --- 4.5: Populate event grids ---

        // --- 4.5: Populate event grids ---

        // NEW: Toggle "Upcoming" nav link based on availability
        const navUpcoming = document.getElementById('nav-upcoming');
        const mobileNavUpcoming = document.getElementById('mobile-nav-upcoming');
        if (upcomingEvents.length > 0) {
            if (navUpcoming) navUpcoming.style.display = 'inline-block'; // Or whatever flex/inline style matches
            if (mobileNavUpcoming) mobileNavUpcoming.style.display = 'block';
        } else {
            if (navUpcoming) navUpcoming.style.display = 'none';
            if (mobileNavUpcoming) mobileNavUpcoming.style.display = 'none';
        }

        if (homeUpcomingGrid) {
            const upcomingSection = document.getElementById('upcoming');
            const homeEvents = upcomingEvents.slice(0, 3);
            if (homeEvents.length > 0) {
                homeUpcomingGrid.innerHTML = homeEvents.map(createEventCardHTML).join('');
                if (upcomingSection) upcomingSection.style.display = 'block';
            } else {
                // homeUpcomingGrid.innerHTML = '<p class="text-gray-600 md:col-span-3">No upcoming events scheduled at this time. Please check back soon!</p>';
                // Logic update: HIDE the section if no events
                if (upcomingSection) upcomingSection.style.display = 'none';
            }
        }

        if (archiveUpcomingGrid) {
            const archiveUpcomingHeader = document.getElementById('archive-upcoming');
            if (upcomingEvents.length > 0) {
                archiveUpcomingGrid.innerHTML = upcomingEvents.map(createEventCardHTML).join('');
                if (archiveUpcomingHeader) archiveUpcomingHeader.style.display = 'block';
                archiveUpcomingGrid.style.display = 'grid';
            } else {
                // archiveUpcomingGrid.innerHTML = '<p class="text-gray-600 md:col-span-3">No upcoming events scheduled at this time.</p>';
                // Logic update: HIDE the section/header if no events
                if (archiveUpcomingHeader) archiveUpcomingHeader.style.display = 'none';
                archiveUpcomingGrid.style.display = 'none';
            }
        }

        if (archivePastGrid) {
            if (pastEvents.length > 0) {
                archivePastGrid.innerHTML = pastEvents.map(createEventCardHTML).join('');
            } else {
                archivePastGrid.innerHTML = '<p class="text-gray-600 md:col-span-3">No past event recordings are available yet.</p>';
            }
        }

        // --- 4.6: Populate Event Series Grid & Cache Data ---
        if (archiveSeriesGrid) {
            archiveSeriesGrid.innerHTML = ''; // Clear loading message
            eventSeries.forEach(series => {
                const seriesEvents = allEventsCache
                    .filter(event => event.tag.toLowerCase() === series.tag_matcher.toLowerCase())
                    .sort((a, b) => b.event_time - a.event_time); // DESC

                seriesEventCache.set(series.title, seriesEvents);
                archiveSeriesGrid.innerHTML += createSeriesCardHTML(series);
            });

            // ** NEW: Add listeners to set hash **
            archiveSeriesGrid.querySelectorAll('button[data-series-title]').forEach(card => {
                card.addEventListener('click', () => {
                    const safeTitle = encodeURIComponent(card.dataset.seriesTitle);
                    window.location.hash = `#series=${safeTitle}`;
                });
            });
        }

        // --- 4.7: Attach listeners to *all* newly created event cards ---
        // ** NEW: Add listeners to set hash **
        document.querySelectorAll('button[data-event-id]').forEach(card => {
            card.addEventListener('click', () => {
                window.location.hash = `#event=${card.dataset.eventId}`;
            });
        });
    }

    /**
     * Function to fetch and render the team page.
     */
    async function loadTeamData() {
        const teamGrid = document.getElementById('team-grid');

        try {
            const response = await fetch('./data/team.json?v=' + new Date().getTime());
            if (!response.ok) {
                throw new Error(`Team JSON not found (${response.status})`);
            }
            allTeamDataCache = await response.json(); // Store in cache
        } catch (error) {
            console.error('Failed to fetch or process team data:', error);
            teamGrid.innerHTML = '<p class="text-gray-700 md:col-span-3">Could not load team data. Please try refreshing the page.</p>';
            return;
        }

        // Populate grid
        if (allTeamDataCache.length > 0) {
            // Sort alphabetically by name
            allTeamDataCache.sort((a, b) => a.name.localeCompare(b.name));

            teamGrid.innerHTML = allTeamDataCache.map(createTeamCardHTML).join('');
        } else {
            teamGrid.innerHTML = '<p class="text-gray-600 md:col-span-3">Team information is not available at this time.</p>';
        }

        // ** NEW: Add listeners to set hash **
        document.querySelectorAll('button[data-member-id]').forEach(card => {
            card.addEventListener('click', () => {
                window.location.hash = `#team=${card.dataset.memberId}`;
            });
        });
    }

    /**
     * Function to fetch and render the event formats section.
     */
    async function loadEventFormats() {
        const grid = document.getElementById('event-formats-grid');
        if (!grid) return;

        try {
            const response = await fetch('./data/event-formats.json?v=' + new Date().getTime());
            if (!response.ok) throw new Error('Failed to load event formats');
            const data = await response.json();

            grid.innerHTML = data.map(format => {
                const linkHtml = format.cta ? `
                    <div class="mt-6">
                        ${format.cta.badge ? `
                            <span class="bg-gray-100 text-gray-600 font-bold py-2 px-4 rounded inline-block text-sm">
                                ${format.cta.text}
                            </span>
                        ` : `
                            <a href="${format.cta.url}" target="_blank" rel="noopener" class="sfi-cta cta-black text-sm">
                                ${format.cta.text}
                                <svg class="arrow-circle-icon" width="24" height="14" viewBox="-395 256 24 14">
                                    <path fill="none" d="M-377 263h-17.6m15.4-2.2l2.2 2.2-2.2 2.2" />
                                    <circle fill="none" cx="-378.1" cy="263" r="6.8" />
                                </svg>
                            </a>
                        `}
                    </div>
                ` : '';

                return `
                    <div class="bg-white p-6 md:p-8 rounded-lg border border-gray-200 shadow-sm flex flex-col">
                        <h3 class="text-2xl md:text-3xl font-bold font-serif-display mb-4">${format.title}</h3>
                        <p class="text-gray-700 text-base flex-grow">
                            ${format.description}
                        </p>
                        ${linkHtml}
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading event formats:', error);
            grid.innerHTML = '<p class="text-gray-600">Event formats currently unavailable.</p>';
        }
    }

    // --- 5. RUN EVERYTHING! ---
    async function initializeApp() {
        // Wait for all data sources to be loaded and DOM to be built
        await Promise.all([
            loadEvents(),
            loadTeamData(),
            loadEventFormats()
        ]);

        // Now that data is cached and DOM is built, run the hash handler for the *first time*
        handleHashChange();

        // And *now* listen for future hash changes
        window.addEventListener('hashchange', handleHashChange);
    }

    initializeApp(); // Run the app
});
