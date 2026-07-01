document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const canvasContainer = document.getElementById("graph-3d"); // SVG container
  const tooltip = document.getElementById("tooltip");

  // Slide Deck Controls
  const prevSlideBtn = document.getElementById("prev-slide-btn");
  const nextSlideBtn = document.getElementById("next-slide-btn");
  const slideIndicator = document.getElementById("slide-indicator");
  const slideControls = document.getElementById("slide-controls");

  // --- Vector Math and Geometry Helpers ---
  const Vec = {
    add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    sub: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    mult: (v, s) => ({ x: v.x * s, y: v.y * s }),
    div: (v, s) => ({ x: v.x / s, y: v.y / s }),
    mag: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
    dist: (v1, v2) => Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2),
    normalize: (v) => {
      const m = Math.sqrt(v.x * v.x + v.y * v.y);
      return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
    }
  };

  // Computes the Convex Hull of 2D points using the Monotone Chain algorithm
  function convexHull(points) {
    if (points.length <= 1) return [...points];
    const sorted = [...points]
      .filter((p, i, self) => self.findIndex(o => Math.abs(o.x - p.x) < 1e-5 && Math.abs(o.y - p.y) < 1e-5) === i)
      .sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
    if (sorted.length <= 2) return sorted;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (let i = 0; i < sorted.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
        lower.pop();
      }
      lower.push(sorted[i]);
    }
    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
        upper.pop();
      }
      upper.push(sorted[i]);
    }
    lower.pop();
    upper.pop();
    const hull = lower.concat(upper);
    let areaSum = 0;
    for (let i = 0; i < hull.length; i++) {
      const p1 = hull[i];
      const p2 = hull[(i + 1) % hull.length];
      areaSum += (p1.x * p2.y) - (p2.x * p1.y);
    }
    if (areaSum < 0) hull.reverse();
    return hull;
  }

  // Minkowski sum path generator for rounded polygons
  function getBlobPath(points, radius) {
    if (!points || points.length === 0) return '';
    if (radius <= 0) radius = 10;
    const uniquePoints = points.filter((p, i, self) => 
      self.findIndex(o => Math.abs(o.x - p.x) < 0.1 && Math.abs(o.y - p.y) < 0.1) === i
    );
    if (uniquePoints.length === 0) return '';
    if (uniquePoints.length === 1) {
      const p = uniquePoints[0];
      return `M ${p.x - radius} ${p.y} A ${radius} ${radius} 0 1 0 ${p.x + radius} ${p.y} A ${radius} ${radius} 0 1 0 ${p.x - radius} ${p.y} Z`;
    }
    if (uniquePoints.length === 2) {
      const p0 = uniquePoints[0];
      const p1 = uniquePoints[1];
      const d = Vec.dist(p0, p1);
      if (d < 0.1) return getBlobPath([p0], radius);
      const t = Vec.normalize(Vec.sub(p1, p0));
      const n = { x: t.y, y: -t.x };
      const p0_l = Vec.add(p0, Vec.mult(n, radius));
      const p0_r = Vec.sub(p0, Vec.mult(n, radius));
      const p1_l = Vec.add(p1, Vec.mult(n, radius));
      const p1_r = Vec.sub(p1, Vec.mult(n, radius));
      return `M ${p0_l.x} ${p0_l.y} L ${p1_l.x} ${p1_l.y} A ${radius} ${radius} 0 0 1 ${p1_r.x} ${p1_r.y} L ${p0_r.x} ${p0_r.y} A ${radius} ${radius} 0 0 1 ${p0_l.x} ${p0_l.y} Z`;
    }
    const hull = convexHull(uniquePoints);
    if (hull.length === 1) return getBlobPath([hull[0]], radius);
    if (hull.length === 2) return getBlobPath([hull[0], hull[1]], radius);
    const pathParts = [];
    const n = hull.length;
    for (let i = 0; i < n; i++) {
      const pCurr = hull[i];
      const pNext = hull[(i + 1) % n];
      const pPrev = hull[(i - 1 + n) % n];
      const vNext = Vec.sub(pNext, pCurr);
      const vPrev = Vec.sub(pCurr, pPrev);
      const tNext = Vec.normalize(vNext);
      const tPrev = Vec.normalize(vPrev);
      const nNext = { x: tNext.y, y: -tNext.x };
      const nPrev = { x: tPrev.y, y: -tPrev.x };
      const pStartOffset = Vec.add(pCurr, Vec.mult(nNext, radius));
      if (i === 0) {
        pathParts.push(`M ${pStartOffset.x} ${pStartOffset.y}`);
      } else {
        pathParts.push(`A ${radius} ${radius} 0 0 1 ${pStartOffset.x} ${pStartOffset.y}`);
      }
      const pNextStartOffset = Vec.add(pNext, Vec.mult(nNext, radius));
      pathParts.push(`L ${pNextStartOffset.x} ${pNextStartOffset.y}`);
    }
    const firstEdgeOffset = Vec.add(hull[0], Vec.mult({ 
      x: Vec.normalize(Vec.sub(hull[1], hull[0])).y, 
      y: -Vec.normalize(Vec.sub(hull[1], hull[0])).x 
    }, radius));
    pathParts.push(`A ${radius} ${radius} 0 0 1 ${firstEdgeOffset.x} ${firstEdgeOffset.y} Z`);
    return pathParts.join(' ');
  }

  // --- State & Data Variables ---
  let projectMembers = {};
  let facultyMentors = {};
  let peerMentors = {};
  let myGroupMembers = new Set();

  let activeView = "all";
  let hoveredNode = null;
  let savedLayout = null;

  // Slide state
  let currentSlide = 1;

  // Layout physics state (Fixed defaults)
  const currentCharge = -250;
  const currentGravity = 0.095;
  const currentLinkDist = 35;
  const currentLabelRepel = 180;
  const currentLabelDrift = 120;

  // D3 Variables
  let svg, gContainer, link, node, labels, blob, blobLabel;
  let simulation;
  let zoomBehavior;
  
  let width = window.innerWidth;
  let height = window.innerHeight;

  // --- Constants & Color Scales ---
  const nodeRadius = {
    student: 6.5,
    faculty: 8.5,
    peer: 7.5
  };

  const customProjectColors = [
    "#003d5b", "#00a9b7", "#f5a623", "#3c1053", "#e4002b",
    "#2a6773", "#75536f", "#b9a744", "#b97044", "#42664a",
    "#788770", "#cfa16c", "#111111", "#4f3824", "#8f4a3c"
  ];
  const projectColorScale = d3.scaleOrdinal(customProjectColors);

  // Slide list variable to hold dynamically loaded config
  let slides = [];

  // --- Load Data and Initialize ---
  Promise.all([
    d3.json("data/slides.json"),
    d3.json("data/data_anonymized.json"),
    d3.json("data/layout_positions.json").catch(err => {
      console.log("No saved layout positions found or failed to load. Using physics default.");
      return null;
    })
  ])
    .then(([slidesData, data, layout]) => {
      slides = slidesData.filter(s => !s.exclude);
      projectMembers = data.projectMembers;
      facultyMentors = data.facultyMentors;
      peerMentors = data.peerMentors;
      savedLayout = layout;

      // Identify Phileas's Group Members dynamically
      const myProjects = Object.keys(projectMembers).filter(proj => 
        projectMembers[proj].includes("Phileas Dazeley-Gaist")
      );
      
      myGroupMembers = new Set();
      myProjects.forEach(proj => {
        projectMembers[proj].forEach(member => {
          myGroupMembers.add(member);
        });
      });

      // Generate HTML structures for embed-type slides dynamically
      renderEmbedSlides();

      // Start the visualization
      initGraph();
      setupEventListeners();
    })
    .catch(error => {
      console.error("CGS Network Startup Error:", error);
    });

  // --- Render Embed Slides dynamically from slides.json ---
  function renderEmbedSlides() {
    const container = document.getElementById("dynamic-slides-container");
    if (!container) return;
    container.innerHTML = "";

    slides.forEach((slide, index) => {
      const slideIndex = index + 1;
      if (slide.type !== "embed") return;

      // Create slide container div
      const slideDiv = document.createElement("div");
      slideDiv.id = `slide${slideIndex}-container`;
      slideDiv.className = "slide-container hidden";

      // Create sidebar if config exists
      if (slide.sidebar) {
        const sidebarDiv = document.createElement("div");
        sidebarDiv.className = "slide-sidebar";

        // Sidebar Title
        const sidebarTitle = document.createElement("h2");
        sidebarTitle.className = "slide-sidebar-title";
        sidebarTitle.textContent = slide.sidebar.title || slide.title;
        sidebarDiv.appendChild(sidebarTitle);

        // Sidebar Content
        const sidebarContent = document.createElement("div");
        sidebarContent.className = "slide-sidebar-content";
        (slide.sidebar.paragraphs || []).forEach(text => {
          const p = document.createElement("p");
          p.innerHTML = text; // supports HTML formatting like strong and em
          sidebarContent.appendChild(p);
        });
        sidebarDiv.appendChild(sidebarContent);

        // Action Button
        if (slide.sidebar.link) {
          const linkBtn = document.createElement("a");
          linkBtn.href = slide.sidebar.link;
          linkBtn.target = "_blank";
          linkBtn.className = "slide-action-btn";
          
          const btnText = document.createElement("span");
          btnText.textContent = slide.sidebar.linkLabel || "Open Live Website";
          linkBtn.appendChild(btnText);

          // Add external link icon
          linkBtn.innerHTML += `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          `;
          sidebarDiv.appendChild(linkBtn);
        }

        // QR Code Section
        if (slide.sidebar.qrCodeUrl) {
          const qrContainer = document.createElement("div");
          qrContainer.className = "slide-qrcode-container";

          const qrImg = document.createElement("img");
          // Encode URL for QR Code Server API
          const encodedUrl = encodeURIComponent(slide.sidebar.qrCodeUrl);
          qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodedUrl}&color=101011&bgcolor=ffffff`;
          qrImg.alt = `QR Code for ${slide.sidebar.title}`;
          qrImg.className = "slide-qrcode";
          qrContainer.appendChild(qrImg);

          const qrText = document.createElement("div");
          qrText.className = "slide-qrcode-text";
          qrText.textContent = "Scan to explore the live network on your mobile device";
          qrContainer.appendChild(qrText);

          sidebarDiv.appendChild(qrContainer);
        }

        slideDiv.appendChild(sidebarDiv);
      }

      // Create iframe wrapper
      const iframeWrapper = document.createElement("div");
      iframeWrapper.className = "slide-iframe-wrapper";

      const iframe = document.createElement("iframe");
      iframe.src = slide.iframeUrl;
      iframe.title = `${slide.title} Embedded view`;
      iframe.className = "slide-iframe";
      iframe.loading = "lazy";
      
      // Forward keydown events from iframe to parent window for keyboard navigation
      iframe.addEventListener("load", () => {
        try {
          iframe.contentWindow.addEventListener("keydown", (e) => {
            if (["ArrowRight", "ArrowLeft", "Space", " ", "PageDown", "PageUp", "Backspace", "h", "H"].includes(e.key)) {
              e.preventDefault();
              const eventCopy = new KeyboardEvent("keydown", {
                key: e.key,
                code: e.code,
                bubbles: true,
                cancelable: true
              });
              window.dispatchEvent(eventCopy);
            }
          });
        } catch (err) {
          console.warn("Could not attach keyboard navigation to iframe:", err);
        }
      });

      iframeWrapper.appendChild(iframe);

      slideDiv.appendChild(iframeWrapper);
      container.appendChild(slideDiv);
    });
  }

  // --- Graph Data Generation ---
  function getGraphData(viewType) {
    const nodesMap = new Map();
    const links = [];

    // Helper to add nodes
    const addNode = (name, type, projectTitle) => {
      if (!nodesMap.has(name)) {
        nodesMap.set(name, {
          id: name,
          name: name,
          type: type,
          projects: []
        });
      }
      const nodeObj = nodesMap.get(name);
      if (!nodeObj.projects.includes(projectTitle)) {
        nodeObj.projects.push(projectTitle);
      }
    };

    const projectTitles = Object.keys(projectMembers);

    projectTitles.forEach(project => {
      const students = projectMembers[project] || [];
      const faculties = facultyMentors[project] || [];
      const peers = peerMentors[project] || [];

      // Determine who goes into the graph
      let activeStudents = [];
      let activeFaculties = [];
      let activePeers = [];

      if (viewType === "all") {
        students.forEach(s => addNode(s, "student", project));
        faculties.forEach(f => addNode(f, "faculty", project));
        peers.forEach(p => addNode(p, "peer", project));
        activeStudents = students;
        activeFaculties = faculties;
        activePeers = peers;
      } else if (viewType === "students") {
        students.forEach(s => addNode(s, "student", project));
        activeStudents = students;
      } else if (viewType === "mentors") {
        faculties.forEach(f => addNode(f, "faculty", project));
        peers.forEach(p => addNode(p, "peer", project));
        activeFaculties = faculties;
        activePeers = peers;
      }

      const hasStudents = activeStudents.length > 0;
      const hasMentors = activeFaculties.length > 0 || activePeers.length > 0;

      if (hasStudents || hasMentors) {
        const labelId = 'label-' + project;
        nodesMap.set(labelId, {
          id: labelId,
          name: project,
          type: 'label',
          projects: [project]
        });

        // Clique links between students (visual core group edges)
        for (let i = 0; i < activeStudents.length; i++) {
          for (let j = i + 1; j < activeStudents.length; j++) {
            links.push({
              source: activeStudents[i],
              target: activeStudents[j],
              weight: 1,
              projects: [project],
              type: 'student-student'
            });
          }
        }

        // Invisible centering links from students to the label node
        activeStudents.forEach(s => {
          links.push({
            source: labelId,
            target: s,
            weight: 2,
            projects: [project],
            type: 'student-label'
          });
        });

        // Visible mentor advisory links from mentors to the label node
        activeFaculties.forEach(f => {
          links.push({
            source: f,
            target: labelId,
            weight: 1,
            projects: [project],
            type: 'mentor-label'
          });
        });
        activePeers.forEach(p => {
          links.push({
            source: p,
            target: labelId,
            weight: 1,
            projects: [project],
            type: 'mentor-label'
          });
        });
      }
    });

    // Deduplicate/merge links
    const mergedLinks = [];
    links.forEach(link => {
      let existing = mergedLinks.find(l => 
        (l.source === link.source && l.target === link.target) || 
        (l.source === link.target && l.target === link.source)
      );
      if (existing) {
        existing.weight += link.weight;
        if (!existing.projects.includes(link.projects[0])) {
          existing.projects.push(link.projects[0]);
        }
      } else {
        mergedLinks.push(link);
      }
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links: mergedLinks
    };
  }

  // Helper to wrap SVG text into multiple lines
  function wrapProjectText(text, width) {
    text.each(function() {
      const textNode = d3.select(this);
      const words = textNode.text().split(/\s+/).reverse();
      let word;
      let line = [];
      let lineNumber = 0;
      const lineHeight = 1.2; // ems
      
      textNode.text(null);
      let tspan = textNode.append("tspan").attr("x", 0).attr("dy", "0em");
      
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = textNode.append("tspan").attr("x", 0).attr("dy", lineHeight + "em").text(word);
          lineNumber++;
        }
      }
      
      // Shift vertically to center the text block around y=0
      const totalHeightEms = lineNumber * lineHeight;
      textNode.attr("y", -((totalHeightEms * 11) / 2) + 4);
    });
  }

  // Helper to fit the entire graph within the available viewport
  function zoomToFit(padding = 60, duration = 800) {
    const nodes = node.data().concat(blobLabel ? blobLabel.data() : []);
    if (nodes.length === 0) return;

    let minX = d3.min(nodes, d => d.x);
    let maxX = d3.max(nodes, d => d.x);
    let minY = d3.min(nodes, d => d.y);
    let maxY = d3.max(nodes, d => d.y);

    // Margins
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    // Calculate scale to fit both width and height
    const scale = 0.9 / Math.max(graphWidth / viewWidth, graphHeight / viewHeight);
    const clampedScale = Math.max(0.18, Math.min(2.0, scale));

    const transform = d3.zoomIdentity
      .translate(viewWidth / 2, viewHeight / 2)
      .scale(clampedScale)
      .translate(-graphCenterX, -graphCenterY);

    if (duration > 0) {
      svg.transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .call(zoomBehavior.transform, transform);
    } else {
      svg.call(zoomBehavior.transform, transform);
    }
  }

  // --- D3 Graph Setup ---
  function initGraph() {
    canvasContainer.innerHTML = "";

    svg = d3.select("#graph-3d")
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%");

    gContainer = svg.append("g");

    // Setup Zoom behavior
    zoomBehavior = d3.zoom()
      .scaleExtent([0.15, 5])
      .on("zoom", (event) => {
        gContainer.attr("transform", event.transform);
      });

    svg.call(zoomBehavior)
      .on("dblclick.zoom", null); // disable default double click zoom

    updateView(activeView, false);
  }

  function updateView(viewType, isTransition = true) {
    const data = getGraphData(viewType);
    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    
    if (simulation) simulation.stop();

    gContainer.selectAll("*").remove();

    const visualNodes = data.nodes.filter(n => n.type !== "label");
    const labelNodes = data.nodes.filter(n => n.type === "label");

    const updatePhysicsConstraints = () => {
      // 1. Calculate target centers (cx, cy) for all labels
      labelNodes.forEach(labelNode => {
        const proj = labelNode.name;
        const students = visualNodes.filter(n => n.type === 'student' && n.projects.includes(proj) && !isNaN(n.x) && !isNaN(n.y));
        const offsetY = currentLabelRepel * 0.5;

        let cx, cy;
        if (students.length > 1) {
          cx = d3.mean(students, s => s.x);
          cy = d3.mean(students, s => s.y);
        } else if (students.length === 1) {
          const student = students[0];
          cx = student.x;
          cy = student.y - offsetY;
        } else {
          const mentors = visualNodes.filter(n => n.projects.includes(proj) && !isNaN(n.x) && !isNaN(n.y));
          if (mentors.length > 1) {
            cx = d3.mean(mentors, m => m.x);
            cy = d3.mean(mentors, m => m.y);
          } else if (mentors.length === 1) {
            const mentor = mentors[0];
            cx = mentor.x;
            cy = mentor.y - offsetY;
          }
        }

        if (cx !== undefined && !isNaN(cx)) {
          labelNode.cx = cx;
          labelNode.cy = cy;
        } else {
          labelNode.cx = labelNode.x;
          labelNode.cy = labelNode.y;
        }
      });

      // 2. Repel project labels from each other to prevent overlaps
      for (let step = 0; step < 3; step++) {
        labelNodes.forEach(node1 => {
          labelNodes.forEach(node2 => {
            if (node1.id !== node2.id) {
              const dx = node1.x - node2.x;
              const dy = node1.y - node2.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = currentLabelRepel;
              if (dist < minDist && dist > 0) {
                const push = (minDist - dist) / dist * 0.4;
                node1.x += dx * push;
                node1.y += dy * push;
              }
            }
          });
        });
      }

      // 3. Keep labels near their center of mass (max allowed drift)
      labelNodes.forEach(labelNode => {
        if (labelNode.cx !== undefined && !isNaN(labelNode.cx)) {
          const dx = labelNode.x - labelNode.cx;
          const dy = labelNode.y - labelNode.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDev = currentLabelDrift;
          if (dist > maxDev && dist > 0) {
            labelNode.x = labelNode.cx + (dx / dist) * maxDev;
            labelNode.y = labelNode.cy + (dy / dist) * maxDev;
          }
        }
      });
    };

    // Custom mentor repulsion force function
    const mentorRepulsion = (alpha) => {
      const k = alpha * 0.22;
      data.nodes.forEach(node => {
        if (node.type === 'faculty' || node.type === 'peer') {
          const mentorProjects = node.projects;
          data.nodes.forEach(other => {
            if (other.type === 'student' && other.projects.some(p => mentorProjects.includes(p))) {
              const dx = node.x - other.x;
              const dy = node.y - other.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minClearance = 60; // push outside of student blob radius
              if (dist < minClearance && dist > 0) {
                const push = (minClearance - dist) / dist * k;
                node.x += dx * push;
                node.y += dy * push;
                other.x -= dx * push * 0.15;
                other.y -= dy * push * 0.15;
              }
            }
          });
        }
      });
    };

    // Group projects into connected components for structured grid layout
    const projectTitlesForComp = Object.keys(projectMembers).filter(proj => {
      const students = projectMembers[proj] || [];
      const faculties = facultyMentors[proj] || [];
      const peers = peerMentors[proj] || [];
      let memberNames = [];
      if (viewType === "all") memberNames = [...students, ...faculties, ...peers];
      else if (viewType === "students") memberNames = [...students];
      else if (viewType === "mentors") memberNames = [...faculties, ...peers];
      return memberNames.some(name => nodeMap.has(name));
    });

    const parent = {};
    projectTitlesForComp.forEach(p => parent[p] = p);
    const find = (i) => parent[i] === i ? i : (parent[i] = find(parent[i]));
    const union = (i, j) => {
      const rI = find(i); const rJ = find(j);
      if (rI !== rJ) parent[rI] = rJ;
    };

    const memberProjects = {};
    data.nodes.forEach(n => {
      if (n.type !== 'label') {
        n.projects.forEach(p => {
          if (!memberProjects[n.name]) memberProjects[n.name] = [];
          memberProjects[n.name].push(p);
        });
      }
    });

    Object.values(memberProjects).forEach(projs => {
      if (projs.length > 1) {
        for (let i = 1; i < projs.length; i++) union(projs[0], projs[i]);
      }
    });

    const components = {};
    projectTitlesForComp.forEach(p => {
      const root = find(p);
      if (!components[root]) components[root] = [];
      components[root].push(p);
    });

    const sortedComponents = Object.values(components).sort((a, b) => b.length - a.length);
    const componentCenters = {};

    if (sortedComponents.length > 0) {
      // Main giant connected component in the upper/middle region
      sortedComponents[0].forEach(proj => {
        componentCenters[proj] = { x: width / 2, y: height * 0.38 };
      });

      // Order isolated components in rows below
      const isolated = sortedComponents.slice(1);
      const slotsPerRow = 4;
      const rowHeight = 125;
      const startY = height * 0.58;

      isolated.forEach((comp, idx) => {
        const row = Math.floor(idx / slotsPerRow);
        const col = idx % slotsPerRow;
        const numInRow = Math.min(slotsPerRow, isolated.length - row * slotsPerRow);
        
        const spacingX = width / (numInRow + 1);
        const rawSlotX = spacingX * (col + 1);
        const slotX = width / 2 + (rawSlotX - width / 2) * 0.72; // horizontally compress towards the center
        const slotY = startY + row * rowHeight;

        comp.forEach(proj => {
          componentCenters[proj] = { x: slotX, y: slotY };
        });
      });
    }

    // Initialize node positions from saved layout, or close to their component centers to prevent them flinging on page load
    data.nodes.forEach(node => {
      if (savedLayout && savedLayout[node.id]) {
        const saved = savedLayout[node.id];
        node.x = saved.x;
        node.y = saved.y;
        node.fx = saved.x; // Lock on load
        node.fy = saved.y;
      } else if (node.x === undefined || isNaN(node.x)) {
        const proj = node.projects[0];
        if (proj && componentCenters[proj]) {
          if (node.type === 'label') {
            node.x = componentCenters[proj].x;
            node.y = componentCenters[proj].y - (currentLabelRepel * 0.5);
          } else {
            node.x = componentCenters[proj].x + (Math.random() - 0.5) * 20;
            node.y = componentCenters[proj].y + (Math.random() - 0.5) * 20;
          }
        } else {
          node.x = width / 2 + (Math.random() - 0.5) * 20;
          node.y = height / 2 + (Math.random() - 0.5) * 20;
        }
      }
    });

    // Filter out student-label links so they don't affect physics at all
    const activeLinks = data.links.filter(l => l.type !== 'student-label');

    // Populate initial cx and cy values for label centering force before simulation starts
    updatePhysicsConstraints();

    // Custom label centering force function using physics engine instead of hardcoding
    const labelCentering = (alpha) => {
      const k = alpha * 0.85; // moderately strong centering pull
      labelNodes.forEach(labelNode => {
        if (labelNode.cx !== undefined && !isNaN(labelNode.cx)) {
          labelNode.vx += (labelNode.cx - labelNode.x) * k;
          labelNode.vy += (labelNode.cy - labelNode.y) * k;
        }
      });
    };

    // Create D3 Force Layout
    simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(activeLinks).id(d => d.id)
        .distance(d => {
          if (d.type === 'mentor-label') return 110;
          return currentLinkDist / d.weight;
        })
        .strength(d => {
          if (d.type === 'mentor-label') return 0.25;
          return 0.8;
        }))
      .force("charge", d3.forceManyBody().strength(d => {
        if (d.type === 'label') return 0;
        return currentCharge;
      }).distanceMax(380))
      .force("x", d3.forceX(d => {
        const proj = d.projects[0];
        if (proj && componentCenters[proj]) {
          return componentCenters[proj].x;
        }
        return width / 2;
      }).strength(d => d.type === 'label' ? currentGravity * 0.6 : currentGravity))
      .force("y", d3.forceY(d => {
        const proj = d.projects[0];
        if (proj && componentCenters[proj]) {
          return componentCenters[proj].y;
        }
        return height / 2;
      }).strength(d => d.type === 'label' ? currentGravity * 0.6 : currentGravity))
      .force("collide", d3.forceCollide().radius(d => {
        if (d.type === 'label') {
          return currentLabelRepel * 0.6; // project labels always shown
        }
        return nodeRadius[d.type] + 12;
      }).strength(1.0).iterations(3)) // strength 1.0 and 3 iterations for rigid overlap prevention
      .force("label-centering", labelCentering)
      .force("mentor-repel", mentorRepulsion)
      .velocityDecay(0.38);

    // Pre-heat the simulation to settle the layout initially
    simulation.alpha(1);
    for (let i = 0; i < 90; i++) {
      updatePhysicsConstraints();
      simulation.tick();
    }
    
    // Lock all nodes on page load to disable dynamic physics motion
    data.nodes.forEach(node => {
      node.fx = node.x;
      node.fy = node.y;
    });

    // Identify dynamic project memberships (blobs/hyperedges)
    const projectTitles = Object.keys(projectMembers);
    const blobData = projectTitles.map(project => {
      const students = projectMembers[project] || [];
      const memberNames = [...students];
      const activeMemberNames = memberNames.filter(name => nodeMap.has(name));
      
      return {
        project: project,
        nodeIds: activeMemberNames,
        color: projectColorScale(project)
      };
    }).filter(d => d.nodeIds.length > 0);

    // 1. Draw rounded Minkowski Hulls (blobs) behind everything
    blob = gContainer.append("g")
      .attr("class", "blobs-group")
      .selectAll("path")
      .data(blobData)
      .enter()
      .append("path")
      .attr("class", "project-blob")
      .attr("fill", d => d.color)
      .attr("stroke", d => d.color);

    // 2. Draw Links (filter out invisible student-label links)
    link = gContainer.append("g")
      .attr("class", "links-group")
      .selectAll("line")
      .data(data.links.filter(l => l.type !== 'student-label'))
      .enter()
      .append("line")
      .attr("class", "link-line")
      .attr("stroke", d => d.type === 'mentor-label' ? "var(--color-edge-mentor)" : "var(--color-edge)")
      .attr("stroke-dasharray", d => d.type === 'mentor-label' ? "4,4" : null)
      .attr("stroke-width", d => d.type === 'mentor-label' ? 1.5 : Math.max(0.6, d.weight * 0.75))
      .on("mouseover", showEdgeTooltip)
      .on("mouseout", hideTooltip);

    // 3. Draw Nodes Group (only visual student/mentor nodes)
    node = gContainer.append("g")
      .attr("class", "nodes-group")
      .selectAll("g")
      .data(visualNodes)
      .enter()
      .append("g")
      .attr("class", "node-g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("mouseover", handleNodeMouseOver)
      .on("mouseout", handleNodeMouseOut);

    // Draw Circles
    node.append("circle")
      .attr("class", "node-circle")
      .attr("r", d => nodeRadius[d.type])
      .attr("fill", d => `var(--color-${d.type === 'student' ? 'participant' : d.type})`);

    // Draw Labels
    labels = node.append("text")
      .attr("class", d => d.name === "Phileas Dazeley-Gaist" ? "node-label my-name-label" : "node-label")
      .attr("dx", d => nodeRadius[d.type] + 6)
      .attr("dy", ".31em")
      .text(d => d.name);

    // 4. Draw Project Label Groups (with rect pill background + text)
    blobLabel = gContainer.append("g")
      .attr("class", "project-labels-group")
      .selectAll("g")
      .data(labelNodes)
      .enter()
      .append("g")
      .attr("class", "project-label-node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    blobLabel.append("text")
      .attr("class", "project-blob-label")
      .attr("text-anchor", "middle")
      .text(d => d.name)
      .call(wrapProjectText, 125);

    updateLabelsVisibility();

    // Tick update function
    const ticked = () => {
      updatePhysicsConstraints();

      // Update enclosing hulls (blobs) enclosing student nodes and labels (if visible)
      blob.attr("d", d => {
        const points = [];
        d.nodeIds.forEach(id => {
          const n = nodeMap.get(id);
          if (n) {
            points.push({ x: n.x, y: n.y });
          }
        });

        // Add the project's label node corners to the blob points to ensure labels are fully enclosed
        const labelNode = nodeMap.get('label-' + d.project);
        if (labelNode) {
          const w = 68; // half width of wrapped text (with padding)
          const h = 26; // half height of wrapped text (with padding)
          points.push({ x: labelNode.x - w, y: labelNode.y - h });
          points.push({ x: labelNode.x + w, y: labelNode.y - h });
          points.push({ x: labelNode.x - w, y: labelNode.y + h });
          points.push({ x: labelNode.x + w, y: labelNode.y + h });
        }

        if (points.length === 0) return ""; 
        return getBlobPath(points, 24);
      });

      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => {
          if (d.type === 'mentor-label') {
            const dx = d.source.x - d.target.x;
            const dy = d.source.y - d.target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const proj = d.projects[0];
            const studentCount = (projectMembers[proj] || []).length;
            const R = 32 + Math.min(24, studentCount * 3.5);
            if (dist > R) {
              return d.target.x + (dx / dist) * R;
            }
          }
          return d.target.x;
        })
        .attr("y2", d => {
          if (d.type === 'mentor-label') {
            const dx = d.source.x - d.target.x;
            const dy = d.source.y - d.target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const proj = d.projects[0];
            const studentCount = (projectMembers[proj] || []).length;
            const R = 32 + Math.min(24, studentCount * 3.5);
            if (dist > R) {
              return d.target.y + (dy / dist) * R;
            }
          }
          return d.target.y;
        });

      node
        .attr("transform", d => `translate(${d.x}, ${d.y})`);

      if (blobLabel) {
        blobLabel.attr("transform", d => `translate(${d.x}, ${d.y})`);
      }
    };

    // Bind tick listener
    simulation.on("tick", ticked);

    // Call ticked once manually to apply initial settled positions from pre-heat
    ticked();

    // Automatically zoom to fit the layout within screen boundaries
    zoomToFit(70, isTransition ? 900 : 0);
  }

  // --- Force Simulation Drag Events ---
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    
    if (d.type === 'label') {
      const proj = d.name;
      // Get all student nodes belonging to this project
      d.dragGroup = node.data().filter(n => n.type === 'student' && n.projects.includes(proj));
      d.dragGroup.forEach(n => {
        n.dragOffsetX = n.x - event.x;
        n.dragOffsetY = n.y - event.y;
        n.fx = n.x;
        n.fy = n.y;
      });
      d.fx = d.x;
      d.fy = d.y;
    } else {
      d.fx = d.x;
      d.fy = d.y;
    }
  }

  function dragged(event, d) {
    if (d.type === 'label') {
      if (d.dragGroup) {
        d.dragGroup.forEach(n => {
          n.fx = event.x + n.dragOffsetX;
          n.fy = event.y + n.dragOffsetY;
        });
      }
      d.fx = event.x;
      d.fy = event.y;
    } else {
      d.fx = event.x;
      d.fy = event.y;
    }
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    
    if (d.type === 'label') {
      if (d.dragGroup) {
        d.dragGroup.forEach(n => {
          n.fx = n.x;
          n.fy = n.y;
        });
        d.dragGroup = null;
      }
      d.fx = d.x;
      d.fy = d.y;
    } else {
      d.fx = d.x;
      d.fy = d.y;
    }
  }

  // --- Node Hover Interactions ---
  function handleNodeMouseOver(event, d) {
    hoveredNode = d;
    showNodeTooltip(event, d);

    d3.select(this).classed("hovered", true);

    const connectedNodeIds = new Set();
    connectedNodeIds.add(d.id);
    
    link.each(function(l) {
      if (l.source.id === d.id) connectedNodeIds.add(l.target.id);
      if (l.target.id === d.id) connectedNodeIds.add(l.source.id);
    });

    node.classed("dimmed", n => !connectedNodeIds.has(n.id));
    link.classed("dimmed", l => l.source.id !== d.id && l.target.id !== d.id);
    link.classed("highlighted", l => l.source.id === d.id || l.target.id === d.id);
    link.style("stroke", l => (l.source.id === d.id || l.target.id === d.id) ? "var(--color-edge-highlight)" : "var(--color-edge)");

    const nodeProjects = d.projects;
    blob.classed("dimmed", b => !nodeProjects.includes(b.project));
    blob.classed("highlighted", b => nodeProjects.includes(b.project));
    if (blobLabel) {
      blobLabel.classed("dimmed", b => !nodeProjects.includes(b.project));
      blobLabel.classed("highlighted", b => nodeProjects.includes(b.project));
    }

    labels.style("opacity", n => {
      if (connectedNodeIds.has(n.id)) return 1;
      const currentSlideConfig = slides[currentSlide - 1];
      const showName = !!(currentSlideConfig && currentSlideConfig.showNameLabel);
      if (showName && n.name === "Phileas Dazeley-Gaist") return 1;
      return 0;
    });
  }

  function handleNodeMouseOut(event, d) {
    hoveredNode = null;
    hideTooltip();
    d3.select(this).classed("hovered", false);
    node.classed("dimmed", false);
    link.classed("dimmed", false);
    link.style("stroke", "var(--color-edge)");
    blob.classed("dimmed", false).classed("highlighted", false);
    if (blobLabel) {
      blobLabel.classed("dimmed", false).classed("highlighted", false);
    }
    updateLabelsVisibility();
  }

  // --- Tooltips ---
  function showNodeTooltip(event, d) {
    const typeLabel = d.type === "student" ? "Participant" : d.type === "faculty" ? "Faculty Mentor" : "Peer Mentor";
    const typeColor = `var(--color-${d.type === 'student' ? 'participant' : d.type})`;
    
    tooltip.innerHTML = `
      <div class="tooltip-title">${d.name}</div>
      <div class="tooltip-type" style="color: ${typeColor}">${typeLabel}</div>
      <div style="margin-top: 5px; opacity: 0.75">${d.projects.length} Project(s)</div>
    `;
    tooltip.classList.remove("hidden");
    positionTooltip(event);
  }

  // Show shared edge tooltip
  function showEdgeTooltip(event, d) {
    const projectsList = d.projects.map(p => `<div style="font-size: 11px; margin-top: 3px; font-weight: 500;">• ${p}</div>`).join("");
    tooltip.innerHTML = `
      <div class="tooltip-type" style="color: var(--text-secondary); font-size: 9px; margin-bottom: 2px;">Shared Project Collaboration</div>
      <div class="tooltip-title" style="font-size: 11px;">${d.source.name} &harr; ${d.target.name}</div>
      ${projectsList}
    `;
    tooltip.classList.remove("hidden");
    positionTooltip(event);
    d3.select(this).style("stroke", "var(--color-edge-highlight)").classed("highlighted", true);
  }

  function positionTooltip(event) {
    tooltip.style.left = `${event.pageX}px`;
    tooltip.style.top = `${event.pageY}px`;
  }

  function hideTooltip() {
    tooltip.classList.add("hidden");
    link.style("stroke", "var(--color-edge)").classed("highlighted", false);
  }

  // --- Slide Navigation Logic ---
  function setSlide(slideIndex, updateHash = true) {
    const totalSlides = slides.length || 4; // Fallback to 4 if config not loaded yet
    if (slideIndex < 1 || slideIndex > totalSlides) return;
    currentSlide = slideIndex;

    const currentSlideConfig = slides[currentSlide - 1];

    // Update navigation button disabled states and visibility based on JSON configuration
    const hideArrows = currentSlideConfig && (currentSlideConfig.hideArrows === true || currentSlideConfig.showArrows === false);
    if (prevSlideBtn && nextSlideBtn) {
      if (hideArrows) {
        prevSlideBtn.style.display = "none";
        nextSlideBtn.style.display = "none";
      } else {
        prevSlideBtn.style.display = "";
        nextSlideBtn.style.display = "";
        prevSlideBtn.disabled = (currentSlide === 1);
        nextSlideBtn.disabled = (currentSlide === totalSlides);
      }
    }

    // Update bottom controls label and whole container visibility
    const hideControls = currentSlideConfig && (currentSlideConfig.hideControls === true || currentSlideConfig.showControls === false);
    if (slideControls) {
      if (hideControls) {
        slideControls.style.display = "none";
      } else {
        slideControls.style.display = "flex";
      }
    }
    
    if (slideIndicator) {
      slideIndicator.textContent = `${currentSlide} / ${totalSlides}`;
    }

    // (Slide header elements have been removed from the main presentation DOM)

    // Toggle canvas and dynamic containers
    if (currentSlideConfig && currentSlideConfig.type === "graph") {
      // Show dynamic canvas, hide embed views
      canvasContainer.style.opacity = "1";
      canvasContainer.style.pointerEvents = "auto";
      
      // Hide all dynamic slide containers
      slides.forEach((s, index) => {
        if (s.type === "embed") {
          const container = document.getElementById(`slide${index + 1}-container`);
          if (container) container.classList.add("hidden");
        }
      });

      // Update name highlighting visibility
      const showNameHighlight = !!currentSlideConfig.showNameLabel;
      updateLabelsVisibility(showNameHighlight);
    } else if (currentSlideConfig && currentSlideConfig.type === "embed") {
      // Hide D3 canvas
      canvasContainer.style.opacity = "0";
      canvasContainer.style.pointerEvents = "none";

      // Show this embed container, hide all others
      slides.forEach((s, index) => {
        if (s.type === "embed") {
          const container = document.getElementById(`slide${index + 1}-container`);
          if (container) {
            if (index + 1 === currentSlide) {
              container.classList.remove("hidden");
            } else {
              container.classList.add("hidden");
            }
          }
        }
      });
    }

    // Update URL hash
    if (updateHash) {
      window.location.hash = `#/slide/${currentSlide}`;
    }
  }

  // --- Hash Routing Helpers ---
  function getSlideFromHash() {
    const totalSlides = slides.length || 4;
    const hash = window.location.hash;
    const match = hash.match(/^#\/slide\/([1-9][0-9]*)$/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 1 && val <= totalSlides) return val;
    }
    return 1;
  }

  // --- Label Filtering Logic ---
  function updateLabelsVisibility(useTransition = false) {
    const currentSlideConfig = slides[currentSlide - 1];
    const showName = !!(currentSlideConfig && currentSlideConfig.showNameLabel);

    if (useTransition) {
      // Smooth fade transition for Phileas Dazeley-Gaist's label
      labels.filter(n => n.name === "Phileas Dazeley-Gaist")
        .transition()
        .duration(450)
        .style("opacity", showName ? 1 : 0);
      
      // Ensure other nodes remain hidden
      labels.filter(n => n.name !== "Phileas Dazeley-Gaist")
        .style("opacity", 0);
    } else {
      // Instant update (used on load, resize, and mouse interactions)
      labels.style("opacity", n => {
        if (showName && n.name === "Phileas Dazeley-Gaist") return 1;
        return 0;
      });
    }

    if (blobLabel) {
      blobLabel.style("display", null);
    }
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Click events for slide navigation
    prevSlideBtn.addEventListener("click", () => setSlide(currentSlide - 1));
    nextSlideBtn.addEventListener("click", () => setSlide(currentSlide + 1));

    // Keyboard support for slide presentation
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "Space" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        setSlide(currentSlide + 1);
      } else if (event.key === "ArrowLeft" || event.key === "Backspace" || event.key === "PageUp") {
        event.preventDefault();
        setSlide(currentSlide - 1);
      } else if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        if (slideControls) {
          if (slideControls.style.display === "none") {
            slideControls.style.display = "flex";
          } else {
            slideControls.style.display = "none";
          }
        }
      }
    });

    // Hash routing change listener
    window.addEventListener("hashchange", () => {
      const slide = getSlideFromHash();
      if (slide !== currentSlide) {
        setSlide(slide, false); // Prevent hash loop
      }
    });

    // Resize window support
    window.addEventListener("resize", () => {
      width = window.innerWidth;
      height = window.innerHeight;
      svg.attr("viewBox", `0 0 ${width} ${height}`);
      updateView(activeView, false); // recalculate instantly on resize
    });

    // Initialize slide controls on load based on hash
    const initialSlide = getSlideFromHash();
    setSlide(initialSlide, true);

  }
});
