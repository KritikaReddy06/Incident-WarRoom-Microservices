const express = require("express");
const cors = require("cors");
const path = require("path");

const {
  createProxyMiddleware
} = require("http-proxy-middleware");

const app = express();

const frontendRoot = path.join(
  __dirname,
  "../../frontend"
);

const isLocalDevOrigin = (origin) => {
  if (!origin) {
    return true;
  }
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
    origin
  );
};

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : [];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        isLocalDevOrigin(origin) ||
        corsOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.get("/health", (req, res) => {
  res.json({
    message: "Incident War Room Gateway Running"
  });
});

app.use(
  createProxyMiddleware({
    target: "http://localhost:9001",
    changeOrigin: true,
    pathFilter: "/auth",
    pathRewrite: {
      "^/auth": ""
    }
  })
);

app.use(
  createProxyMiddleware({
    target: "http://localhost:9002",
    changeOrigin: true,
    pathFilter: "/incidents"
  })
);

app.use(
  express.static(frontendRoot, { index: false })
);

app.get("/", (req, res) => {
  res.sendFile(
    path.join(frontendRoot, "index.html")
  );
});

app.get(/^\/(?!auth|incidents|health).*/, (req, res) => {
  if (req.path.includes(".")) {
    return res.status(404).end();
  }
  res.sendFile(
    path.join(frontendRoot, "index.html")
  );
});

const PORT = process.env.PORT || 9000;

const server = app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
  console.log(`Open frontend: http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other app or run: set PORT=9004 && node server.js`
    );
    process.exit(1);
  }
  throw err;
});
