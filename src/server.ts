import { ChildProcess, fork } from "child_process";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocket, WebSocketServer } from "ws";

// Define __dirname and __filename in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

let subscriber: ChildProcess | undefined;
let publisher: ChildProcess | undefined;

// Serve the static HTML file
app.use(express.static(path.join(__dirname, "public")));

// Middleware to parse JSON bodies
app.use(express.json());

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/publisher", (_req, res) => {
  console.log("Received publisher request");

  if (!publisher) {
    publisher = fork(path.join(__dirname, "publisher.js"), {
      env: {
        ...process.env,
        NOBLE_HCI_DEVICE_ID: "0",
        DEBUG: "bleno,noble,ant,ftms",
      },
      stdio: "pipe",
    });

    publisher.stdout?.on("data", (data) => {
      const message = data.toString();
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              source: "publisher",
              message,
            })
          );
        }
      });
    });

    publisher.stderr?.on("data", (data) => {
      const message = data.toString();
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              source: "publisher",
              message,
            })
          );
        }
      });
    });
  }

  res.sendStatus(200);
});

app.post("/subscriber", (_req, res) => {
  console.log("Received subscriber request");

  if (!subscriber) {
    subscriber = fork(path.join(__dirname, "subscriber.js"), {
      env: {
        ...process.env,
        DEBUG: "bleno,noble,ble",
      },
      stdio: "pipe",
    });

    subscriber.stdout?.on("data", (data) => {
      const message = data.toString();
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              source: "subscriber",
              message,
            })
          );
        }
      });
    });

    subscriber.stderr?.on("data", (data) => {
      const message = data.toString();
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              source: "subscriber",
              message,
            })
          );
        }
      });
    });
  }

  res.sendStatus(200);
});

// Endpoint to handle POST request for disconnect
app.post("/disconnect", (_req, res) => {
  console.log("Received disconnect request");

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });

  res.sendStatus(200);
});

app.post("/terminate", (req, res) => {
  console.log("Received terminate request");

  const terminateSubscriber = req.query["subscriber"] === "1";
  const terminatePublisher = req.query["publisher"] === "1";

  console.log(`terminateSubscriber: ${terminateSubscriber}`);
  console.log(`terminatePublisher: ${terminatePublisher}`);

  if (terminateSubscriber && subscriber) {
    subscriber.kill();
    subscriber = undefined;
  }

  if (terminatePublisher && publisher) {
    publisher.kill();
    publisher = undefined;
  }

  res.sendStatus(200);
});

// WebSocket connection
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message: string) => {
    console.log(`Received message: ${message}`);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
