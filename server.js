import express from "express";
import path from "path";
import fs from "fs";

const app = express();
const __dirname = path.resolve();

const PUBLIC_DIR = path.join(__dirname, "public");
const STICKERS_DIR = path.join(PUBLIC_DIR, "assets", "stickers");
const FILTERS_DIR = path.join(PUBLIC_DIR, "assets", "filters");
const SONGS_DIR = path.join(PUBLIC_DIR, "assets", "songs");

app.use(express.static(PUBLIC_DIR));

// Helper to list files by allowed extensions
function listFiles(dir, allowedExts) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(n => allowedExts.includes(path.extname(n).toLowerCase()))
    .map(n => ({
      name: n,
      url: "/assets/" + path.basename(dir) + "/" + n
    }));
}

app.get("/api/stickers", (req, res) => {
  res.json(listFiles(STICKERS_DIR, [".png", ".jpg", ".jpeg", ".webp", ".svg"]));
});

app.get("/api/filters", (req, res) => {
  res.json(listFiles(FILTERS_DIR, [".png", ".webp", ".jpg", ".jpeg", ".svg"]));
});

app.get("/api/songs", (req, res) => {
  res.json(listFiles(SONGS_DIR, [".mp3", ".wav", ".ogg"]));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Story Editor running at http://localhost:${port}`);
});
