STARWEAVER — final root deployment files

Upload all files in this folder to the ROOT of naniwadekar.com.

Files:
- starweaver.html — game
- starweaver-manifest.json — PWA manifest
- starweaver-sw.js — service worker, explicitly scoped by registration/manifest to /starweaver.html
- starweaver-icon-180.png — Apple Home Screen icon
- starweaver-icon-192.png — standard PWA/favicon icon
- starweaver-icon-512.png — large/maskable PWA and social icon
- index.html — your supplied Curiosities index, with STARWEAVER added after Astronomy

Important:
The service worker file is at site root because that is where the HTML registers it from. The registration scope is /starweaver.html, so it does not control MathQuest, the French course, the Curiosities home page, or other projects.

On a future STARWEAVER release, change CACHE in starweaver-sw.js (for example v1 -> v2) if you change cached asset filenames or want to force retirement of the old shell cache. The HTML itself is network-first, so normal online page updates are picked up even without a cache-version bump.
