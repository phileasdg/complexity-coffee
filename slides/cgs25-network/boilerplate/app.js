document.addEventListener("DOMContentLoaded", () => {
  // --- Slide Configuration ---
  const TOTAL_SLIDES = 3;

  // Define slide-specific subtitles
  const slideSubtitles = {
    1: "Introduction to the presentation boilerplate",
    2: "Showcase of embedded web integration with QR branding",
    3: "Additional slide detailing auxiliary project networks"
  };

  // --- DOM Elements ---
  const prevSlideBtn = document.getElementById("prev-slide-btn");
  const nextSlideBtn = document.getElementById("next-slide-btn");
  const slideIndicator = document.getElementById("slide-indicator");
  const slideSubtitle = document.getElementById("slide-subtitle");

  // Dynamic Slide Containers list (Auto-populates slide elements based on total count)
  const slideContainers = {};
  for (let idx = 1; idx <= TOTAL_SLIDES; idx++) {
    slideContainers[idx] = document.getElementById(`slide${idx}-container`);
  }

  let currentSlide = 1;

  // --- Slide Navigation Logic ---
  function setSlide(slideIndex, updateHash = true) {
    if (slideIndex < 1 || slideIndex > TOTAL_SLIDES) return;
    currentSlide = slideIndex;

    // Update button disabled/enabled states
    prevSlideBtn.disabled = (currentSlide === 1);
    nextSlideBtn.disabled = (currentSlide === TOTAL_SLIDES);

    // Update indicators
    slideIndicator.textContent = `${currentSlide} / ${TOTAL_SLIDES}`;

    // Update subtitle
    if (slideSubtitles[currentSlide]) {
      slideSubtitle.textContent = slideSubtitles[currentSlide];
    }

    // Toggle container classes (Hides all containers except the active slide)
    Object.keys(slideContainers).forEach(key => {
      const num = parseInt(key, 10);
      const container = slideContainers[num];
      if (container) {
        if (num === currentSlide) {
          container.classList.remove("hidden");
        } else {
          container.classList.add("hidden");
        }
      }
    });

    // Update URL Hash routing
    if (updateHash) {
      window.location.hash = `#/slide/${currentSlide}`;
    }
  }

  // --- Hash Routing Helpers ---
  function getSlideFromHash() {
    const hash = window.location.hash;
    const match = hash.match(/^#\/slide\/([1-9][0-9]*)$/);
    if (match) {
      const slide = parseInt(match[1], 10);
      if (slide >= 1 && slide <= TOTAL_SLIDES) {
        return slide;
      }
    }
    return 1;
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Click listeners
    prevSlideBtn.addEventListener("click", () => setSlide(currentSlide - 1));
    nextSlideBtn.addEventListener("click", () => setSlide(currentSlide + 1));

    // Key listeners for standard presentation controls (Arrows, Space, PageUp/Down, Backspace)
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "Space" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        setSlide(currentSlide + 1);
      } else if (event.key === "ArrowLeft" || event.key === "Backspace" || event.key === "PageUp") {
        event.preventDefault();
        setSlide(currentSlide - 1);
      }
    });

    // Hash Routing Change trigger
    window.addEventListener("hashchange", () => {
      const slide = getSlideFromHash();
      if (slide !== currentSlide) {
        setSlide(slide, false); // Prevent loops
      }
    });

    // Initialize slide layout from URL hash
    const initialSlide = getSlideFromHash();
    setSlide(initialSlide, true);
  }

  setupEventListeners();
});
