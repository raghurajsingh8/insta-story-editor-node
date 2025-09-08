# Story Editor (Node + HTML/CSS/JS, No DB)

A lightweight Instagram-style story editor you can host anywhere. Users can:
- Upload a photo
- Add stickers (from `/public/assets/stickers`)
- Add text (drag, resize with wheel, rotate with R + wheel)
- Apply filters (brightness, contrast, saturation, sepia, grayscale, blur, hue)
- Add optional frame/overlay PNGs (from `/public/assets/filters`)
- Play songs (from `/public/assets/songs`) while editing (audio is not embedded in the exported image)
- Download the final image as `PNG`

> No database required. All assets are static files. The editor runs fully on the client; Node.js only serves files and lists assets.

## Quick start

```bash
npm install
npm run start
# Open http://localhost:3000
```

## Add your assets

- **Stickers:** put `.png`/`.jpg`/`.webp` files into `public/assets/stickers/`
- **Frames/Overlays:** put `.png` (transparent) into `public/assets/filters/`
- **Songs:** put `.mp3` (or `.wav`/`.ogg`) into `public/assets/songs/`

The app auto-lists whatever you put in these folders.

## Deploy

- **Render/Railway/Heroku/Any Node host**: deploy the whole folder and run `node server.js`.
- **Vercel**: use a Node server deployment or convert routes to serverless if you prefer.
- **Static front-end**: You can also serve `/public` via Netlify and expose `/api/*` via a small Express instance on Render.

## Notes

- Export is an image (no audio). If you need video export with audio, you'll need ffmpeg on a server or a WebAssembly approach.
- Canvas uses modern `ctx.filter`; works on current Chrome/Edge/Firefox/Safari.
