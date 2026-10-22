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
const recipients = new Map<string, { name: string; accountNumber: string; bankCode: string }>();
const transfers = new Map<string, { reference: string; transfer_code: string; amount: number; recipient: string; status: string; reason: string | null }>();
const BANKS = [
  { name: "Access Bank", code: "044", active: true, is_deleted: false, type: "nuban" },
  { name: "Guaranty Trust Bank", code: "058", active: true, is_deleted: false, type: "nuban" },
  { name: "Zenith Bank", code: "057", active: true, is_deleted: false, type: "nuban" },
  { name: "Retired Bank", code: "999", active: false, is_deleted: true, type: "nuban" },
];

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
  await postEvent("charge.success", { reference: transaction.reference, amount: transaction.amount, currency: "NGN", status: "success" });
}

async function postEvent(event: string, data: Record<string, unknown>) {
  if (!webhookUrl) {
    return;
  }
  const body = JSON.stringify({ event, data });
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

  if (request.method === "POST" && parts[0] === "transfers" && parts[2] === "complete") {
    const transfer = transfers.get(parts[1] ?? "");
    if (!transfer) {
      return json(404, { status: false, message: "Transfer not found" });
    }
    transfer.status = url.searchParams.get("status") === "failed" ? "failed" : "success";
    transfer.reason = transfer.status === "failed" ? "Account could not be credited" : transfer.reason;
    await postEvent(`transfer.${transfer.status}`, { ...transfer });
    return json(200, transfer);
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

  if (request.method === "GET" && url.pathname === "/bank") {
    return json(200, { status: true, message: "Banks retrieved", data: BANKS });
  }

  if (request.method === "GET" && url.pathname === "/bank/resolve") {
    const accountNumber = url.searchParams.get("account_number") ?? "";
    const bankCode = url.searchParams.get("bank_code") ?? "";
    if (!/^\d{10}$/.test(accountNumber) || accountNumber.startsWith("999") || !BANKS.some((bank) => bank.code === bankCode && bank.active)) {
      return json(422, { status: false, message: "Could not resolve account name. Check parameters or try again." });
    }
    return json(200, { status: true, message: "Account number resolved", data: { account_number: accountNumber, account_name: `E2E ACCOUNT ${accountNumber.slice(-4)}` } });
  }

  if (request.method === "POST" && url.pathname === "/transferrecipient") {
    const payload = JSON.parse(await readBody(request)) as { name: string; account_number: string; bank_code: string };
    const recipientCode = `RCP_${payload.account_number}`;
    recipients.set(recipientCode, { name: payload.name, accountNumber: payload.account_number, bankCode: payload.bank_code });
    return json(201, { status: true, message: "Transfer recipient created successfully", data: { recipient_code: recipientCode } });
  }

  if (request.method === "POST" && url.pathname === "/transfer") {
    const payload = JSON.parse(await readBody(request)) as { amount: number; recipient: string; reference: string; reason: string };
    if (!recipients.has(payload.recipient)) {
      return json(400, { status: false, message: "Invalid recipient" });
    }
    if (transfers.has(payload.reference)) {
      return json(400, { status: false, message: "Duplicate Transfer Reference" });
    }
    const transfer = { reference: payload.reference, transfer_code: `TRF_${transfers.size + 1000}`, amount: Number(payload.amount), recipient: payload.recipient, status: "pending", reason: null };
    transfers.set(payload.reference, transfer);
    return json(200, { status: true, message: "Transfer has been queued", data: transfer });
  }

  if (request.method === "GET" && parts[0] === "transfer" && parts[1] === "verify") {
    const transfer = transfers.get(parts[2] ?? "");
    return transfer ? json(200, { status: true, message: "Transfer retrieved", data: transfer }) : json(404, { status: false, message: "Transfer not found" });
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
