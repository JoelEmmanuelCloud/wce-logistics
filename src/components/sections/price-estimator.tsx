"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { ArrowUpRightIcon } from "@/components/line-icons";
import { Select } from "@/components/ui/select";
import { estimateRange, formatNaira, type RouteLane } from "@/lib/pricing";

const FIELD = "h-12 w-full rounded-xl border border-white/15 bg-white px-4 text-[16px] text-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange/60";
const LABEL = "text-[13px] font-semibold uppercase tracking-[0.14em] text-white/70";

export function PriceEstimator({ lanes, minShipmentKg }: { lanes: RouteLane[]; minShipmentKg: number }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [weight, setWeight] = useState(String(Math.max(minShipmentKg, 500)));
  const id = useId();

  const origins = [...new Set(lanes.map((lane) => lane.origin))].sort();
  const destinations = lanes.filter((lane) => lane.origin === origin).map((lane) => lane.destination).sort();
  const lane = lanes.find((item) => item.origin === origin && item.destination === destination);
  const weightKg = Number(weight);
  const weightValid = Number.isInteger(weightKg) && weightKg >= minShipmentKg;
  const estimate = lane && weightValid ? estimateRange(lane.offers, weightKg, minShipmentKg) : null;

  function chooseOrigin(value: string) {
    setOrigin(value);
    if (!lanes.some((item) => item.origin === value && item.destination === destination)) {
      setDestination("");
    }
  }

  if (lanes.length === 0) {
    return (
      <EstimateFrame>
        <div className="flex flex-col justify-center gap-4 rounded-[22px] bg-white/[0.06] p-[clamp(20px,2vw,32px)] lg:col-span-2">
          <p className="text-[clamp(18px,1.5vw,22px)] font-semibold">No open trips to price against right now.</p>
          <p className="max-w-[36em] text-[15px] leading-relaxed text-white/70">
            Vendors publish new trips every week. Sign in to post your load and see verified trucks on your route as soon as they are listed.
          </p>
          <BookLink />
        </div>
      </EstimateFrame>
    );
  }

  return (
    <EstimateFrame>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor={`${id}-from`} className={LABEL}>
            From
          </label>
          <Select id={`${id}-from`} options={origins.map((state) => ({ value: state, label: state }))} value={origin} onValueChange={chooseOrigin} placeholder="Choose a state" />
        </div>
        <div className="grid gap-2">
          <label htmlFor={`${id}-to`} className={LABEL}>
            To
          </label>
          <Select id={`${id}-to`} options={destinations.map((state) => ({ value: state, label: state }))} value={destination} onValueChange={setDestination} disabled={!origin} placeholder="Choose a state" />
        </div>
        <label className="grid gap-2 sm:col-span-2" htmlFor={`${id}-weight`}>
          <span className={LABEL}>Weight in kg</span>
          <input
            id={`${id}-weight`}
            type="number"
            inputMode="numeric"
            min={minShipmentKg}
            step={1}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            aria-describedby={`${id}-weight-help`}
            aria-invalid={weight !== "" && !weightValid}
            className={FIELD}
          />
          <span id={`${id}-weight-help`} className={`text-[13px] ${weight !== "" && !weightValid ? "font-semibold text-orange" : "text-white/60"}`}>
            Whole kilograms, {minShipmentKg} kg minimum
          </span>
        </label>
      </div>

      <div aria-live="polite" className="flex min-h-[220px] flex-col justify-between gap-6 rounded-[22px] bg-white/[0.06] p-[clamp(20px,2vw,32px)]">
        {!lane ? (
          <p className="text-[clamp(18px,1.5vw,22px)] font-semibold text-white/80">Pick a route to see what trucks on it are charging.</p>
        ) : !weightValid ? (
          <p className="text-[clamp(18px,1.5vw,22px)] font-semibold text-white/80">Enter a weight of at least {minShipmentKg} kg.</p>
        ) : !estimate ? (
          <p className="text-[clamp(18px,1.5vw,22px)] font-semibold text-white/80">
            No open trip from {origin} to {destination} has room for {weightKg.toLocaleString("en-NG")} kg right now. Try a lighter load or post it and we will match it.
          </p>
        ) : (
          <div>
            <p className={LABEL}>Estimated total</p>
            <p className="mt-3 font-display text-[clamp(36px,3.4vw,60px)] uppercase leading-none tabular-nums">
              {estimate.lowestKobo === estimate.highestKobo
                ? formatNaira(estimate.lowestKobo)
                : `${formatNaira(estimate.lowestKobo)} to ${formatNaira(estimate.highestKobo)}`}
            </p>
            <p className="mt-4 max-w-[30em] text-[14px] leading-relaxed text-white/70">
              Based on {estimate.trips} open {estimate.trips === 1 ? "trip" : "trips"} from {origin} to {destination}. Your final price depends on cargo type, pickup date and any extra charges, and is shown in full before you pay.
            </p>
          </div>
        )}
        <BookLink />
      </div>
    </EstimateFrame>
  );
}

function EstimateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:gap-5">{children}</div>
  );
}

function BookLink() {
  return (
    <Link
      href="/sign-in?as=customer"
      className="group inline-flex h-12 w-fit items-center gap-3 rounded-full bg-orange pl-6 pr-1.5 text-[16px] font-semibold text-navy transition-colors hover:bg-white"
    >
      Sign in to book
      <span className="grid size-9 place-items-center rounded-full bg-navy text-white transition-transform duration-300 group-hover:rotate-45">
        <ArrowUpRightIcon className="size-4" />
      </span>
    </Link>
  );
}
