# Remote iPhone access

## Fast HTTPS test link

1. Install requirements on the Mac:
   `brew install ffmpeg cloudflared`
2. Double-click **Start Remote iPhone Access.command**.
3. Copy the generated `https://...trycloudflare.com` address into iPhone Safari.
4. Sign in using the username and password printed by the launcher.
5. Use Safari Share > Add to Home Screen.

The random Quick Tunnel address changes whenever it restarts and is intended for testing. The Mac and launcher window must remain running.

## Permanent public address

For a stable custom hostname, create a remotely managed Cloudflare Tunnel, attach a domain in Cloudflare, and route that hostname to `http://localhost:8090`. Keep Story Lyrics authentication enabled, or additionally protect the hostname with Cloudflare Access.

## Production container

Copy `.env.example` to `.env`, set a long password, then run:

    docker compose up -d --build

Place the container behind an HTTPS reverse proxy or a managed Cloudflare Tunnel. Persist `/app/data` and configure platform request limits to permit the chosen maximum video upload size.
