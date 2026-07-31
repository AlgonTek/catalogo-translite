import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const distPath = path.join(__dirname, "dist");
const distServerPath = path.join(distPath, "server.js");

// Se o bundle do backend compilado existiu no build (dist/server.js), inicia por ele contendo as APIs
if (fs.existsSync(distServerPath)) {
  import("./dist/server.js");
} else {
  // Servidor Express.js simples para servir a pasta 'dist' e fallback do SPA no Render
  const app = express();

  app.use(express.static(distPath));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "static-server" });
  });

  // SPA fallback
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Simple Express server running on http://0.0.0.0:${PORT} serving 'dist' folder`);
  });
}
