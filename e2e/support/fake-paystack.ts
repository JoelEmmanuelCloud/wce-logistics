import { createHmac } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";

type Transaction = {
  id: number;
  reference: string;
  amount: number;
  email: string;
  callbackUrl: string;
  status: "pending" | "success" | "abandoned";
  paidAt: string | null;
};

type Result = { status: number; body: string; type: string; location?: string };

const port = Number(process.env.FAKE_PAYSTACK_PORT ?? 4020);
const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
const webhookUrl = process.env.APP_WEBHOOK_URL ?? "";
const transactions = new Map<string, Transaction>();
const refunds: Array<{ transaction: string; amount?: number }> = [];

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
  });
}

function json(status: number, payload: unknown): Result {
  return { status, body: JSON.stringify(payload), type: "application/json" };
}

async function sendWebhook(transaction: Transaction) {
  if (!webhookUrl) {
    return;
  }
  const body = JSON.stringify({
    event: "charge.success",
    data: { reference: transaction.reference, amount: transaction.amount, currency: "NGN", status: "success" },
  });
  const signature = createHmac("sha512", secret).update(body).digest("hex");
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": signature },
    body,
  }).catch(() => undefined);
}

function checkoutPage(transaction: Transaction): Result {
  const reference = encodeURIComponent(transaction.reference);
  return {
    status: 200,
    type: "text/html",
    body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Test checkout</title></head><body><h1>Test checkout</h1><p>Pay NGN ${(transaction.amount / 100).toFixed(2)} as ${transaction.email}</p><form method="post" action="/checkout/${reference}/pay"><button type="submit">Pay now</button></form><form method="post" action="/checkout/${reference}/cancel"><button type="submit">Cancel payment</button></form></body></html>`,
  };
}

function verification(transaction: Transaction): Result {
  const paid = transaction.status === "success";
  return json(200, {
    status: true,
    message: "Verification successful",
    data: {
      id: transaction.id,
      status: transaction.status,
      reference: transaction.reference,
      amount: transaction.amount,
      currency: "NGN",
      channel: paid ? "card" : null,
      paid_at: transaction.paidAt,
      gateway_response: paid ? "Approved" : "The transaction was not completed",
    },
  });
}

async function handle(request: IncomingMessage): Promise<Result> {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const authorized = request.headers.authorization === `Bearer ${secret}`;

  if (request.method === "GET" && url.pathname === "/health") {
    return { status: 200, body: "ok", type: "text/plain" };
  }

  if (request.method === "GET" && url.pathname === "/refunds") {
    return json(200, refunds);
  }

  if (parts[0] === "checkout") {
    const transaction = transactions.get(parts[1] ?? "");
    if (!transaction) {
      return json(404, { status: false, message: "Transaction not found" });
    }
    if (request.method === "GET") {
      return checkoutPage(transaction);
    }
    if (parts[2] === "pay") {
      transaction.status = "success";
      transaction.paidAt = new Date().toISOString();
      if (url.searchParams.get("webhook") !== "skip") {
        await sendWebhook(transaction);
      }
    } else {
      transaction.status = "abandoned";
    }
    const callback = new URL(transaction.callbackUrl);
    callback.searchParams.set("trxref", transaction.reference);
    callback.searchParams.set("reference", transaction.reference);
    return { status: 302, body: "", type: "text/plain", location: callback.toString() };
  }

  if (!authorized) {
    return json(401, { status: false, message: "Invalid key" });
  }

  if (request.method === "POST" && url.pathname === "/transaction/initialize") {
    const payload = JSON.parse(await readBody(request)) as { email: string; amount: number; reference: string; callback_url: string };
    if (transactions.has(payload.reference)) {
      return json(400, { status: false, message: "Duplicate Transaction Reference" });
    }
    transactions.set(payload.reference, {
      id: transactions.size + 1000,
      reference: payload.reference,
      amount: Number(payload.amount),
      email: payload.email,
      callbackUrl: payload.callback_url,
      status: "pending",
      paidAt: null,
    });
    return json(200, {
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: `http://127.0.0.1:${port}/checkout/${encodeURIComponent(payload.reference)}`,
        access_code: payload.reference.toLowerCase(),
        reference: payload.reference,
      },
    });
  }

  if (request.method === "GET" && parts[0] === "transaction" && parts[1] === "verify") {
    const transaction = transactions.get(parts[2] ?? "");
    return transaction ? verification(transaction) : json(400, { status: false, message: "Transaction reference not found" });
  }

  if (request.method === "POST" && url.pathname === "/refund") {
    const payload = JSON.parse(await readBody(request)) as { transaction: string; amount?: number };
    refunds.push(payload);
    return json(200, { status: true, message: "Refund has been queued for processing", data: { id: refunds.length, status: "pending" } });
  }

  return json(404, { status: false, message: "Not found" });
}

const server = createServer(async (request, response) => {
  const result = await handle(request).catch(() => json(500, { status: false, message: "Server error" }));
  response.writeHead(result.status, { "Content-Type": result.type, ...(result.location ? { Location: result.location } : {}) });
  response.end(result.body);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`fake paystack listening on ${port}`);
});
