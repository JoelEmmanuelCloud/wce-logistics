import { createServer } from "node:http";

type Email = { from: string; to: string[]; subject: string; text: string; html: string; receivedAt: number };

const emails: Email[] = [];
const port = Number(process.env.FAKE_RESEND_PORT ?? 4010);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (request.method === "POST" && url.pathname === "/emails") {
    if (!request.headers.authorization?.startsWith("Bearer re_")) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "invalid api key" }));
      return;
    }
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      const payload = JSON.parse(body) as Partial<Email>;
      if (!payload.from || !payload.to?.length || !payload.subject || !payload.text || !payload.html) {
        response.writeHead(422, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "missing fields" }));
        return;
      }
      emails.push({ ...(payload as Email), receivedAt: Date.now() });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ id: `email-${emails.length}` }));
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/messages") {
    const to = url.searchParams.get("to");
    const filtered = to ? emails.filter((email) => email.to.includes(to)) : emails;
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
  console.log(`fake resend listening on ${port}`);
});
