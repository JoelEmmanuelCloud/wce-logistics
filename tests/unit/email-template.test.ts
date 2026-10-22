import { describe, expect, it } from "vitest";
import { renderHtml, renderText } from "@/server/email/template";

const brand = { siteUrl: "https://wcelogistics.com", supportEmail: "support@wcelogistics.com" };

describe("email template", () => {
  it("renders the sign-in code prominently in both versions", () => {
    const content = { subject: "482913 is your WCE Logistics sign-in code", heading: "Your sign-in code", paragraphs: ["Enter this code."], code: "482913", preview: "Use 482913 to sign in." };
    const html = renderHtml(content, brand);
    expect(html).toContain("letter-spacing:10px;color:#0B2545;\">482913</span>");
    expect(html).toContain("Use 482913 to sign in.");
    expect(renderText(content, brand)).toContain("Your code: 482913");
  });

  it("escapes every piece of user-facing content", () => {
    const html = renderHtml(
      {
        subject: "<b>subject</b>",
        heading: "<script>alert(1)</script>",
        paragraphs: ['Reason: "late" & <img src=x onerror=alert(1)>'],
        action: { label: "Open <now>", url: 'https://wcelogistics.com/a?b="c"' },
      },
      brand,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&quot;late&quot; &amp;");
    expect(html).toContain("https://wcelogistics.com/a?b=&quot;c&quot;");
  });

  it("includes a fallback link, the support address and a plain text footer", () => {
    const content = { subject: "Booking accepted", heading: "Your booking was accepted", paragraphs: ["Pay now to confirm it."], action: { label: "Pay now", url: "https://wcelogistics.com/account/bookings/1" } };
    const html = renderHtml(content, brand);
    expect(html).toContain("If the button does not work");
    expect(html.match(/https:\/\/wcelogistics\.com\/account\/bookings\/1/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain("mailto:support@wcelogistics.com");
    expect(html).toContain('<meta name="color-scheme" content="light">');
    expect(html).toContain("Pay now to confirm it.");
    const text = renderText(content, brand);
    expect(text).toContain("Pay now:\nhttps://wcelogistics.com/account/bookings/1");
    expect(text).toContain("Questions? Email support@wcelogistics.com");
  });

  it("uses the first paragraph as preview text when none is given", () => {
    const html = renderHtml({ subject: "s", heading: "h", paragraphs: ["First line of the email."] }, brand);
    expect(html).toMatch(/display:none[^>]*>First line of the email\./);
  });
});
