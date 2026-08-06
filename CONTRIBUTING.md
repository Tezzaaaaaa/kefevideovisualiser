# CONTRIBUTING TO LINA

LINA is a focused creative tool. Contributions should make the product cleaner, smoother, more reliable, or easier to understand.

## Priorities

1. Playback and lyric sync accuracy
2. Smooth adaptive karaoke motion
3. Reliable LRC / enhanced LRC / SRT / VTT / TXT handling
4. iPhone Safari compatibility
5. Export reliability
6. Helvetica-first visual consistency
7. Local-first privacy

## Design rules

- Keep the interface black / white / grey.
- Use Helvetica / Helvetica Neue / Arial fallbacks.
- Avoid duplicate navigation or setup flows.
- Avoid decorative gradients, neon effects, oversized cards, or generic dashboard styling unless they are part of the media being created.
- Motion should feel continuous, restrained, and tied to playback.
- Do not add manual controls that can be inferred reliably from timing or audio behaviour without first justifying the UX cost.

## Reliability rules

Changes affecting parsing, timing, fonts, export, storage, or media loading should include a failure path. Do not silently fail.

For lyric import changes, test at minimum:

- standard LRC
- enhanced LRC
- SRT
- VTT
- TXT
- repeated selection of the same file
- malformed timestamps
- empty files

For motion changes, test:

- play
- pause
- seek forward
- seek backward
- resume
- long words
- short words
- dense lyric timing
- missing word-level timing

## Pull requests

Keep PRs focused. Describe:

- what changed
- why it changed
- what failure cases were considered
- what was tested

If a change alters the visual language, include screenshots where practical.
