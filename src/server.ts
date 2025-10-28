import { ChildProcess, fork } from "child_process";
import express from "express";
import { createServer } from "http";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { WebSocket, WebSocketServer } from "ws";

// Define __dirname and __filename in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

let subscriber: ChildProcess | undefined;
let publisher: ChildProcess | undefined;

function sendMessage(message: any): void {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Helper function to attach stdout/stderr handlers to a child process
function attachProcessHandlers(childProcess: ChildProcess, source: string): void {
  childProcess.stdout?.on("data", (data) => {
    sendMessage({
      source,
      message: data.toString(),
    });
  });

  childProcess.stderr?.on("data", (data) => {
    sendMessage({
      source,
      message: data.toString(),
    });
  });
}

// Helper function to send connection status
function sendConnectionStatus(): void {
  sendMessage({
    source: "connection",
    message: {
      publisher: !!publisher,
      subscriber: !!subscriber,
    },
  });
}

// Helper function to terminate a child process
function terminateProcess(childProcess: ChildProcess | undefined): void {
  if (childProcess) {
    childProcess.kill();
  }
}

// Serve the static HTML file
app.use(express.static(join(__dirname, "public")));

// Middleware to parse JSON bodies
app.use(express.json());

app.get("/", (_req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.post("/publisher", (_req, res) => {
  console.log("Received publisher request");

  if (!publisher) {
    publisher = fork(join(__dirname, "publisher.js"), {
      env: {
        ...process.env,
        //NOBLE_HCI_DEVICE_ID: "0",
        DEBUG: "bleno,noble,ant,ftms",
      },
      stdio: "pipe",
    });

    attachProcessHandlers(publisher, "publisher");
    sendConnectionStatus();
  }

  res.sendStatus(200);
});

app.post("/subscriber", (_req, res) => {
  console.log("Received subscriber request");

  if (!subscriber) {
    subscriber = fork(join(__dirname, "subscriber.js"), {
      env: {
        ...process.env,
        DEBUG: "bleno,noble,ble",
      },
      stdio: "pipe",
    });

    attachProcessHandlers(subscriber, "subscriber");
    sendConnectionStatus();
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

  if (terminateSubscriber) {
    terminateProcess(subscriber);
    subscriber = undefined;
  }

  if (terminatePublisher) {
    terminateProcess(publisher);
    publisher = undefined;
  }

  sendConnectionStatus();

  res.sendStatus(200);
});

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.send(
    JSON.stringify({
      source: "connection",
      message: {
        publisher: !!publisher,
        subscriber: !!subscriber,
      },
    })
  );

  ws.on("message", (message: string) => {
    console.log(`Received message: ${message}`);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on ${JSON.stringify(server.address())}`);
});

process.on("SIGINT", () => {
  console.log("Received SIGINT. Terminating processes...");

  terminateProcess(subscriber);
  terminateProcess(publisher);

  process.exit();
});
