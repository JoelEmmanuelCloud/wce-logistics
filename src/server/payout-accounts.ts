import "server-only";
import { eq, sql } from "drizzle-orm";
import { recordAudit } from "@/server/audit";
import { encrypt } from "@/server/crypto";
import { db, schema } from "@/server/db";
import type { PayoutAccount } from "@/server/db/schema";
import { createTransferRecipient, listBanks, PaystackError, resolveAccount } from "@/server/paystack";

export class PayoutAccountError extends Error {}

export function describeAccount(account: Pick<PayoutAccount, "bankName" | "accountNumberLast4" | "accountName">): string {
  return `${account.bankName}, account ending ${account.accountNumberLast4}, ${account.accountName}`;
}

export async function findPayoutAccount(vendorId: string): Promise<PayoutAccount | null> {
  const [account] = await db().select().from(schema.payoutAccounts).where(eq(schema.payoutAccounts.vendorId, vendorId)).limit(1);
  return account ?? null;
}

export async function savePayoutAccount(vendorId: string, actorId: string, input: { bankCode: string; accountNumber: string }): Promise<PayoutAccount> {
  let bankName: string;
  let accountName: string;
  let recipientCode: string;
  try {
    const bank = (await listBanks()).find((option) => option.code === input.bankCode);
    if (!bank) {
      throw new PayoutAccountError("Choose your bank from the list.");
    }
    bankName = bank.name;
    try {
      accountName = (await resolveAccount(input.accountNumber, input.bankCode)).accountName;
    } catch (error) {
      if (error instanceof PaystackError) {
        throw new PayoutAccountError("We could not find that account at the selected bank. Check the account number and bank.");
      }
      throw error;
    }
    recipientCode = (await createTransferRecipient({ name: accountName, accountNumber: input.accountNumber, bankCode: input.bankCode })).recipientCode;
  } catch (error) {
    if (error instanceof PaystackError) {
      console.error(error);
      throw new PayoutAccountError("We could not verify bank accounts right now. Please try again in a few minutes.");
    }
    throw error;
  }

  return db().transaction(async (tx) => {
    const values = {
      bankCode: input.bankCode,
      bankName,
      accountNumberEncrypted: encrypt(input.accountNumber),
      accountNumberLast4: input.accountNumber.slice(-4),
      accountName,
      recipientCode,
    };
    const [account] = await tx
      .insert(schema.payoutAccounts)
      .values({ vendorId, ...values })
      .onConflictDoUpdate({ target: schema.payoutAccounts.vendorId, set: { ...values, updatedAt: sql`now()` } })
      .returning();
    await recordAudit(
      { actorId, action: "payout_account.saved", entityType: "vendor", entityId: vendorId, metadata: { bankCode: input.bankCode, last4: account.accountNumberLast4 } },
      tx,
    );
    return account;
  });
}
