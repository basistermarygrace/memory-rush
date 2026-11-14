# MEMORY RUSH: THE LOST FILES

A card-matching browser game with an online leaderboard.
Recover the files. Beat the clock. Top the leaderboard.

Play it here: https://basistermarygrace.github.io/memory-rush/

## Features
- 4 levels (12, 18, 24 and 30 cards) played in order
- 4 difficulties that unlock one after another (Easy, Medium, Hard, Expert)
- 3 lives, virus cards, bonus cards, and a timer in Level 3 and the Final Challenge
- Online leaderboard (one row per name, best score kept)
- First-time tutorial popups
- Sound effects and background music made with code (Web Audio API)

## Tech
HTML, CSS, vanilla JavaScript, Supabase (PostgreSQL), GitHub Pages

## Files
- index.html: the screens
- style.css: the design
- script.js: the game logic
- supabase.js: the database connection (Project URL and publishable key only)

## How the leaderboard works
- Visitors can only READ the leaderboard (Row Level Security is on).
- Scores are saved only through the submit_score() database function.
  It cleans the name, rejects blank names, invalid difficulty or level,
  and impossible scores, and updates a name only if the new score is higher.

## Limits
- This is server-checked, NOT cheat-proof, because the game runs in the browser.
  A future upgrade is an Edge Function that runs the game rules on the server.
- A name is a public label, not a secure account.
- Difficulty unlocks and tutorials are saved in the browser (localStorage),
  so they reset if the browser data is cleared or another device is used.

## Run locally
1. Download or clone this repository.
2. Open the folder in Visual Studio Code.
3. Right-click index.html and choose "Open with Live Server".

## Credits
Made by Mary Grace M. Basister for my midterm project.