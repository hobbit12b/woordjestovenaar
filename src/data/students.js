const OFFERED_LETTERS_2025_2026 = ["w", "r", "t", "p", "a", "s", "g", "h", "k", "l", "z", "v", "b", "n", "m"];

try {
  const versionKey = "woordjestovenaar.contentVersion";
  const version = "2025-2026-empty-start-with-offered-item";
  if (localStorage.getItem(versionKey) !== version) {
    localStorage.setItem("woordjestovenaar.players", "[]");
    localStorage.setItem("woordjestovenaar.deletedPlayers", "[]");
    localStorage.setItem(versionKey, version);
  }
} catch (error) {
  // Opslag is niet noodzakelijk om de basis te gebruiken.
}

const STUDENTS = [
  {
    id: "aangeboden-2025-2026",
    name: "aangeboden in 2025-2026",
    knownLetters: OFFERED_LETTERS_2025_2026
  }
];
