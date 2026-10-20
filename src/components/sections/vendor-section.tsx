import { TruckIcon } from "@/components/fleet-icons";
import { ArrowUpRightIcon, CheckIcon } from "@/components/line-icons";
import { DisplayHeading, Eyebrow, Section } from "@/components/section";
import { VENDOR_DOCUMENTS } from "@/data/landing";

export function VendorSection({ contactEmail }: { contactEmail: string }) {
  const href = `mailto:${contactEmail}?subject=${encodeURIComponent("Vendor registration")}`;
  return (
    <Section id="vendors" tone="orange" labelledBy="vendors-title" className="relative overflow-hidden">
      <TruckIcon className="pointer-events-none absolute -right-[6%] -bottom-[18%] w-[min(560px,60vw)] opacity-[0.13] mix-blend-multiply" />
      <div className="relative grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-20">
        <div>
          <Eyebrow>For truck owners and fleets</Eyebrow>
          <DisplayHeading id="vendors-title" className="mt-5 text-[clamp(52px,7.4vw,128px)]">
            Own a truck?
            <span className="block text-white">Put it to work.</span>
          </DisplayHeading>
          <p className="mt-8 max-w-[32em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-navy/85">
            List your trucks, publish the routes you already run and fill empty space on return trips with
            confirmed, paid bookings.
          </p>
          <a
            href={href}
            className="group mt-10 inline-flex items-center gap-4 rounded-full bg-navy py-2 pl-7 pr-2 text-[17px] font-medium text-white transition-colors hover:bg-[#13335c]"
          >
            Register your interest
            <span className="grid size-12 place-items-center rounded-full bg-white text-navy transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRightIcon className="size-5" />
            </span>
          </a>
        </div>
        <div className="rounded-[28px] bg-white p-[clamp(24px,2.6vw,40px)] shadow-[0_24px_60px_rgba(11,37,69,0.18)]">
          <h3 className="font-display text-[clamp(26px,2.2vw,36px)] uppercase leading-none">What you will need</h3>
          <ul className="mt-6 grid gap-4">
            {VENDOR_DOCUMENTS.map((document) => (
              <li key={document} className="flex items-center gap-4 text-[16px]">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-orange text-navy">
                  <CheckIcon className="size-4" />
                </span>
                {document}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-navy/10 pt-5 text-[14px] leading-relaxed text-navy/65">
            Individual owners, registered logistics companies and authorised fleet operators are welcome. Each truck
            is reviewed before it can take bookings.
          </p>
        </div>
      </div>
    </Section>
  );
}
