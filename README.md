# Blue Gallery redesign

Design concept for bluefineart.com: a new homepage and an exhibition page.

To preview, run `preview.bat` on Windows, or run `python -m http.server 8123` and open http://localhost:8123/index.html. The videos need this local server to play.

- `index.html`: homepage
- `exhibition.html`: exhibition page, filled with "The Landscape Within" by Isaac Maimon
- `gallery.html`: virtual room in 3D, the "quiet" room, with the eleven works of "The Landscape Within". Notes in `docs/virtual-gallery-brief.md` and `docs/gallery-surfaces-research.md`. Needs the local server.
- `gallery-first.html`: the first, plain version of that room. Kept as the starting point for new room designs. Both pages run on `assets/js/gallery.js`.
- `docs/`: audit of the current site and exhibition page research
- `tools/optimize_images.py`: makes the local WebP images and zoom tiles
- `tools/bake_light.py`: works out the light in the quiet room and saves it as pictures in `assets/img/light/`. Run it again after changing the room's size or colours.
- `tools/build_demo.py`: builds the labelled concept copies used for Claude artifacts

## Password screen

Every page loads `assets/js/gate.js`, which hides the page until the visitor types the preview password. It also asks search engines not to list the pages.

This is a curtain, not a lock. GitHub Pages cannot check a password before it sends a page, so the check runs in the visitor's browser. Anyone who knows how can still read the files, and this repository is public. For a real lock, host the site somewhere that checks the password on its own side.

Artwork images belong to the artists and Blue Gallery. All rights reserved.
