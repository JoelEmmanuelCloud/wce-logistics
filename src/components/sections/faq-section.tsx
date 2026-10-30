import { PlusIcon } from "@/components/line-icons";
import { DisplayHeading, Section } from "@/components/section";
import { FAQS } from "@/data/landing";

export function FaqSection({ contactEmail, whatsappUrl }: { contactEmail: string; whatsappUrl: string }) {
  return (
    <Section id="faq" tone="white" labelledBy="faq-title" watermark="left">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
        <div>
          <DisplayHeading id="faq-title">
            Good to
            <span className="block text-orange-deep">know</span>
          </DisplayHeading>
          <p className="mt-8 max-w-[24em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-navy/75">
            Still have a question? Write to us at{" "}
            <a href={`mailto:${contactEmail}`} className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
              {contactEmail}
            </a>{" "}
            or message us on{" "}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4"
            >
              WhatsApp
            </a>
            .
          </p>
        </div>
        <div className="border-t border-navy/15">
          {FAQS.map((faq) => (
            <details key={faq.question} className="faq-item group border-b border-navy/15">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[clamp(18px,1.5vw,22px)] font-semibold [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-navy/20 transition-all duration-300 group-open:rotate-45 group-open:border-orange group-open:bg-orange">
                  <PlusIcon className="size-5" />
                </span>
              </summary>
              <p className="max-w-[44em] pb-7 sm:pr-16 text-[16px] leading-relaxed text-navy/75">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
