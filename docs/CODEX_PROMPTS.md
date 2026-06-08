# Codex prompts

## PR 1: Storybook shell

Bouw de eerste werkende storybook shell voor Lettermaatje.

Context:
Dit is een kleuterleesgame. De docent zit erbij. Het kind ziet vooral een open boek, één woord en een paarse knop. Geen standaard webapp-look.

Werk alleen in:
- src/index.html
- src/styles.css
- src/app.js
- src/data/students.js
- src/data/words.js

Eisen:
1. Maak twee schermen: home/index en reading.
2. Home: centraal een open boekscene. Leerlingnamen staan op de boekpagina.
3. Reading: open boek blijft centraal. Groot woord op rechterpagina. Paarse knop: "Woord gelezen ->". Home-knop linksonder.
4. Voeg state machine toe:
   - home
   - pageTurnToWord
   - wordVisible
   - imageReveal
   - pageTurnNext
5. Gebruik placeholder assets via CSS.
6. Werk goed op iPad liggend.
7. Geen framework.

Acceptatie:
- Ik kan een leerling kiezen.
- Er verschijnt een woord.
- Klik op "Woord gelezen ->" toont een placeholder-plaatje.
- Daarna komt automatisch een volgend woord.
- Home gaat terug naar de index.

## PR 2: Animatie en magie

Verbeter alleen animaties en visuele polish:
- page-turn animatie tussen index en woordpagina
- page-turn animatie tussen woorden
- image reveal met sparkle-effect
- geen framework
- geen wijziging aan data

## PR 3: Leerlingbeheer

Voeg leerlingbeheer toe:
- leerling toevoegen
- letters aanpassen
- localStorage
- woorden filteren op bekende letters
- beheer alleen op indexpagina

## PR 4: Import/export

Voeg iPad-uitwisseling toe:
- export JSON
- import JSON
- kopieer/plak-code
- import werkt samenvoegend

## PR 5: Echte assets

Bereid assets voor:
- assets/ui/storybook-bg.png
- assets/ui/book-open.png
- assets/ui/home-button.png
- assets/ui/purple-button.png
- assets/words/<woord>.png
- fallback als asset ontbreekt
