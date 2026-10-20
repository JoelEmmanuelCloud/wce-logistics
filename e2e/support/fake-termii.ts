import { createServer } from "node:http";

type Message = { to: string; sms: string; from: string; receivedAt: number };

const messages: Message[] = [];
const port = Number(process.env.FAKE_TERMII_PORT ?? 4010);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (request.method === "POST" && url.pathname === "/api/sms/send") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      const payload = JSON.parse(body) as { api_key?: string; to?: string; sms?: string; from?: string };
      if (!payload.api_key || !payload.to || !payload.sms || !payload.from) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "missing fields" }));
        return;
      }
      messages.push({ to: payload.to, sms: payload.sms, from: payload.from, receivedAt: Date.now() });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message_id: `test-${messages.length}`, message: "Successfully Sent", balance: 100, user: "test" }));
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/messages") {
    const to = url.searchParams.get("to");
    const filtered = to ? messages.filter((message) => message.to === to) : messages;
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(filtered));
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200);
    response.end("ok");
    return;
  }

  response.writeHead(404);
  response.end();
});

server.listen(port, "127.0.0.1", () => {
  console.log(`fake termii listening on ${port}`);
});
