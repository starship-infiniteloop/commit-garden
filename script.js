// --- GLOBAL APPLICATION STATE ---
const state = {
  username: null,
  isDemoMode: true,
  commitCount: 0,
  streak: 0,
  activeTab: "garden",
  audioEnabled: false,
  userData: {
    name: "Octocat (Zen Mode)",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80",
    bio: "Cultivating coding habits, one beautiful sprout at a time. Plant seeds today to harvest tomorrow's forest.",
    repos: 12,
    followers: 48,
    following: 24
  },
  repos: [],
  activityLog: [],
  contributionData: []
};

// Web Audio API Synthesizer Context
let audioCtx = null;

// Sakura scale frequencies (Japanese Pentatonic: A, B, C, E, F across octaves)
const KOTO_SCALE = [
  110.00, 123.47, 130.81, 164.81, 174.61, // A2 - F3
  220.00, 246.94, 261.63, 329.63, 349.23, // A3 - F4
  440.00, 493.88, 523.25, 659.25, 698.46, // A4 - F5
  880.00, 987.77, 1046.50, 1318.51, 1396.91 // A5 - F6
];

// --- INITIALIZE APPLICATION ON LOAD ---
document.addEventListener("DOMContentLoaded", () => {
  // Check for saved session
  const savedUser = localStorage.getItem("zen_github_username");
  const savedCommits = localStorage.getItem("zen_commit_count");
  const savedStreak = localStorage.getItem("zen_streak");

  if (savedCommits !== null) {
    state.commitCount = parseInt(savedCommits, 10);
  }
  if (savedStreak !== null) {
    state.streak = parseInt(savedStreak, 10);
  } else {
    // Start with a mock streak of 12 for the demo state
    state.streak = 12;
  }

  // Set up background sakura petal shower
  initSakuraPetals();

  // Setup UI Navigation & Interaction Handlers
  initEventHandlers();

  // If a session exists, log back in
  if (savedUser) {
    state.username = savedUser;
    state.isDemoMode = false;
    loadGitHubProfile(savedUser);
  } else {
    // Show login screen
    showScreen("login-screen");
    // Draw initial empty canvas tree for preview
    drawBonsaiTree(state.commitCount);
  }
  
  // Render mock heatmap & chart initially
  generateContributionData();
  renderHeatmap();
  renderStatsChart();
});

// --- SCREEN TRANSITIONS ---
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
    s.style.display = "none";
  });
  
  const target = document.getElementById(screenId);
  target.style.display = "flex";
  // Force reflow
  target.offsetHeight;
  target.classList.add("active");

  if (screenId === "dashboard-screen") {
    // Redraw bonsai canvas after display is block
    setTimeout(() => {
      drawBonsaiTree(state.commitCount);
    }, 100);
  }
}

// --- TAB SWITCHING (DASHBOARD) ---
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update Navigation menu highlights
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    }
  });

  // Toggle visible viewport contents
  document.querySelectorAll(".viewport-tab-content").forEach(content => {
    content.classList.remove("active");
  });
  document.getElementById(`tab-${tabId}`).classList.add("active");

  // Play a soft koto sound when shifting tabs (if audio enabled)
  playKotoNote(KOTO_SCALE[5 + Math.floor(Math.random() * 5)]);

  // Redraw graphics in case container size changed
  if (tabId === "garden") {
    drawBonsaiTree(state.commitCount);
  } else if (tabId === "stats") {
    renderStatsChart();
  } else if (tabId === "streak") {
    renderHeatmap();
  }
}

// --- EVENT HANDLERS SETUP ---
function initEventHandlers() {
  // Login Form Submission
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("github-username").value.trim();
    if (username) {
      state.username = username;
      state.isDemoMode = false;
      localStorage.setItem("zen_github_username", username);
      
      // Initialize Audio Context on gesture
      initAudioCtx();
      
      // Play transition chime
      playZenChime();

      loadGitHubProfile(username);
    }
  });

  // Enter Demo Sandbox Mode
  const demoBtn = document.getElementById("enter-demo-btn");
  demoBtn.addEventListener("click", () => {
    state.username = "octocat";
    state.isDemoMode = true;
    localStorage.removeItem("zen_github_username");
    
    // Set default mockup data
    state.commitCount = 12; // Start with 12 commits for full tree demonstration!
    state.streak = 12;
    updateStateDisplay();
    
    initAudioCtx();
    playZenChime();
    
    // Load mock user data
    setMockUserData();
    showScreen("dashboard-screen");
  });

  // Log Out button
  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("zen_github_username");
    state.username = null;
    state.isDemoMode = true;
    state.commitCount = 0;
    state.streak = 0;
    localStorage.removeItem("zen_commit_count");
    localStorage.removeItem("zen_streak");
    showScreen("login-screen");
  });

  // Sidebar Tab items
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const tabId = item.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // Audio Toggle Button
  const audioBtn = document.getElementById("audio-toggle-btn");
  audioBtn.addEventListener("click", toggleAudio);

  const audioPanelBtn = document.getElementById("audio-panel-toggle");
  audioPanelBtn.addEventListener("click", toggleAudio);

  // Audio Pluck Test buttons
  document.getElementById("test-koto-btn").addEventListener("click", () => {
    initAudioCtx();
    playKotoNote(KOTO_SCALE[8 + Math.floor(Math.random() * 5)]);
  });

  document.getElementById("test-chime-btn").addEventListener("click", () => {
    initAudioCtx();
    playZenChime();
  });

  // Interactive Sandbox Controls (Tab 4)
  const slider = document.getElementById("simulation-slider");
  slider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    updateCommitCount(val);
  });

  document.getElementById("sim-add-1").addEventListener("click", () => {
    updateCommitCount(state.commitCount + 1);
    playKotoNote(KOTO_SCALE[7 + (state.commitCount % 8)]);
    triggerInteractivePetalBurst(5);
  });

  document.getElementById("sim-add-5").addEventListener("click", () => {
    updateCommitCount(state.commitCount + 5);
    playZenChime();
    triggerInteractivePetalBurst(20);
  });

  document.getElementById("sim-reset").addEventListener("click", () => {
    updateCommitCount(0);
    playKotoNote(KOTO_SCALE[0]); // Low heavy note
  });

  // Handle timeline stage-item clicks (Quick Set)
  document.querySelectorAll(".timeline-stage-item").forEach(item => {
    item.addEventListener("click", () => {
      const targetLvl = parseInt(item.getAttribute("data-level"), 10);
      let targetCommits = 0;
      if (targetLvl === 1) targetCommits = 2; // Sprout
      else if (targetLvl === 2) targetCommits = 5; // Sapling
      else if (targetLvl === 3) targetCommits = 8; // Zen Tree
      else if (targetLvl === 4) targetCommits = 12; // Full Bloom

      updateCommitCount(targetCommits);
      playZenChime();
    });
  });
}

// --- STATE MODIFICATIONS ---
function updateCommitCount(count) {
  state.commitCount = Math.max(0, count);
  localStorage.setItem("zen_commit_count", state.commitCount);
  
  // Update state values in UI slider
  const slider = document.getElementById("simulation-slider");
  if (slider) slider.value = state.commitCount;

  updateStateDisplay();
}

function updateStateDisplay() {
  // Update numeric indicators
  document.getElementById("current-commit-count").innerText = state.commitCount;
  document.getElementById("streak-days-count").innerText = state.streak;
  document.getElementById("stat-repos").innerText = state.userData.repos;
  document.getElementById("stat-followers").innerText = state.userData.followers;
  document.getElementById("stat-following").innerText = state.userData.following;

  // Calculate evolution stage indexes
  let stageIndex = 0;
  let stageName = "Drought Land";
  let stageDesc = "0 commits today. A quiet, dry Zen stone garden waiting for the spark of creation.";
  
  if (state.commitCount === 0) {
    stageIndex = 0;
  } else if (state.commitCount >= 1 && state.commitCount <= 3) {
    stageIndex = 1;
    stageName = "Sprout";
    stageDesc = `${state.commitCount} commit${state.commitCount > 1 ? 's' : ''} today. A tiny, glowing neon-pink sprout breaks through the sand, radiating vital energy.`;
  } else if (state.commitCount >= 4 && state.commitCount <= 6) {
    stageIndex = 2;
    stageName = "Sapling";
    stageDesc = `${state.commitCount} commits today. A slender, elegant Bonsai sapling unfurls its initial glowing twigs.`;
  } else if (state.commitCount >= 7 && state.commitCount <= 10) {
    stageIndex = 3;
    stageName = "Zen Tree";
    stageDesc = `${state.commitCount} commits today. Twisting branches stand strong, adorned with rich pastel cherry foliage.`;
  } else if (state.commitCount > 10) {
    stageIndex = 4;
    stageName = "Sakura Bloom Glow";
    stageDesc = `${state.commitCount} commits! Cosmic neon bloom! A massive cherry blossom tree radiating golden warm lights and showering petals.`;
  }

  // Update status card text
  document.getElementById("garden-stage-name").innerText = stageName;
  document.getElementById("garden-stage-desc").innerText = stageDesc;

  // Update active item in timeline
  document.querySelectorAll(".timeline-stage-item").forEach(item => {
    item.classList.remove("active");
  });
  const activeTimelineItem = document.getElementById(`stage-${stageIndex}`);
  if (activeTimelineItem) {
    activeTimelineItem.classList.add("active");
  }

  // Update progress bar
  const pct = Math.min(100, (state.commitCount / 12) * 100);
  const prgBar = document.getElementById("today-blossom-bar");
  if (prgBar) prgBar.style.width = `${pct}%`;

  // Update delta text caption below progress bar
  const deltaText = document.getElementById("metric-delta-text");
  const deltaArrow = document.getElementById("metric-delta-arrow");
  if (state.commitCount === 0) {
    deltaText.innerText = "Drought state. Make a commit to sprout.";
    deltaArrow.style.color = "var(--color-sakura-dark)";
    deltaArrow.innerText = "●";
  } else if (state.commitCount < 10) {
    deltaText.innerText = `${10 - state.commitCount} more commits to reach full glowing blossom.`;
    deltaArrow.style.color = "var(--color-gold)";
    deltaArrow.innerText = "▲";
  } else {
    deltaText.innerText = "Blossom achieved! The garden is radiating high energy.";
    deltaArrow.style.color = "var(--color-mint-dark)";
    deltaArrow.innerText = "★";
  }

  // Redraw canvas
  drawBonsaiTree(state.commitCount);
}

// Set Default Mock User Profile details
function setMockUserData() {
  state.userData = {
    name: "Octocat (Zen Mode)",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80",
    bio: "Cultivating coding habits, one beautiful sprout at a time. Plant seeds today to harvest tomorrow's forest.",
    repos: 52,
    followers: 128,
    following: 24
  };
  
  document.getElementById("user-avatar").src = state.userData.avatar;
  document.getElementById("user-display-name").innerText = state.userData.name;
  document.getElementById("user-github-link").innerText = `@octocat`;
  document.getElementById("user-bio").innerText = state.userData.bio;

  // Set mockup logs
  state.activityLog = [
    { title: "Pushed to commit-garden", time: "2m ago" },
    { title: "Pushed to portfolio", time: "1h ago" },
    { title: "Created new repository", time: "3h ago" },
    { title: "Pushed to anime-website", time: "5h ago" }
  ];
  renderActivityLog();

  // Set mockup repo directory
  state.repos = [
    { name: "commit-garden", desc: "A gorgeous pastel zen digital bonsai tracker", stars: 18 },
    { name: "portfolio", desc: "My professional digital interactive space", stars: 32 },
    { name: "anime-website", desc: "A frontend landing project in custom pastels", stars: 7 },
    { name: "zen-audio-generator", desc: "Web Audio synth procedural system", stars: 4 }
  ];
  renderRepos();
}

// --- GITHUB API CLIENT INTEGRATION ---
async function loadGitHubProfile(username) {
  showLoadingState();

  try {
    // 1. Fetch main user profile
    const userRes = await fetch(`https://api.github.com/users/${username}`);
    if (!userRes.ok) throw new Error("User not found");
    const user = await userRes.json();

    if (user) {
      state.userData = {
        name: user.name || user.login,
        avatar: user.avatar_url,
        bio: user.bio || "No bio added yet. A quiet coder seeking the sakura path.",
        repos: user.public_repos,
        followers: user.followers,
        following: user.following
      };

      document.getElementById("user-avatar").src = state.userData.avatar;
      document.getElementById("user-display-name").innerText = state.userData.name;
      document.getElementById("user-github-link").innerText = `@${user.login}`;
      document.getElementById("user-bio").innerText = `"${state.userData.bio}"`;
    }

    // 2. Fetch public repos directory
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`);
    if (reposRes.ok) {
      const gitRepos = await reposRes.json();
      state.repos = gitRepos.map(r => ({
        name: r.name,
        desc: r.description || "Cultivating this codebase silently.",
        stars: r.stargazers_count
      }));
      renderRepos();
    }

    // 3. Fetch User Events to calculate actual commits made today!
    const eventsRes = await fetch(`https://api.github.com/users/${username}/events`);
    let todayCommits = 0;
    const eventsList = [];

    if (eventsRes.ok) {
      const events = await eventsRes.json();
      
      // Parse today's dates
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      events.forEach(evt => {
        const evtDate = evt.created_at.split("T")[0];
        
        // Track recent events for the widget list
        if (eventsList.length < 5) {
          let eventTitle = "";
          if (evt.type === "PushEvent") {
            eventTitle = `Pushed to ${evt.repo.name.split("/")[1]}`;
          } else if (evt.type === "CreateEvent") {
            eventTitle = `Created ${evt.payload.ref_type || 'resource'} in ${evt.repo.name.split("/")[1]}`;
          } else if (evt.type === "WatchEvent") {
            eventTitle = `Starred repo ${evt.repo.name}`;
          } else {
            eventTitle = `${evt.type.replace("Event", "")} on ${evt.repo.name.split("/")[1]}`;
          }

          const parsedTime = new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          eventsList.push({ title: eventTitle, time: parsedTime });
        }

        // Count pushes today
        if (evt.type === "PushEvent" && evtDate === todayStr) {
          if (evt.payload && evt.payload.commits) {
            todayCommits += evt.payload.commits.length;
          }
        }
      });

      state.activityLog = eventsList;
      renderActivityLog();
      
      // Set calculated real commit count!
      state.commitCount = todayCommits;
      localStorage.setItem("zen_commit_count", todayCommits);
    } else {
      throw new Error("Events API limited");
    }

    // Finished successfully! Show dashboard
    updateStateDisplay();
    showScreen("dashboard-screen");

  } catch (error) {
    console.warn("GitHub API error. Entering Sandbox with mock layout:", error);
    // Graceful fallback to sandbox values
    setMockUserData();
    state.commitCount = 12; // Start with mock active garden
    updateStateDisplay();
    showScreen("dashboard-screen");

    // Add a custom warning log in recent activities
    state.activityLog.unshift({ title: "⚠️ Rate limit fallback loaded", time: "Just now" });
    renderActivityLog();
  }
}

function showLoadingState() {
  const submitBtn = document.querySelector(".submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>Cultivating Soil... 🌸</span>";
  }
}

// --- RENDER SIDEBAR LIST DETAILS ---
function renderRepos() {
  const repoContainer = document.getElementById("repo-list");
  if (!repoContainer) return;

  if (state.repos.length === 0) {
    repoContainer.innerHTML = `
      <div class="repo-empty-state">
        <span class="empty-icon">🗂️</span>
        <p>This garden ledger is currently empty. Cultivate repositories on GitHub.</p>
      </div>
    `;
    return;
  }

  repoContainer.innerHTML = state.repos.map(r => `
    <div class="repo-item">
      <div class="repo-info">
        <h4>${r.name}</h4>
        <p>${r.desc}</p>
      </div>
      <div class="repo-stars">
        <span>★</span>
        <span>${r.stars}</span>
      </div>
    </div>
  `).join("");
}

function renderActivityLog() {
  const logContainer = document.getElementById("activity-log");
  if (!logContainer) return;

  if (state.activityLog.length === 0) {
    logContainer.innerHTML = `
      <div class="activity-item">
        <span class="act-dot empty"></span>
        <div class="act-details">
          <p class="act-title">Sanctuary is perfectly quiet</p>
          <p class="act-time">Ready for interaction</p>
        </div>
      </div>
    `;
    return;
  }

  logContainer.innerHTML = state.activityLog.map(act => `
    <div class="activity-item">
      <span class="act-dot"></span>
      <div class="act-details">
        <p class="act-title">${act.title}</p>
        <p class="act-time">${act.time}</p>
      </div>
    </div>
  `).join("");
}

// --- BACKGROUND FLOATING SAKURA PETALS GENERATOR ---
function initSakuraPetals() {
  const container = document.getElementById("petals-container");
  if (!container) return;

  const maxPetals = 25;
  for (let i = 0; i < maxPetals; i++) {
    createPetal(container, true);
  }

  // Slowly inject new ones
  setInterval(() => {
    if (container.children.length < maxPetals) {
      createPetal(container, false);
    }
  }, 1500);
}

function createPetal(container, isInit) {
  const petal = document.createElement("div");
  petal.className = "sakura-petal";
  
  // Random sizing
  const size = Math.random() * 8 + 6; // 6px to 14px
  petal.style.width = `${size}px`;
  petal.style.height = `${size}px`;

  // Random spawning coordinates
  const leftStart = Math.random() * 100; // 0% to 100% width
  petal.style.left = `${leftStart}%`;
  
  const topStart = isInit ? (Math.random() * 100) : -10; // offset if generating mid-loop
  petal.style.top = `${topStart}%`;

  // Custom random delay and duration to create a natural flow
  const duration = Math.random() * 8 + 8; // 8s to 16s
  const delay = Math.random() * 5;
  petal.style.animationDuration = `${duration}s`;
  petal.style.animationDelay = `-${delay}s`;

  // Random rotation & pastel tint slight variations
  const rotateStart = Math.random() * 360;
  const pinkHue = 340 + Math.floor(Math.random() * 20); // 340 to 360 (gorgeous pastel cherry)
  petal.style.backgroundColor = `hsl(${pinkHue}, 100%, 90%)`;
  petal.style.transform = `rotate(${rotateStart}deg)`;

  container.appendChild(petal);

  // Remove element after it has drifted out of screen
  setTimeout(() => {
    if (petal.parentNode === container) {
      container.removeChild(petal);
    }
  }, (duration + delay) * 1000);
}

// Trigger high density petal burst (called on button press!)
function triggerInteractivePetalBurst(count) {
  const container = document.getElementById("petals-container");
  if (!container) return;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const petal = document.createElement("div");
      petal.className = "sakura-petal";
      const size = Math.random() * 6 + 5;
      petal.style.width = `${size}px`;
      petal.style.height = `${size}px`;
      
      // Spawn near the tree island (center/bottom center)
      const centerSpread = 45 + (Math.random() * 20 - 10); // 35% to 55%
      petal.style.left = `${centerSpread}%`;
      petal.style.top = "60%"; // Near the island height

      const duration = Math.random() * 4 + 4; // Fast rise and float away
      petal.style.animationDuration = `${duration}s`;
      petal.style.animationTimingFunction = "ease-out";
      
      // Custom upward/diagonal fast drift
      petal.animate([
        { transform: "translate(0, 0) rotate(0deg) scale(0.6)", opacity: 1 },
        { transform: `translate(${Math.random() * 300 - 150}px, -400px) rotate(${Math.random() * 720}deg) scale(1)`, opacity: 0 }
      ], {
        duration: duration * 1000,
        easing: "cubic-bezier(0.1, 0.8, 0.3, 1)"
      });

      container.appendChild(petal);
      setTimeout(() => {
        if (petal.parentNode === container) container.removeChild(petal);
      }, duration * 1000);
    }, i * 50);
  }
}

// --- PROCEDURAL RECURSIVE FRACAL BONSAI DRAWER ---
function drawBonsaiTree(commits) {
  const canvas = document.getElementById("bonsai-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  // Clear Canvas completely
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Set drawing center coordinates
  const centerX = canvas.width / 2;
  const baseY = canvas.height - 75;

  // --- DRAW GLASS AND SOIL ISLAND PLATFORM ---
  // Island silhouette
  ctx.save();
  ctx.shadowColor = "rgba(232, 122, 144, 0.15)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 8;
  
  // Draw base white-transparent Zen tray
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(centerX, baseY + 15, 170, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Draw dark soil base
  ctx.fillStyle = "rgba(74, 53, 67, 0.08)";
  ctx.beginPath();
  ctx.ellipse(centerX, baseY + 12, 155, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw Zen decorative small stones
  ctx.fillStyle = "rgba(206, 188, 216, 0.65)"; // lavender pebble
  ctx.beginPath();
  ctx.arc(centerX - 80, baseY + 8, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX - 70, baseY + 11, 8, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)"; // white stone
  ctx.beginPath();
  ctx.arc(centerX + 90, baseY + 10, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- DRAW GROWTH PHASES ---
  if (commits === 0) {
    // Phase 0: Drought Sand Garden (No plant, dry branch silhouettes)
    drawZenDroughtBranches(ctx, centerX, baseY);
  } else if (commits >= 1 && commits <= 3) {
    // Phase 1: Small Sprout Seedling
    drawBonsaiSprout(ctx, centerX, baseY);
  } else {
    // Phase 2, 3, 4: Fractal Bonsai Tree grows taller/richer
    let maxDepth = 4; // Sapling (4-6 commits)
    let branchScale = 0.78;
    let bloomDensity = 2; // low buds
    let trunkThickness = 12;
    let trunkLength = 70;
    
    if (commits >= 7 && commits <= 10) {
      // Phase 3: Zen Tree (7-10 commits)
      maxDepth = 6;
      branchScale = 0.8;
      bloomDensity = 8;
      trunkThickness = 18;
      trunkLength = 80;
    } else if (commits > 10) {
      // Phase 4: Sakura Bloom Glow (10+ commits)
      maxDepth = 8;
      branchScale = 0.82;
      bloomDensity = 18;
      trunkThickness = 24;
      trunkLength = 85;
    }

    // Set trunk base coordinate and start recursive draw
    ctx.save();
    // Beautiful plum-lavender pastel color for the twisty branch trunk
    ctx.strokeStyle = "rgba(74, 53, 67, 0.85)";
    ctx.lineCap = "round";
    
    // Draw the recursive tree structure
    drawBonsaiBranch(ctx, centerX, baseY, trunkLength, -Math.PI / 2, trunkThickness, 1, maxDepth, branchScale, bloomDensity, commits);
    ctx.restore();
    
    // Draw supplementary ambient particle bubbles above full bloom tree
    if (commits > 10) {
      drawGoldenPulsingParticles(ctx, centerX, baseY - 120);
    }
  }
}

// 0 COMMITS: Barren Sand & skeletal branches
function drawZenDroughtBranches(ctx, x, y) {
  // Dry raked sand concentric rings pattern
  ctx.strokeStyle = "rgba(74, 53, 67, 0.04)";
  ctx.lineWidth = 2;
  for (let r = 25; r < 140; r += 20) {
    ctx.beginPath();
    ctx.ellipse(x, y + 10, r, r * 0.1, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // skeletal miniature dry twigs sticking out of stones
  ctx.strokeStyle = "rgba(108, 85, 101, 0.55)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  
  // Twin small twigs
  ctx.beginPath();
  ctx.moveTo(x - 80, y + 5);
  ctx.quadraticCurveTo(x - 90, y - 20, x - 85, y - 35);
  ctx.moveTo(x - 83, y - 18);
  ctx.lineTo(x - 76, y - 28);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 70, y + 9);
  ctx.quadraticCurveTo(x - 72, y - 5, x - 65, y - 15);
  ctx.stroke();
}

// 1-3 COMMITS: Glowing sprout seedling
function drawBonsaiSprout(ctx, x, y) {
  ctx.save();
  // Small sprout stem
  ctx.strokeStyle = "var(--color-sakura-dark)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.quadraticCurveTo(x + 5, y - 15, x - 10, y - 35);
  ctx.stroke();

  // Sprout glowing aura
  ctx.shadowColor = "rgba(255, 163, 177, 0.7)";
  ctx.shadowBlur = 12;

  // Sprout double tiny pastel leaf-buds
  ctx.fillStyle = "var(--color-sakura)";
  ctx.beginPath();
  ctx.ellipse(x - 10, y - 35, 10, 5, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFC069"; // glowing peach-gold secondary leaf
  ctx.beginPath();
  ctx.ellipse(x - 8, y - 34, 7, 4, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

// 4+ COMMITS: Recursive Fractal Bonsai Tree branch drawer
function drawBonsaiBranch(ctx, startX, startY, length, angle, width, depth, maxDepth, scale, bloomDensity, commitVal) {
  // End of branch calculations
  const endX = startX + Math.cos(angle) * length;
  const endY = startY + Math.sin(angle) * length;

  // Draw the current segment
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  // Add a slight natural curved wave to trunks instead of straight lines
  const midX = (startX + endX) / 2 + (Math.random() * 6 - 3);
  const midY = (startY + endY) / 2 + (Math.random() * 6 - 3);
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();

  // Stop condition
  if (depth >= maxDepth) {
    // Draw beautiful Sakura blossoms at the tips!
    drawBlossomClusters(ctx, endX, endY, bloomDensity, commitVal);
    return;
  }

  // Branch splits! (Always split into 2-3 branches with slight angles)
  const branchCount = (depth === 1) ? 3 : 2; // Split 3 from main trunk base
  
  for (let i = 0; i < branchCount; i++) {
    // Custom balanced curves
    let newAngle;
    if (branchCount === 3) {
      newAngle = angle + [-0.35, 0.05, 0.45][i] + (Math.random() * 0.1 - 0.05);
    } else {
      newAngle = angle + [-0.38, 0.42][i] + (Math.random() * 0.12 - 0.06);
    }

    const nextLength = length * (scale - (Math.random() * 0.04));
    const nextWidth = Math.max(1.5, width * 0.62);

    drawBonsaiBranch(ctx, endX, endY, nextLength, newAngle, nextWidth, depth + 1, maxDepth, scale, bloomDensity, commitVal);
  }
}

// Draw multiple glowing circular flower clusters representing Sakura
function drawBlossomClusters(ctx, x, y, density, commits) {
  ctx.save();
  
  // Decide cluster sizes
  const clusterRadius = commits > 10 ? 18 : 10;
  
  // Set shadows for glowing neon blossom look
  ctx.shadowColor = "rgba(255, 163, 177, 0.6)";
  ctx.shadowBlur = commits > 10 ? 12 : 5;

  for (let i = 0; i < density; i++) {
    // Spread offset
    const offX = Math.random() * clusterRadius - (clusterRadius / 2);
    const offY = Math.random() * clusterRadius - (clusterRadius / 2);
    const size = Math.random() * 4 + 3; // petal radius

    // Select color (Shades of sakura pastel pinks and golds)
    let fillStyle = "rgba(255, 192, 203, 0.85)"; // standard soft pink
    const rnd = Math.random();
    if (rnd > 0.7) {
      fillStyle = "rgba(232, 122, 144, 0.9)"; // deeper cherry pink
    } else if (rnd > 0.4 && commits > 7) {
      fillStyle = "rgba(255, 210, 196, 0.95)"; // warm peach
    } else if (rnd > 0.25 && commits > 10) {
      fillStyle = "rgba(255, 229, 180, 0.98)"; // pastel gold glow highlight
    }

    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.arc(x + offX, y + offY, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Stage 4+ Only: Golden neon particles floating upwards in Zen space
function drawGoldenPulsingParticles(ctx, x, y) {
  ctx.save();
  ctx.shadowColor = "rgba(255, 192, 105, 0.6)";
  ctx.shadowBlur = 10;

  for (let i = 0; i < 6; i++) {
    const pX = x + Math.sin(Date.now() * 0.001 + i) * 160;
    const pY = y + Math.cos(Date.now() * 0.0008 + i) * 50 - (i * 20);
    const size = Math.abs(Math.sin(Date.now() * 0.002 + i)) * 3.5 + 1.5;

    ctx.fillStyle = "rgba(255, 220, 140, 0.75)";
    ctx.beginPath();
    ctx.arc(pX, pY, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- PROCEDURAL ZEN WEB AUDIO SYNTHESIZER ---
function initAudioCtx() {
  if (audioCtx) return;
  
  // Safe browser Audio Context initialization
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
}

function toggleAudio() {
  initAudioCtx();
  
  // Resume context if suspended (Chrome Autoplay policy)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  state.audioEnabled = !state.audioEnabled;

  // Update UI Elements
  const headerBtn = document.getElementById("audio-toggle-btn");
  const panelBtn = document.getElementById("audio-panel-toggle");
  
  if (state.audioEnabled) {
    headerBtn.classList.add("active-sound");
    headerBtn.querySelector(".btn-label").innerText = "Sound Active";
    panelBtn.classList.add("active");
    panelBtn.innerText = "Enabled 🎋";

    // Play welcome cord
    setTimeout(() => {
      playKotoNote(KOTO_SCALE[5]); // A3
      playKotoNote(KOTO_SCALE[7]); // C4
      playKotoNote(KOTO_SCALE[9]); // F4
    }, 150);
  } else {
    headerBtn.classList.remove("active-sound");
    headerBtn.querySelector(".btn-label").innerText = "Zen Sound";
    panelBtn.classList.remove("active");
    panelBtn.innerText = "Disabled";
  }
}

// Synthesizer: Procedural pluck of Koto (Japanese traditional string instrument)
function playKotoNote(frequency) {
  if (!state.audioEnabled || !audioCtx) return;

  try {
    // Setup Nodes
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Instrument Tone Shape: Koto pluck is represented nicely by a Triangle wave combined with a fast filter sweep
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Tone frequency richness: add soft harmonic overlay
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(frequency * 2, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);

    // Koto Pluck Envelope (Fast Attack, Rapid decay, long soft release sustain)
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.005); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.15); // Decay
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2); // Release

    // Start & Destroy
    osc.start(now);
    osc.stop(now + 1.25);
  } catch (err) {
    console.warn("Koto audio fail:", err);
  }
}

// Synthesizer: Procedural metallic Zen Chime (gong-like overlay on major events)
function playZenChime() {
  if (!state.audioEnabled || !audioCtx) return;

  try {
    const now = audioCtx.currentTime;
    
    // Construct multiple high frequencies for realistic metallic harmonics
    const freqs = [350, 480, 880, 1200, 1500];
    
    freqs.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Chime is smooth sine waves
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      
      // Decay envelope (Higher harmonics decay faster, just like a real bell/chime!)
      const decayDuration = 2.5 - (idx * 0.4); 
      const maxVolume = 0.08 - (idx * 0.012);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(maxVolume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, now + decayDuration);
      
      osc.start(now);
      osc.stop(now + decayDuration + 0.1);
    });
  } catch (err) {
    console.warn("Chime audio fail:", err);
  }
}

// --- TAB 2: RENDER PASTEL STATS CHART ---
function renderStatsChart() {
  const canvas = document.getElementById("stats-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw chart grids
  ctx.strokeStyle = "rgba(74, 53, 67, 0.06)";
  ctx.lineWidth = 1;
  
  // Horizontal grids
  for (let y = 30; y < 190; y += 40) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(canvas.width - 30, y);
    ctx.stroke();
  }

  // Mock past 7 days data
  const data = [1, 3, state.commitCount, 4, 8, 2, Math.max(1, state.commitCount - 2)];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Draw smooth curve line
  ctx.save();
  ctx.strokeStyle = "var(--color-sakura-dark)";
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Create subtle glow behind line
  ctx.shadowColor = "var(--color-sakura)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  const points = [];
  const paddingX = 50;
  const spacingX = (canvas.width - 100) / (data.length - 1);
  const chartHeight = 150;
  const baselineY = 180;

  data.forEach((val, index) => {
    const x = paddingX + index * spacingX;
    // Scale commit count to visual height (max height mapped to 12 commits)
    const y = baselineY - (Math.min(12, val) / 12) * chartHeight;
    points.push({ x, y });
  });

  // Curve line drawer using quadratic bezier curves
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();

  // Draw glowing cherry dots on points
  ctx.shadowBlur = 5;
  data.forEach((val, index) => {
    const pt = points[index];
    ctx.fillStyle = "white";
    ctx.strokeStyle = "var(--color-sakura-dark)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw labels & values
    ctx.fillStyle = "var(--color-plum)";
    ctx.font = "bold 9px var(--font-numeric)";
    ctx.textAlign = "center";
    ctx.fillText(val, pt.x, pt.y - 14);

    ctx.fillStyle = "var(--color-plum-light)";
    ctx.font = "500 10px var(--font-main)";
    ctx.fillText(labels[index], pt.x, baselineY + 22);
  });

  ctx.restore();
}

// --- TAB 3: GENERATE HISTORIC PASTEL HEATMAP ---
function generateContributionData() {
  // Generate mock contribution ledger densities for a 24x7 small display grid
  state.contributionData = [];
  const totalCells = 24 * 7;
  for (let i = 0; i < totalCells; i++) {
    // Generate a distribution that favors lower values but has interesting high-commit streaks
    const rnd = Math.random();
    let level = 0;
    if (rnd > 0.88) level = 4;
    else if (rnd > 0.75) level = 3;
    else if (rnd > 0.55) level = 2;
    else if (rnd > 0.25) level = 1;
    state.contributionData.push(level);
  }
}

function renderHeatmap() {
  const grid = document.getElementById("contribution-grid");
  if (!grid) return;

  grid.innerHTML = "";

  // Render cells in contribution grid
  state.contributionData.forEach((lvl, idx) => {
    const cell = document.createElement("div");
    cell.className = `heatmap-cell lvl-${lvl}`;
    
    // Inject tooltips on hover
    const dateMock = new Date();
    dateMock.setDate(dateMock.getDate() - (168 - idx));
    const formattedDate = dateMock.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    let commitLabel = "0 commits (Drought)";
    if (lvl === 1) commitLabel = "1-3 commits (Sprouted)";
    else if (lvl === 2) commitLabel = "4-6 commits (Sapling)";
    else if (lvl === 3) commitLabel = "7-10 commits (Zen Tree)";
    else if (lvl === 4) commitLabel = "10+ commits (Sakura Bloom!)";

    cell.title = `${formattedDate}: ${commitLabel}`;
    grid.appendChild(cell);
  });
}
