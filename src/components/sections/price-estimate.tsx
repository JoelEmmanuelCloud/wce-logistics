import { connection } from "next/server";
import { Suspense } from "react";
import { PriceEstimator } from "@/components/sections/price-estimator";
import { lagosToday } from "@/lib/dates";
import { openLaneRates, type LaneRates } from "@/server/estimates";

async function LiveEstimator() {
  await connection();
  let rates: LaneRates;
  try {
    rates = await openLaneRates(lagosToday());
  } catch (error) {
    console.error(error);
    return (
      <div className="rounded-[22px] bg-white/[0.06] p-[clamp(20px,2vw,32px)]">
        <p className="text-[clamp(18px,1.5vw,22px)] font-semibold">Price estimates are unavailable right now.</p>
        <p className="mt-3 text-[15px] leading-relaxed text-white/70">Sign in to see live offers on your route, or try again in a few minutes.</p>
      </div>
    );
  }
  return <PriceEstimator lanes={rates.lanes} minShipmentKg={rates.minShipmentKg} />;
}

function EstimatorSkeleton() {
  return (
    <div aria-hidden="true" className="grid animate-pulse gap-4 lg:grid-cols-2 lg:gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="h-[76px] rounded-xl bg-white/10" />
        <div className="h-[76px] rounded-xl bg-white/10" />
        <div className="h-[100px] rounded-xl bg-white/10 sm:col-span-2" />
      </div>
      <div className="min-h-[220px] rounded-[22px] bg-white/[0.06]" />
    </div>
  );
}

export function PriceEstimate() {
  return (
    <div id="estimate" className="mt-4 scroll-mt-4 rounded-[28px] bg-navy p-[clamp(20px,2.4vw,40px)] text-white lg:mt-5">
      <div className="mb-[clamp(24px,3vw,40px)] flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <h3 className="font-display text-[clamp(32px,3.2vw,56px)] uppercase leading-[0.95]">
          Check a price <span className="text-orange">before you sign in</span>
        </h3>
        <p className="max-w-[28em] text-[15px] leading-relaxed text-white/70 lg:text-right">
          Rates from verified trucks with open trips on your route. No account needed.
        </p>
      </div>
      <Suspense fallback={<EstimatorSkeleton />}>
        <LiveEstimator />
      </Suspense>
    </div>
  );
}
