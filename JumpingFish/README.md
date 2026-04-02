# Bubble Drift

Bubble Drift is a small static browser game inspired by Flappy Bird, rebuilt as an underwater fish game with canvas rendering, local best-score saving, and lightweight browser sound effects.

## Project structure

- `index.html`: main page and game UI
- `style.css`: layout and visual styling
- `script.js`: gameplay, sound effects, score logic, and localStorage
- `README.md`: run, share, and deployment notes

The game is a plain static HTML/CSS/JS project. There is no backend, no build step, and no framework dependency.

## Run locally

1. Open `index.html` in a modern browser.
2. Click `Start Swim` or press `Space` to begin.
3. Press `Space`, click, or tap to swim upward.

If a browser is strict about local file access, run a tiny static server in this folder and open the local address it prints.

Examples:

- `python -m http.server`
- `npx serve`

## Share it as a folder or zip

The easiest local sharing option is to send the project folder or a zip file containing:

- `index.html`
- `style.css`
- `script.js`
- `README.md`

Anyone receiving the files can open `index.html` directly in a browser.

## Deploy on GitHub Pages

This project works as a static site on GitHub Pages without any backend service.

Basic steps:

1. Create a GitHub repository and upload the project files to the repository root.
2. Make sure `index.html`, `style.css`, and `script.js` stay in the root of the published site.
3. In GitHub, open the repository `Settings`.
4. Open `Pages`.
5. Under `Build and deployment`, choose `Deploy from a branch`.
6. Select the branch to publish, usually `main`, and the folder `/ (root)`.
7. Save the settings and wait for GitHub Pages to publish the site.
8. Open the GitHub Pages URL once deployment finishes.

No build step is required, and no asset pipeline is needed.

## Static hosting compatibility

The current file paths already work for both local opening and static hosting:

- `index.html` loads `style.css` and `script.js` with relative paths.
- There are no absolute URLs that would break on GitHub Pages.
- There are no backend requests or server-only features.

No path adjustment is needed for GitHub Pages or similar static hosts.

## Notes for hosting and sharing

- Best score is stored with `localStorage`, so it persists in the same browser on the same device.
- Best score does not sync between devices or between different site origins. A local file open and a GitHub Pages URL will keep separate saved scores.
- Sound effects are generated with the browser Web Audio API, so there are no external effect assets to manage.
- If you want to host it somewhere else, any static host such as Netlify, Cloudflare Pages, Vercel, or a simple web server will work the same way.



