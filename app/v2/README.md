CMSD Virtual Piano Duet — Melody Notebook v2

Separate route: https://apps.musedlab.org/virtualduet/cmsd/v2/
The original /cmsd/ remains unchanged.

Capture engine provenance: ruthmann/rengongfu-sandbox, local recovered revision
fc87b1276ad1a9f6eb650455bb03059ee9341793, assets/js/takes.mjs and
 tools/scale-rows/index.html. This reuses its gesture recorder, timestamped event
format, piano-roll renderer and timed player. Workshop defaults are retained:
2.5-second released-key gap, minimum two notes / 800 ms, 90-second maximum,
newest 60 takes, local browser storage and JSON export/import.

Adaptations: independent CMSD storage namespace; explicit unavailable-storage
feedback and in-memory fallback; schema validation; enforced maximum timer;
source-key tokens preserve overlapping same-pitch inputs; CMSD note labels,
colors and accessible collapsible tray. Replay bypasses capture and uses the
same piano samples. Replay can be heard alone or synchronized to the saved
performance video's starting point. Recording stores note events, not microphone
or video audio. No new backend or user tracking is introduced.

The capture adapter wraps the tested 291ad08 original duet's DOM note-on/off
methods. This preserves key mappings, repeat handling, natural audio ringout,
Makey focus controls and keyboard form exclusions. V2 index uses a parent base
URL so media remain shared; the deployment build pins parent JS/CSS dependencies
to their existing 291ad08 versioned names. Only v2 files are published.

Validation:
  node test/cmsd-takes.mjs
  python3 -m http.server 8000   (from repository root)
  open http://localhost:8000/test/cmsd-v2.html and click Run v2 checks.
The browser fixture isolates localStorage in memory, then checks actual Web Audio
waveforms and captured event streams as well as the UI. These are simulated
browser key/touch tests; physical Makey Makey and phone/tablet devices require
separate hardware testing.
