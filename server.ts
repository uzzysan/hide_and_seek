import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import db from "./server/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Games API
  app.get("/api/games", (req, res) => {
    try {
      const games = db.prepare("SELECT * FROM games ORDER BY created_at DESC").all();
      res.json(games);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.post("/api/games", upload.single("attachment"), (req, res) => {
    const { title, description, creator_id, edit_password } = req.body;
    try {
      const result = db.prepare(
        "INSERT INTO games (title, description, creator_id, edit_password) VALUES (?, ?, ?, ?)"
      ).run(title, description, creator_id || 1, edit_password);
      
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  app.get("/api/games/:id", (req, res) => {
    try {
      const game = db.prepare("SELECT * FROM games WHERE id = ?").get(req.params.id);
      if (!game) return res.status(404).json({ error: "Game not found" });
      
      const points = db.prepare("SELECT * FROM points WHERE game_id = ? ORDER BY order_index ASC").all(req.params.id);
      res.json({ ...game, points });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch game details" });
    }
  });

  app.post("/api/games/:id/points", upload.single("attachment"), (req, res) => {
    const { name, description, latitude, longitude, order_index } = req.body;
    const attachment_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    try {
      const result = db.prepare(
        "INSERT INTO points (game_id, name, description, latitude, longitude, order_index, attachment_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(req.params.id, name, description, latitude, longitude, order_index, attachment_url);
      
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to add point" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
