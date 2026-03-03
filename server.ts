import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./server/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";

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

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

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

  // Auth API
  app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    try {
      const existingUser = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const result = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, passwordHash);
      
      const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: result.lastInsertRowid, username } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    try {
      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/me", authenticateToken, (req: any, res: any) => {
    res.json({ user: req.user });
  });

  app.get("/api/me/stats", authenticateToken, (req: any, res: any) => {
    try {
      const completedGames = db.prepare("SELECT COUNT(*) as count FROM game_sessions WHERE user_id = ? AND completed_at IS NOT NULL").get(req.user.id) as any;
      const reviews = db.prepare("SELECT COUNT(*) as count FROM reviews WHERE user_id = ?").get(req.user.id) as any;
      const createdGames = db.prepare("SELECT COUNT(*) as count FROM games WHERE creator_id = ?").get(req.user.id) as any;
      
      res.json({
        completed_games: completedGames.count,
        reviews: reviews.count,
        created_games: createdGames.count
      });
    } catch (error) {
      console.error("Failed to fetch user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  app.get("/api/me/games", authenticateToken, (req: any, res: any) => {
    try {
      const games = db.prepare("SELECT * FROM games WHERE creator_id = ? ORDER BY created_at DESC").all(req.user.id);
      res.json(games);
    } catch (error) {
      console.error("Failed to fetch user games:", error);
      res.status(500).json({ error: "Failed to fetch user games" });
    }
  });

  app.get("/api/me/sessions", authenticateToken, (req: any, res: any) => {
    try {
      const sessions = db.prepare(`
        SELECT s.*, g.title, g.attachment_url,
               (SELECT COUNT(*) FROM points WHERE game_id = g.id) as total_points,
               (SELECT COUNT(*) FROM session_progress WHERE session_id = s.id) as points_found
        FROM game_sessions s
        JOIN games g ON s.game_id = g.id
        WHERE s.user_id = ?
        ORDER BY s.started_at DESC
      `).all(req.user.id);
      res.json(sessions);
    } catch (error) {
      console.error("Failed to fetch user sessions:", error);
      res.status(500).json({ error: "Failed to fetch user sessions" });
    }
  });

  // Games API
  app.get("/api/games", (req, res) => {
    try {
      const games = db.prepare(`
        SELECT g.*, 
               COALESCE(AVG(r.rating), 0) as average_rating,
               COUNT(DISTINCT r.id) as reviews_count
        FROM games g
        LEFT JOIN reviews r ON g.id = r.game_id
        GROUP BY g.id
        ORDER BY g.created_at DESC
      `).all();
      res.json(games);
    } catch (error) {
      console.error("Failed to fetch games:", error);
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.post("/api/games", authenticateToken, upload.single("attachment"), (req: any, res: any) => {
    const { title, description, edit_password, latitude, longitude, time_limit_minutes } = req.body;
    const creator_id = req.user.id;
    const attachment_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    try {
      const result = db.prepare(
        "INSERT INTO games (title, description, creator_id, edit_password, latitude, longitude, attachment_url, time_limit_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(title, description, creator_id, edit_password, latitude, longitude, attachment_url, time_limit_minutes || null);
      
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      console.error("Game creation error:", error);
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  app.get("/api/games/:id", (req, res) => {
    try {
      const game = db.prepare(`
        SELECT g.*, 
               COALESCE(AVG(r.rating), 0) as average_rating,
               COUNT(DISTINCT r.id) as reviews_count
        FROM games g
        LEFT JOIN reviews r ON g.id = r.game_id
        WHERE g.id = ?
        GROUP BY g.id
      `).get(req.params.id) as any;
      
      if (!game) return res.status(404).json({ error: "Game not found" });
      
      const points = db.prepare("SELECT * FROM points WHERE game_id = ? ORDER BY order_index ASC").all(req.params.id);
      
      const reviews = db.prepare(`
        SELECT r.*, u.username
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.game_id = ?
        ORDER BY r.created_at DESC
      `).all(req.params.id);

      res.json({ ...game, points, reviews });
    } catch (error) {
      console.error("Failed to fetch game details:", error);
      res.status(500).json({ error: "Failed to fetch game details" });
    }
  });

  app.get("/api/games/:id/leaderboard", (req, res) => {
    try {
      const leaderboard = db.prepare(`
        SELECT 
          u.username,
          gs.started_at,
          gs.completed_at,
          CAST((julianday(gs.completed_at) - julianday(gs.started_at)) * 24 * 60 * 60 AS INTEGER) as duration_seconds
        FROM game_sessions gs
        JOIN users u ON gs.user_id = u.id
        WHERE gs.game_id = ? AND gs.completed_at IS NOT NULL
        ORDER BY duration_seconds ASC
        LIMIT 10
      `).all(req.params.id);
      
      res.json(leaderboard);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.post("/api/games/:id/reviews", authenticateToken, (req: any, res: any) => {
    const gameId = req.params.id;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Invalid rating" });
    }

    try {
      db.prepare(
        "INSERT INTO reviews (game_id, user_id, rating, comment) VALUES (?, ?, ?, ?) ON CONFLICT(game_id, user_id) DO UPDATE SET rating=excluded.rating, comment=excluded.comment, created_at=CURRENT_TIMESTAMP"
      ).run(gameId, userId, rating, comment);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to add review:", error);
      res.status(500).json({ error: "Failed to add review" });
    }
  });

  app.post("/api/games/:id/points", authenticateToken, upload.single("attachment"), (req: any, res: any) => {
    const { name, description, latitude, longitude, order_index } = req.body;
    const attachment_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    try {
      // Verify game belongs to user
      const game = db.prepare("SELECT creator_id FROM games WHERE id = ?").get(req.params.id) as any;
      if (!game || game.creator_id !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const result = db.prepare(
        "INSERT INTO points (game_id, name, description, latitude, longitude, order_index, attachment_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(req.params.id, name, description, latitude, longitude, order_index, attachment_url);
      
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to add point" });
    }
  });

  app.put("/api/points/:id", authenticateToken, upload.single("attachment"), (req: any, res: any) => {
    const pointId = req.params.id;
    const { name, description, latitude, longitude, order_index } = req.body;
    
    try {
      // Verify point belongs to user's game
      const point = db.prepare(`
        SELECT p.*, g.creator_id 
        FROM points p 
        JOIN games g ON p.game_id = g.id 
        WHERE p.id = ?
      `).get(pointId) as any;
      
      if (!point) return res.status(404).json({ error: "Point not found" });
      if (point.creator_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

      let attachment_url = point.attachment_url;
      if (req.file) {
        attachment_url = `/uploads/${req.file.filename}`;
      }

      db.prepare(
        "UPDATE points SET name = ?, description = ?, latitude = ?, longitude = ?, order_index = ?, attachment_url = ? WHERE id = ?"
      ).run(name, description, latitude, longitude, order_index, attachment_url, pointId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update point:", error);
      res.status(500).json({ error: "Failed to update point" });
    }
  });

  app.delete("/api/points/:id", authenticateToken, (req: any, res: any) => {
    const pointId = req.params.id;
    
    try {
      // Verify point belongs to user's game
      const point = db.prepare(`
        SELECT p.*, g.creator_id 
        FROM points p 
        JOIN games g ON p.game_id = g.id 
        WHERE p.id = ?
      `).get(pointId) as any;
      
      if (!point) return res.status(404).json({ error: "Point not found" });
      if (point.creator_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

      // Delete session progress for this point
      db.prepare("DELETE FROM session_progress WHERE point_id = ?").run(pointId);
      // Delete the point
      db.prepare("DELETE FROM points WHERE id = ?").run(pointId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete point:", error);
      res.status(500).json({ error: "Failed to delete point" });
    }
  });

  app.delete("/api/games/:id", authenticateToken, (req: any, res: any) => {
    const gameId = req.params.id;
    const userId = req.user.id;
    
    try {
      const game = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId) as any;
      if (!game) return res.status(404).json({ error: "Game not found" });
      
      if (game.creator_id !== userId) {
        return res.status(403).json({ error: "You can only delete your own games" });
      }
      
      db.prepare("DELETE FROM session_progress WHERE session_id IN (SELECT id FROM game_sessions WHERE game_id = ?)").run(gameId);
      db.prepare("DELETE FROM game_sessions WHERE game_id = ?").run(gameId);
      db.prepare("DELETE FROM points WHERE game_id = ?").run(gameId);
      db.prepare("DELETE FROM games WHERE id = ?").run(gameId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete game:", error);
      res.status(500).json({ error: "Failed to delete game" });
    }
  });

  app.put("/api/games/:id", authenticateToken, upload.single("attachment"), (req: any, res: any) => {
    const gameId = req.params.id;
    const userId = req.user.id;
    const { title, description, edit_password, latitude, longitude, time_limit_minutes } = req.body;
    
    try {
      const game = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId) as any;
      if (!game) return res.status(404).json({ error: "Game not found" });
      
      if (game.creator_id !== userId) {
        return res.status(403).json({ error: "You can only edit your own games" });
      }
      
      let attachment_url = game.attachment_url;
      if (req.file) {
        attachment_url = `/uploads/${req.file.filename}`;
      }
      
      db.prepare(
        "UPDATE games SET title = ?, description = ?, edit_password = ?, latitude = ?, longitude = ?, attachment_url = ?, time_limit_minutes = ? WHERE id = ?"
      ).run(title, description, edit_password, latitude, longitude, attachment_url, time_limit_minutes || null, gameId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update game:", error);
      res.status(500).json({ error: "Failed to update game" });
    }
  });

  // Game Sessions API
  app.post("/api/games/:id/sessions", authenticateToken, (req: any, res: any) => {
    const gameId = req.params.id;
    const userId = req.user.id;
    
    try {
      const existingSession = db.prepare("SELECT * FROM game_sessions WHERE game_id = ? AND user_id = ? AND completed_at IS NULL").get(gameId, userId) as any;
      
      if (existingSession) {
        return res.json({ sessionId: existingSession.id });
      }
      
      const result = db.prepare("INSERT INTO game_sessions (game_id, user_id) VALUES (?, ?)").run(gameId, userId);
      res.json({ sessionId: result.lastInsertRowid });
    } catch (error) {
      console.error("Failed to start session:", error);
      res.status(500).json({ error: "Failed to start session" });
    }
  });

  app.get("/api/games/:id/sessions/current", authenticateToken, (req: any, res: any) => {
    const gameId = req.params.id;
    const userId = req.user.id;
    
    try {
      const session = db.prepare("SELECT * FROM game_sessions WHERE game_id = ? AND user_id = ? AND completed_at IS NULL").get(gameId, userId) as any;
      
      if (!session) {
        return res.json({ session: null });
      }
      
      const progress = db.prepare("SELECT point_id FROM session_progress WHERE session_id = ?").all(session.id);
      res.json({ session, progress: progress.map((p: any) => p.point_id) });
    } catch (error) {
      console.error("Failed to fetch session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.post("/api/sessions/:id/progress", authenticateToken, (req: any, res: any) => {
    const sessionId = req.params.id;
    const { point_id } = req.body;
    
    try {
      const session = db.prepare("SELECT * FROM game_sessions WHERE id = ? AND user_id = ?").get(sessionId, req.user.id) as any;
      if (!session) {
        return res.status(403).json({ error: "Unauthorized or session not found" });
      }
      
      const existing = db.prepare("SELECT * FROM session_progress WHERE session_id = ? AND point_id = ?").get(sessionId, point_id);
      if (!existing) {
        db.prepare("INSERT INTO session_progress (session_id, point_id) VALUES (?, ?)").run(sessionId, point_id);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to record progress:", error);
      res.status(500).json({ error: "Failed to record progress" });
    }
  });

  app.put("/api/sessions/:id/complete", authenticateToken, (req: any, res: any) => {
    const sessionId = req.params.id;
    
    try {
      const session = db.prepare("SELECT * FROM game_sessions WHERE id = ? AND user_id = ?").get(sessionId, req.user.id) as any;
      if (!session) {
        return res.status(403).json({ error: "Unauthorized or session not found" });
      }
      
      db.prepare("UPDATE game_sessions SET completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to complete session:", error);
      res.status(500).json({ error: "Failed to complete session" });
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
