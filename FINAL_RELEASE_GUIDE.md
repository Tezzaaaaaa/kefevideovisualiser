# Story Lyrics 1.0 — Final Release Guide

## What this is
A mobile-first lyric Story generator that runs as a website on your Mac and is controlled from iPhone Safari. It imports owned/authorised audio, TXT/LRC/enhanced-LRC/SRT lyrics, and photo/video backgrounds; previews six lyric effects; saves projects; and exports vertical H.264/AAC MP4 files.

## First launch
1. Install Go and FFmpeg on the Mac. With Homebrew: `brew install go ffmpeg`.
2. Double-click **Check Story Lyrics.command**.
3. Double-click **Start Story Lyrics.command**.
4. Open the displayed iPhone address in Safari while both devices use the same Wi-Fi.
5. Enter the username and password printed by the launcher.
6. In Safari, use Share → Add to Home Screen.

## Remote access
Install Cloudflare Tunnel with `brew install cloudflared`, then double-click **Start Remote iPhone Access.command**. Keep the Mac and Terminal window running. The temporary HTTPS address changes between sessions.

## Normal workflow
Create a project → import audio → import lyrics → choose an effect → adjust timing and placement → add a background → Export → Render MP4 → Save to Files or share it.

## Recovery
- Saved project settings and media are stored in iPhone Safari/IndexedDB.
- An interrupted MP4 conversion can be retried in the same browser session without re-recording.
- Use **Reset Story Lyrics.command** only to reset the Mac password and server project index.
- Keep original media backed up because iOS can remove website storage when space is critically low.

## Requirements and limits
- The Mac must remain running while the iPhone website is used.
- FFmpeg is required for MP4 conversion.
- Safari must remain foregrounded during browser rendering; Low-memory mode is recommended if 1080p export reloads.
- Use only audio, lyrics, images, and video you own or have permission to use.
