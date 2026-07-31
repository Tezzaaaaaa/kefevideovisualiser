# Story Lyrics Cloud 1.1 — iPhone deployment

This edition runs the website and FFmpeg renderer on a cloud server. A Mac is not required after deployment.

## Recommended host: Render

1. Create a private GitHub repository.
2. Upload every file from this folder to the repository root.
3. Create a Render account and choose **New > Blueprint**.
4. Connect the repository. Render detects `render.yaml`.
5. When prompted for `LYRIC_VIS_PASSWORD`, enter a long private password and save it.
6. Approve the **Starter** service and 5 GB persistent disk.
7. Wait for deployment to complete, then open the generated `https://...onrender.com` address on iPhone Safari.
8. Sign in with username `story` and the password you entered.
9. In Safari, tap **Share > Add to Home Screen**.

## Why this is configured as paid hosting

Video conversion uses FFmpeg and uploaded media needs persistent storage. Render's free web services use an ephemeral filesystem, cannot attach persistent disks, and spin down after inactivity. The included Blueprint therefore requests a paid Starter service with a 5 GB disk.

## Privacy

- Keep the GitHub repository private.
- Use a unique password of at least 20 characters.
- Upload only audio, lyrics, images and videos you own or are authorised to use.
- Delete old projects and exports to control storage use.
- The application uses HTTP Basic Authentication. For multiple customers, account isolation and a proper user database must be added before public commercial launch.

## Current cloud limits

- One private user/login.
- One server instance.
- Up to 512 MB per export upload by default.
- Projects are saved in browser storage; the persistent server disk stores backend project metadata and working data.
- Hosting charges are paid directly to the hosting provider.
