import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { WceLogo } from "@/components/wce-logo";
import type { LegalDocument } from "@/data/legal";
import { formatPhone } from "@/lib/phone";
import { site } from "@/lib/site";

const LINK = "font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4";

export function LegalPage({ document }: { document: LegalDocument }) {
  const contactEmail = site.contactEmail;
  const contactWhatsApp = site.contactWhatsApp;
  const whatsappUrl = site.whatsappUrl;

  return (
    <>
      <header className="bg-navy px-[clamp(20px,3.2vw,56px)] pb-[clamp(48px,6vw,88px)] pt-[clamp(20px,4vh,40px)] text-white">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="WCE Logistics home" className="text-[clamp(14px,1.2vw,18px)]">
              <WceLogo />
            </Link>
            <Link href="/" className="rounded-xl border border-white/30 px-4 py-2.5 text-[14px] font-semibold transition-colors hover:bg-white hover:text-navy">
              Back to the homepage
            </Link>
          </div>
          <h1 className="mt-[clamp(48px,7vw,96px)] font-display text-[clamp(48px,7vw,112px)] uppercase leading-[0.9]">{document.title}</h1>
          <p className="mt-6 max-w-[36em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-white/75">{document.summary}</p>
          <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-orange">Last updated {document.updated}</p>
        </div>
      </header>

      <main className="bg-white px-[clamp(20px,3.2vw,56px)] py-[clamp(56px,7vw,104px)] text-navy">
        <div className="mx-auto grid w-full max-w-[1200px] gap-12 lg:grid-cols-[260px_1fr] lg:gap-20">
          <nav aria-label="On this page" className="lg:sticky lg:top-8 lg:self-start">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-orange-ink">On this page</p>
            <ol className="mt-4 grid gap-2 border-l border-navy/15 pl-4">
              {document.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-[14px] leading-snug text-navy/70 transition-colors hover:text-navy">
                    {section.heading}
                  </a>
                </li>
              ))}
              <li>
                <a href="#contact" className="text-[14px] leading-snug text-navy/70 transition-colors hover:text-navy">
                  Contact us
                </a>
              </li>
            </ol>
          </nav>

          <div className="max-w-[44em]">
            {document.sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-8 border-b border-navy/10 py-8 first:pt-0">
                <h2 className="text-[clamp(22px,1.9vw,28px)] font-semibold">
                  <span className="mr-3 font-display text-orange-deep">{String(index + 1).padStart(2, "0")}</span>
                  {section.heading}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-[16px] leading-relaxed text-navy/80">
                    {paragraph}
                  </p>
                ))}
                {section.list && (
                  <ul className="mt-4 grid gap-3">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-3 text-[16px] leading-relaxed text-navy/80">
                        <span className="mt-[0.65em] size-1.5 shrink-0 rounded-full bg-orange" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {section.after?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-[16px] leading-relaxed text-navy/80">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

            <section id="contact" className="scroll-mt-8 pt-8">
              <h2 className="text-[clamp(22px,1.9vw,28px)] font-semibold">
                <span className="mr-3 font-display text-orange-deep">{String(document.sections.length + 1).padStart(2, "0")}</span>
                Contact us
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-navy/80">
                Questions about this page, or a request about your information? Email{" "}
                <a href={`mailto:${contactEmail}`} className={LINK}>
                  {contactEmail}
                </a>{" "}
                or message us on WhatsApp at{" "}
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                  {formatPhone(contactWhatsApp)}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter contactEmail={contactEmail} contactWhatsApp={contactWhatsApp} whatsappUrl={whatsappUrl} />
    </>
  );
}
