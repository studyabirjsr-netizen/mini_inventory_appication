import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Database setup
  const db = new Database("inventory.db");
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      expiryDate TEXT,
      discount REAL DEFAULT 0,
      available INTEGER DEFAULT 1
    )
  `);

  app.use(express.json());

  // Helper to calculate discounted price and availability
  const processProduct = (p: any) => {
    const discountedPrice = p.price * (1 - p.discount / 100);
    // In a real app, 'available' would be set by logic or stored. 
    // The user said "available: true, // boolean, set by backend automatically based on expiryDate"
    const now = new Date();
    const expiry = p.expiryDate ? new Date(p.expiryDate) : null;
    const available = expiry ? expiry > now : true;
    
    return {
      ...p,
      available: !!available,
      discountedPrice: parseFloat(discountedPrice.toFixed(2))
    };
  };

  // API Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products.map(processProduct));
  });

  app.post("/api/products", (req, res) => {
    const { id, name, category, price, quantity, expiryDate, discount } = req.body;
    try {
      db.prepare(
        "INSERT INTO products (id, name, category, price, quantity, expiryDate, discount) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(id, name, category, price, quantity, expiryDate || null, discount || 0);
      res.status(201).json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/products/bulk", (req, res) => {
    const products = req.body;
    const insert = db.prepare(
      "INSERT OR REPLACE INTO products (id, name, category, price, quantity, expiryDate, discount) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.id, item.name, item.category, item.price, item.quantity, item.expiryDate || null, item.discount || 0);
      }
    });
    try {
      insertMany(products);
      res.json({ success: true, count: products.length });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { name, category, price, quantity, expiryDate, discount } = req.body;
    try {
      db.prepare(
        "UPDATE products SET name = ?, category = ?, price = ?, quantity = ?, expiryDate = ?, discount = ? WHERE id = ?"
      ).run(name, category, price, quantity, expiryDate || null, discount || 0, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/products/expiring", (req, res) => {
    const products = db.prepare("SELECT * FROM products WHERE expiryDate IS NOT NULL").all();
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
    
    const expiring = products
      .map(processProduct)
      .filter(p => {
        const expiry = new Date(p.expiryDate);
        return expiry >= now && expiry <= sevenDaysLater;
      });
    res.json(expiring);
  });

 app.get("/api/products/report/value",  (req, res) => {
  const products = db.prepare("SELECT * FROM products").all();
  const report: Record<string, number> = {};
  products.forEach((p: any) => {
    const processed = processProduct(p);
    const value = processed.discountedPrice * p.quantity;
    report[p.category] = (report[p.category] || 0) + value;
  });
  // Round values
  Object.keys(report).forEach(cat => {
    report[cat] = Number(report[cat].toFixed(2));
  });
  res.json(report);
});
  app.get("/api/products/report/category/:category", (req, res) => {
    const { category } = req.params;
    const products = db.prepare("SELECT * FROM products WHERE category = ?").all(category);
    res.json(products.map(processProduct));
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
