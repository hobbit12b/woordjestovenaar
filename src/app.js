const State = Object.freeze({
  HOME: "home",
  PAGE_TURN_TO_WORD: "pageTurnToWord",
  WORD_VISIBLE: "wordVisible",
  IMAGE_REVEAL: "imageReveal",
  HOLD_IMAGE: "holdImage",
  FADE_OUT_WORD_AND_IMAGE: "fadeOutWordAndImage",
  PAGE_TURN_NEXT: "pageTurnNext",
  FADE_IN_WORD: "fadeInWord"
});

const BUTTON_FADE_MS = 250;
const IMAGE_REVEAL_MS = 900;
const IMAGE_HOLD_MS = 1600;
const CONTENT_DISSOLVE_MS = 450;
const DISSOLVE_SPARKLE_MS = 800;
const WORD_FADE_IN_MS = 800;
const PAGE_TURN_PLAYBACK_RATE = 1.75;
const NORMAL_VIDEO_PLAYBACK_RATE = 1;
const DEFAULT_VIDEO_FALLBACK_MS = 7000;
const VIDEO_FALLBACK_PADDING_MS = 1200;
const SPARKLE_COLORS = ["#fffdf2", "#ffd96d", "#fff0a6", "#ffd6e7"];
const PLAYER_STORAGE_KEY = "woordjestovenaar.players";
const DELETED_PLAYER_STORAGE_KEY = "woordjestovenaar.deletedPlayers";
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
const UI_TRANSITION_MS = 550;

const app = document.getElementById("app");
const homeScreen = document.getElementById("homeScreen");
const indexListView = document.getElementById("indexListView");
const readingScreen = document.getElementById("readingScreen");
const studentIndex = document.getElementById("studentIndex");
const addPlayerButton = document.getElementById("addPlayerButton");
const closePlayerPanelButton = document.getElementById("closePlayerPanelButton");
const playerPanel = document.getElementById("playerPanel");
const homeMagicLayer = document.getElementById("homeMagicLayer");
const readingCloseButton = document.getElementById("readingCloseButton");
const wordText = document.getElementById("wordText");
const wordImage = document.getElementById("wordImage");
const magicLayer = document.getElementById("magicLayer");
const wordReadButton = document.getElementById("wordReadButton");
const bottleHomeHotspot = document.getElementById("bottleHomeHotspot");
const pageTurnLayer = document.getElementById("pageTurnLayer");
const pageTurnVideo = document.getElementById("pageTurnVideo");

let state = State.HOME;
let activeWords = [];
let wordQueue = [];
let currentWord = null;
let interactionLocked = false;
let flowId = 0;
let finishActiveVideo = null;
let players = loadPlayers();
let selectedPlayer = null;
let uiMode = "indexList";
let uiTransitioning = false;

function sleep(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function setState(nextState) {
  state = nextState;
  app.dataset.state = state;
}

function setInteractionLocked(isLocked) {
  interactionLocked = isLocked;
  wordReadButton.disabled = isLocked;
  wordReadButton.classList.toggle("interaction-locked", isLocked);
  studentIndex.querySelectorAll("button").forEach(button => {
    button.disabled = isLocked;
  });
}

function resetPageTurnVideoRate() {
  if (!pageTurnVideo) return;
  pageTurnVideo.defaultPlaybackRate = NORMAL_VIDEO_PLAYBACK_RATE;
  pageTurnVideo.playbackRate = NORMAL_VIDEO_PLAYBACK_RATE;
}

function cleanupPageTurnVideo() {
  if (!pageTurnVideo) return;
  pageTurnVideo.pause();
  resetPageTurnVideoRate();
  pageTurnVideo.currentTime = 0;
  pageTurnLayer.classList.add("hidden");
}

async function hideReadButton() {
  wordReadButton.classList.add("read-button-hidden");
  wordReadButton.classList.remove("read-button-appear");
  wordReadButton.replaceChildren();
  await sleep(BUTTON_FADE_MS);
}

function playReadButtonSparkles() {
  wordReadButton.replaceChildren();

  for (let index = 0; index < 14; index += 1) {
    const sparkle = document.createElement("span");
    const angle = Math.random() * Math.PI * 2;
    const distance = 12 + Math.random() * 20;
    sparkle.className = "button-sparkle";
    sparkle.style.left = `${2 + Math.random() * 96}%`;
    sparkle.style.top = `${4 + Math.random() * 92}%`;
    sparkle.style.setProperty("--button-sparkle-size", `${4 + Math.random() * 4}px`);
    sparkle.style.setProperty("--button-sparkle-duration", `${900 + Math.random() * 450}ms`);
    sparkle.style.setProperty("--button-sparkle-delay", `${100 + Math.random() * 280}ms`);
    sparkle.style.setProperty("--button-sparkle-x", `${Math.cos(angle) * distance}px`);
    sparkle.style.setProperty("--button-sparkle-y", `${Math.sin(angle) * distance}px`);
    wordReadButton.appendChild(sparkle);
    sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
  }
}

async function showReadButton() {
  wordReadButton.classList.remove("read-button-appear");
  void wordReadButton.offsetWidth;
  wordReadButton.classList.remove("read-button-hidden");
  wordReadButton.classList.add("read-button-appear");
  playReadButtonSparkles();
  await sleep(BUTTON_FADE_MS);
}

function hideReadingCloseButton() {
  readingCloseButton.classList.add("reading-close-hidden");
}

function showReadingCloseButton() {
  readingCloseButton.classList.remove("reading-close-hidden");
}

function clearMagicEffects() {
  magicLayer.replaceChildren();
  wordText.classList.remove("soft-glow");
  wordImage.classList.remove("soft-glow");
}

function resetPageContentLayer() {
  wordText.classList.remove("content-magic-dissolve");
  wordImage.classList.remove("content-magic-dissolve");
  wordText.style.visibility = "";
  wordImage.style.visibility = "";
}

function createSparkle(x, y, options = {}, layer = magicLayer) {
  const sparkle = document.createElement("span");
  const size = options.size || 6 + Math.random() * 10;
  const angle = Math.random() * Math.PI * 2;
  const distance = options.distance || 28 + Math.random() * 48;

  sparkle.className = `sparkle${Math.random() > .55 ? " star" : ""}`;
  sparkle.style.left = `${x}px`;
  sparkle.style.top = `${y}px`;
  sparkle.style.setProperty("--sparkle-size", `${size}px`);
  sparkle.style.setProperty("--sparkle-color", SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]);
  sparkle.style.setProperty("--sparkle-duration", `${options.duration || 900 + Math.random() * 400}ms`);
  sparkle.style.setProperty("--sparkle-x", `${Math.cos(angle) * distance}px`);
  sparkle.style.setProperty("--sparkle-y", `${Math.sin(angle) * distance - 10}px`);
  layer.appendChild(sparkle);
  sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
}

async function playMagicBurst(targetElement, options = {}, layer = magicLayer) {
  if (!targetElement) return;

  const layerRect = layer.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  const count = Math.min(45, Math.max(32, options.count || 38));
  const duration = options.duration || 1100;
  targetElement.classList.add("soft-glow");

  for (let index = 0; index < count; index += 1) {
    const side = index % 4;
    const x = side < 2
      ? targetRect.left - layerRect.left + Math.random() * targetRect.width
      : targetRect.left - layerRect.left + (side === 2 ? 0 : targetRect.width);
    const y = side >= 2
      ? targetRect.top - layerRect.top + Math.random() * targetRect.height
      : targetRect.top - layerRect.top + (side === 0 ? 0 : targetRect.height);
    createSparkle(x, y, { duration }, layer);
  }

  await sleep(duration);
  targetElement.classList.remove("soft-glow");
}

function normalizePlayer(player) {
  return {
    id: String(player.id),
    name: String(player.name),
    knownLetters: [...new Set((player.knownLetters || []).filter(letter => ALPHABET.includes(letter)))]
  };
}

function loadPlayers() {
  let storedPlayers = [];
  let deletedPlayerIds = [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(PLAYER_STORAGE_KEY) || "[]");
    if (Array.isArray(stored)) storedPlayers = stored.map(normalizePlayer);
    const deleted = JSON.parse(window.localStorage.getItem(DELETED_PLAYER_STORAGE_KEY) || "[]");
    if (Array.isArray(deleted)) deletedPlayerIds = deleted.map(String);
  } catch (error) {
    storedPlayers = [];
    deletedPlayerIds = [];
  }

  const merged = [...storedPlayers];
  STUDENTS.map(normalizePlayer).forEach(student => {
    if (!deletedPlayerIds.includes(student.id) && !merged.some(player => player.id === student.id)) {
      merged.push(student);
    }
  });

  savePlayers(merged);
  return merged;
}

function savePlayers(nextPlayers = players) {
  try {
    window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(nextPlayers));
  } catch (error) {
    // The game remains usable when storage is unavailable.
  }
}

function rememberDeletedPlayer(playerId) {
  try {
    const deleted = JSON.parse(window.localStorage.getItem(DELETED_PLAYER_STORAGE_KEY) || "[]");
    const deletedIds = Array.isArray(deleted) ? deleted.map(String) : [];
    if (!deletedIds.includes(String(playerId))) deletedIds.push(String(playerId));
    window.localStorage.setItem(DELETED_PLAYER_STORAGE_KEY, JSON.stringify(deletedIds));
  } catch (error) {
    // Removing still works for this session when storage is unavailable.
  }
}

function renderStudents() {
  studentIndex.innerHTML = "";
  players.forEach(student => {
    const button = document.createElement("button");
    button.className = "student-button";
    button.textContent = student.name;
    button.addEventListener("click", () => openPlayerLetters(student));
    studentIndex.appendChild(button);
  });
}

async function transitionIndexView(fromView, toView) {
  if (uiTransitioning || fromView === toView) return;
  uiTransitioning = true;
  playMagicBurst(fromView, { count: 32, duration: UI_TRANSITION_MS }, homeMagicLayer);
  fromView.classList.add("ui-dissolve");
  await sleep(UI_TRANSITION_MS);
  fromView.classList.add("hidden");
  fromView.classList.remove("ui-dissolve");
  toView.classList.remove("hidden");
  toView.classList.add("ui-fade-in");
  await sleep(UI_TRANSITION_MS);
  toView.classList.remove("ui-fade-in");
  homeMagicLayer.replaceChildren();
  uiTransitioning = false;
}

function createLetterGrid(knownLetters, onChange) {
  const grid = document.createElement("div");
  grid.className = "letter-grid";

  ALPHABET.forEach(letter => {
    const label = document.createElement("label");
    label.className = "letter-choice";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = letter;
    checkbox.checked = knownLetters.includes(letter);
    checkbox.addEventListener("change", onChange);
    const text = document.createElement("span");
    text.textContent = letter;
    label.append(checkbox, text);
    grid.appendChild(label);
  });

  return grid;
}

function getSelectedLetters() {
  return [...playerPanel.querySelectorAll(".letter-choice input:checked")].map(input => input.value);
}

function createPanelButton(text, onClick) {
  const button = document.createElement("button");
  button.className = "player-action-button";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

async function deletePlayer(player) {
  if (uiTransitioning || !window.confirm(`${player.name} verwijderen?`)) return;

  rememberDeletedPlayer(player.id);
  players = players.filter(item => item.id !== player.id);
  savePlayers();
  selectedPlayer = null;
  renderStudents();
  await showIndexList();
}

function renderPlayerPanel(player, isNew) {
  playerPanel.replaceChildren();
  const title = document.createElement("h2");
  title.className = "player-title";
  title.textContent = isNew ? "Speler toevoegen" : player.name;

  let nameInput = null;
  if (isNew) {
    nameInput = document.createElement("input");
    nameInput.className = "player-name-input";
    nameInput.placeholder = "Naam";
    nameInput.autocomplete = "off";
  }

  const message = document.createElement("p");
  message.className = "player-message";

  const grid = createLetterGrid(player.knownLetters, () => {
    if (isNew) return;
    player.knownLetters = getSelectedLetters();
    savePlayers();
  });

  playerPanel.appendChild(title);
  if (nameInput) playerPanel.appendChild(nameInput);
  playerPanel.appendChild(grid);

  if (isNew) {
    playerPanel.appendChild(createPanelButton("Opslaan", async () => {
      const name = nameInput.value.trim();
      if (!name) {
        message.textContent = "Vul een naam in.";
        return;
      }

      const newPlayer = {
        id: `player-${Date.now()}`,
        name,
        knownLetters: getSelectedLetters()
      };
      players.push(newPlayer);
      savePlayers();
      renderStudents();
      await showIndexList();
    }));
  } else {
    playerPanel.appendChild(createPanelButton("Woordjes oefenen", () => startReadingFromPlayerPanel(player, message)));
    const deleteButton = createPanelButton("Speler verwijderen", () => deletePlayer(player));
    deleteButton.classList.add("player-delete-button");
    playerPanel.appendChild(deleteButton);
  }

  playerPanel.appendChild(message);
}

async function startReadingFromPlayerPanel(player, messageElement) {
  if (uiTransitioning || interactionLocked) return;

  const words = getWordsForStudent(player);
  if (!words.length) {
    messageElement.textContent = "Nog geen woorden voor deze letters.";
    return;
  }

  uiTransitioning = true;
  playMagicBurst(playerPanel, { count: 42, duration: UI_TRANSITION_MS }, homeMagicLayer);
  playerPanel.classList.add("ui-dissolve");
  await sleep(UI_TRANSITION_MS);
  playerPanel.classList.remove("ui-dissolve");
  homeMagicLayer.replaceChildren();
  uiTransitioning = false;
  await startReadingWithStudent(player, messageElement);
}

async function openPlayerLetters(player) {
  if (uiTransitioning) return;
  selectedPlayer = player;
  uiMode = "playerLetters";
  renderPlayerPanel(player, false);
  closePlayerPanelButton.classList.remove("hidden");
  await transitionIndexView(indexListView, playerPanel);
}

async function openAddPlayer() {
  if (uiTransitioning) return;
  selectedPlayer = null;
  uiMode = "addPlayer";
  renderPlayerPanel({ knownLetters: [] }, true);
  closePlayerPanelButton.classList.remove("hidden");
  await transitionIndexView(indexListView, playerPanel);
  playerPanel.querySelector(".player-name-input")?.focus();
}

async function showIndexList() {
  if (uiTransitioning) return;
  selectedPlayer = null;
  uiMode = "indexList";
  renderStudents();
  closePlayerPanelButton.classList.add("hidden");
  if (!playerPanel.classList.contains("hidden")) {
    await transitionIndexView(playerPanel, indexListView);
  } else {
    indexListView.classList.remove("hidden");
  }
}

function resetWordImage() {
  wordImage.onload = null;
  wordImage.onerror = null;
  wordImage.removeAttribute("src");
  wordImage.alt = "";
  wordImage.className = "word-image hidden";
}

function showHome() {
  flowId += 1;
  if (finishActiveVideo) finishActiveVideo();
  cleanupPageTurnVideo();
  clearMagicEffects();
  homeMagicLayer.replaceChildren();
  resetPageContentLayer();
  resetWordImage();

  readingScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  indexListView.classList.remove("hidden", "ui-dissolve", "ui-fade-in");
  playerPanel.classList.add("hidden");
  playerPanel.classList.remove("ui-dissolve", "ui-fade-in");
  closePlayerPanelButton.classList.add("hidden");
  selectedPlayer = null;
  uiMode = "indexList";
  uiTransitioning = false;
  renderStudents();
  activeWords = [];
  wordQueue = [];
  currentWord = null;
  wordText.textContent = "";
  wordText.className = "word-text";
  wordReadButton.classList.remove("read-button-hidden");
  hideReadingCloseButton();
  bottleHomeHotspot.classList.add("hidden");
  setInteractionLocked(false);
  setState(State.HOME);
}

async function startReadingWithStudent(student, messageElement) {
  if (interactionLocked) return;

  const words = getWordsForStudent(student);
  if (!words.length) {
    if (messageElement) messageElement.textContent = "Nog geen woorden voor deze letters.";
    return;
  }

  const thisFlow = ++flowId;
  selectedPlayer = student;
  activeWords = words;
  wordQueue = [];
  currentWord = null;
  homeScreen.classList.add("hidden");
  readingScreen.classList.remove("hidden");
  bottleHomeHotspot.classList.remove("hidden");
  wordText.textContent = "";
  wordReadButton.classList.add("read-button-hidden");
  hideReadingCloseButton();
  setInteractionLocked(true);

  await playPageTurnVideo(State.PAGE_TURN_TO_WORD);
  if (thisFlow !== flowId) return;
  await showNextWordWithMagic(thisFlow);
}

function getWordsForStudent(student) {
  const letters = new Set(student.knownLetters);
  return WORDS.filter(item => [...item.word].every(letter => letters.has(letter)));
}

function selectNextWord() {
  if (!activeWords.length) {
    currentWord = null;
    return;
  }

  if (!wordQueue.length) {
    wordQueue = shuffleWords(activeWords);

    if (wordQueue.length > 1 && wordQueue[0].word === currentWord?.word) {
      [wordQueue[0], wordQueue[1]] = [wordQueue[1], wordQueue[0]];
    }
  }

  currentWord = wordQueue.shift();
}

function shuffleWords(words) {
  const shuffled = [...words];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function resolveWordImagePath(imagePath) {
  return imagePath.startsWith("assets/") ? `../${imagePath}` : imagePath;
}

function prepareWordImage(word) {
  resetWordImage();
  if (!word.image) return;

  wordImage.onload = () => wordImage.classList.add("image-ready");
  wordImage.onerror = () => resetWordImage();
  wordImage.alt = word.word;
  wordImage.src = resolveWordImagePath(word.image);
}

async function showNextWordWithMagic(thisFlow) {
  clearMagicEffects();
  resetPageContentLayer();
  resetWordImage();
  selectNextWord();
  prepareWordImage(currentWord);
  wordText.textContent = currentWord.word;
  wordText.className = "word-text word-fade-in";
  setState(State.FADE_IN_WORD);

  await Promise.all([
    sleep(WORD_FADE_IN_MS),
    playMagicBurst(wordText, { count: 36, duration: 1000 })
  ]);
  if (thisFlow !== flowId) return;
  wordText.className = "word-text word-visible";
  setState(State.WORD_VISIBLE);
  await showReadButton();
  if (thisFlow === flowId) {
    showReadingCloseButton();
    setInteractionLocked(false);
  }
}

async function revealImageThenTurnPage() {
  if (interactionLocked || state !== State.WORD_VISIBLE || !currentWord) return;

  const thisFlow = ++flowId;
  setInteractionLocked(true);
  await hideReadButton();
  if (thisFlow !== flowId) return;
  await revealImageWithMagic();
  if (thisFlow !== flowId) return;
  setState(State.HOLD_IMAGE);
  await sleep(IMAGE_HOLD_MS);
  if (thisFlow !== flowId) return;
  await transitionToNextWord(thisFlow);
  if (thisFlow !== flowId) return;
  await showNextWordWithMagic(thisFlow);
}

async function revealImageWithMagic() {
  setState(State.IMAGE_REVEAL);
  if (!wordImage.classList.contains("image-ready")) {
    await sleep(IMAGE_REVEAL_MS);
    return;
  }

  wordImage.classList.remove("hidden");
  wordImage.classList.add("image-magic-in");
  await Promise.all([
    sleep(IMAGE_REVEAL_MS),
    playMagicBurst(wordImage, { count: 40, duration: 1100 })
  ]);
  wordImage.classList.remove("image-magic-in");
}

async function dissolveCurrentContentQuickly() {
  setState(State.PAGE_TURN_NEXT);
  hideReadingCloseButton();
  wordText.classList.add("content-magic-dissolve");
  if (!wordImage.classList.contains("hidden")) {
    wordImage.classList.add("content-magic-dissolve");
  }
  playMagicBurst(wordText, { count: 34, duration: DISSOLVE_SPARKLE_MS });
  if (!wordImage.classList.contains("hidden")) {
    playMagicBurst(wordImage, { count: 40, duration: DISSOLVE_SPARKLE_MS });
  }

  await sleep(CONTENT_DISSOLVE_MS);
  wordText.style.visibility = "hidden";
  wordImage.style.visibility = "hidden";
  wordText.classList.remove("content-magic-dissolve");
  wordImage.classList.remove("content-magic-dissolve");
}

async function returnToActivePlayerLetters() {
  if (!selectedPlayer || uiTransitioning) {
    showHome();
    return;
  }

  const player = players.find(item => item.id === selectedPlayer.id);
  if (!player) {
    showHome();
    return;
  }

  const thisFlow = ++flowId;
  uiTransitioning = true;
  setInteractionLocked(true);
  hideReadButton();
  hideReadingCloseButton();

  if (finishActiveVideo) finishActiveVideo();
  cleanupPageTurnVideo();

  const visibleTargets = [wordText];
  if (!wordImage.classList.contains("hidden")) visibleTargets.push(wordImage);
  visibleTargets.forEach(target => {
    target.classList.add("content-magic-dissolve");
    playMagicBurst(target, { count: 36, duration: UI_TRANSITION_MS });
  });
  await sleep(UI_TRANSITION_MS);
  if (thisFlow !== flowId) return;

  clearMagicEffects();
  resetPageContentLayer();
  resetWordImage();
  wordText.textContent = "";
  readingScreen.classList.add("hidden");
  bottleHomeHotspot.classList.add("hidden");

  selectedPlayer = player;
  uiMode = "playerLetters";
  renderPlayerPanel(player, false);
  indexListView.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  closePlayerPanelButton.classList.remove("hidden");
  playerPanel.classList.remove("hidden");
  playerPanel.classList.add("ui-fade-in");
  playMagicBurst(playerPanel, { count: 42, duration: UI_TRANSITION_MS }, homeMagicLayer);
  await sleep(UI_TRANSITION_MS);
  playerPanel.classList.remove("ui-fade-in");
  homeMagicLayer.replaceChildren();
  setState(State.HOME);
  setInteractionLocked(false);
  uiTransitioning = false;
}

async function transitionToNextWord(thisFlow) {
  setInteractionLocked(true);
  await dissolveCurrentContentQuickly();
  if (thisFlow !== flowId) return;
  await playPageTurnVideo(State.PAGE_TURN_NEXT);
  if (thisFlow !== flowId) return;

  wordText.textContent = "";
  wordText.className = "word-text";
  resetWordImage();
  clearMagicEffects();
  resetPageContentLayer();
}

function playPageTurnVideo(turnState) {
  return new Promise(resolve => {
    const video = pageTurnVideo;
    let fallbackTimer = null;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      video.removeEventListener("ended", finish);
      video.pause();
      resetPageTurnVideoRate();
      pageTurnLayer.classList.add("hidden");
      finishActiveVideo = null;
      resolve();
    };

    setState(turnState);
    setInteractionLocked(true);
    hideReadingCloseButton();
    pageTurnLayer.classList.remove("hidden");
    video.pause();
    resetPageTurnVideoRate();
    video.currentTime = 0;
    video.defaultPlaybackRate = NORMAL_VIDEO_PLAYBACK_RATE;
    video.playbackRate = PAGE_TURN_PLAYBACK_RATE;
    finishActiveVideo = finish;

    const durationMs = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration * 1000 / PAGE_TURN_PLAYBACK_RATE
      : DEFAULT_VIDEO_FALLBACK_MS;
    fallbackTimer = window.setTimeout(finish, durationMs + VIDEO_FALLBACK_PADDING_MS);
    video.addEventListener("ended", finish, { once: true });

    try {
      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {
          // The fallback timer keeps the game moving when Safari blocks play().
        });
      }
    } catch (error) {
      // The fallback timer keeps the game moving.
    }
  });
}

wordReadButton.addEventListener("click", revealImageThenTurnPage);
bottleHomeHotspot.addEventListener("click", returnToActivePlayerLetters);
readingCloseButton.addEventListener("click", showHome);
addPlayerButton.addEventListener("click", openAddPlayer);
closePlayerPanelButton.addEventListener("click", showIndexList);

renderStudents();
resetPageTurnVideoRate();
pageTurnVideo.load();
showHome();
