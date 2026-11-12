# Count Me In logo kit: "Unbroken"

One unbroken line, three loops: water, land and air. The orange loop is you, woven into the crew.

Colours: navy #0A1621, sand #E6E2D8, signal orange #FF6B2C, ink #1A0D05 (mark on orange).
Wordmark: Barlow Condensed Bold, converted to shapes so it looks the same everywhere, even where the font isn't installed.

## What's in the folders

| Folder | File | Size | Use it for |
|---|---|---|---|
| favicons | favicon.svg | scalable | Browser tab icon in modern browsers |
| favicons | favicon.ico | 16, 32, 48 px | Older browsers and Windows |
| favicons | favicon-16x16.png, favicon-32x32.png, favicon-48x48.png | as named | Backup PNG favicons |
| app-icons | apple-touch-icon.png | 180 x 180 | iPhone home screen when someone saves the web app |
| app-icons | icon-192.png, icon-512.png | 192, 512 | Android home screen and web app install |
| app-icons | icon-512-maskable.png | 512 | Android, which crops icons into circles and other shapes |
| app-icons | app-icon-1024.png | 1024 x 1024 | App Store and Google Play master icon |
| app-icons | app-icon-1024-on-orange.png | 1024 x 1024 | Alternative icon, marketing, social posts |
| ios-layers | 1-background.svg, 2-foreground-mark.svg | 1024 | Apple Icon Composer, for a future native iPhone app |
| android | adaptive-background.svg, adaptive-foreground.svg | 432 | Android adaptive icon, for a future native app |
| logos | logo-horizontal-*.svg | scalable | Sidebar, website header, emails |
| logos | logo-stacked-*.svg | scalable | Splash screen, social profile, posters |
| logos | symbol-*.svg | scalable | Avatar, stickers, embroidered patches |

Every SVG also has a PNG copy for apps that don't accept SVG.

The app icons are deliberately square with no rounded corners. iPhone and Android round the corners themselves.

## Putting the icons on your Vercel site (step by step)

1. Open your Count Me In project in VS Code.
2. Find the `public` folder. Your current `favicon.svg` and `apple-touch-icon.png` are in there.
3. Copy these files into `public`, replacing the old ones when asked:
   - `favicons/favicon.svg`
   - `favicons/favicon.ico`
   - `favicons/favicon-32x32.png`
   - `app-icons/apple-touch-icon.png`
   - `app-icons/icon-192.png`
   - `app-icons/icon-512.png`
   - `app-icons/icon-512-maskable.png`
4. Ask Claude Code: "Update the head of index.html with these favicon and app icon tags, and add a site.webmanifest file with the content below."

   Tags for the head:

   ```html
   <link rel="icon" href="/favicon.ico" sizes="48x48">
   <link rel="icon" href="/favicon.svg" type="image/svg+xml">
   <link rel="apple-touch-icon" href="/apple-touch-icon.png">
   <link rel="manifest" href="/site.webmanifest">
   <meta name="theme-color" content="#0A1621">
   ```

   Content for `public/site.webmanifest`:

   ```json
   {
     "name": "Count Me In",
     "short_name": "Count Me In",
     "icons": [
       { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
       { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
     ],
     "theme_color": "#0A1621",
     "background_color": "#0A1621",
     "display": "standalone"
   }
   ```

5. To replace the shield in the sidebar, ask Claude Code: "Replace the shield-check icon next to Count Me In in the sidebar with logos/symbol-on-navy.svg." (Copy that file into `public` first.)
6. Push to GitHub as usual. Vercel redeploys on its own.
7. Browsers hold on to old favicons. If the old shield still shows, open the site in a private window to check.
