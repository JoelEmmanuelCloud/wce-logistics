import type { ReactNode } from "react";

function Bone({ className }: { className: string }) {
  return <div className={`rounded-md bg-navy/[0.08] ${className}`} />;
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-2xl border border-navy/10 bg-white p-[clamp(20px,2.4vw,32px)] ${className ?? ""}`}>{children}</div>;
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="motion-safe:animate-pulse">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function HeaderBones({ action = false }: { action?: boolean }) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="w-full">
        <Bone className="h-11 w-2/3 max-w-[360px]" />
        <Bone className="mt-4 h-4 w-full max-w-[520px]" />
      </div>
      {action && <Bone className="h-11 w-40 shrink-0" />}
    </div>
  );
}

function PanelHeading() {
  return (
    <div className="mb-6">
      <Bone className="h-5 w-40" />
      <Bone className="mt-2 h-3.5 w-64 max-w-full" />
    </div>
  );
}

function FieldBones({ count }: { count: number }) {
  return (
    <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="grid gap-2">
          <Bone className="h-3.5 w-28" />
          <Bone className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

function DefinitionBones({ count }: { count: number }) {
  return (
    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Bone className="h-3 w-24" />
          <Bone className="mt-2 h-4 w-40 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function RowBones({ count }: { count: number }) {
  return (
    <div className="divide-y divide-navy/10">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 py-3.5">
          <div className="min-w-0 flex-1">
            <Bone className="h-4 w-48 max-w-full" />
            <Bone className="mt-2 h-3 w-32" />
          </div>
          <Bone className="h-6 w-24 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <Frame label="Loading">
      <HeaderBones />
      <div className="grid gap-4">
        <Panel>
          <PanelHeading />
          <DefinitionBones count={4} />
        </Panel>
        <Panel>
          <RowBones count={4} />
        </Panel>
      </div>
    </Frame>
  );
}

export function DashboardSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <Frame label="Loading overview">
      <HeaderBones />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: stats }, (_, index) => (
          <div key={index} className="rounded-2xl border border-navy/10 bg-white p-5">
            <Bone className="h-3.5 w-3/4" />
            <Bone className="mt-3 h-10 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeading />
          <RowBones count={4} />
        </Panel>
        <Panel>
          <PanelHeading />
          <RowBones count={4} />
        </Panel>
      </div>
    </Frame>
  );
}

export function TableSkeleton({ columns = 6, rows = 8, filters = true }: { columns?: number; rows?: number; filters?: boolean }) {
  return (
    <Frame label="Loading list">
      <HeaderBones />
      {filters && (
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }, (_, index) => (
              <Bone key={index} className="h-9 w-24 shrink-0" />
            ))}
          </div>
          <Bone className="h-11 w-full sm:w-80" />
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
        <div className="flex gap-6 border-b border-navy/10 bg-navy/[0.03] px-4 py-3.5">
          {Array.from({ length: columns }, (_, index) => (
            <Bone key={index} className={`h-3 flex-1 ${index > 2 ? "hidden md:block" : ""}`} />
          ))}
        </div>
        <div className="divide-y divide-navy/10">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="flex items-center gap-6 px-4 py-4">
              {Array.from({ length: columns }, (_, index) => (
                <Bone key={index} className={`h-4 flex-1 ${index > 2 ? "hidden md:block" : ""} ${index === 0 ? "max-w-none" : "max-w-[140px]"}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function CardListSkeleton({ rows = 4, action = false }: { rows?: number; action?: boolean }) {
  return (
    <Frame label="Loading list">
      <HeaderBones action={action} />
      <div className="grid gap-4">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-2xl border border-navy/10 bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <Bone className="h-5 w-56 max-w-full" />
              <Bone className="mt-3 h-3.5 w-80 max-w-full" />
            </div>
            <div className="flex items-center gap-3">
              <Bone className="h-6 w-24 rounded-full" />
              <Bone className="h-9 w-28" />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function CardGridSkeleton({ cards = 6, action = true }: { cards?: number; action?: boolean }) {
  return (
    <Frame label="Loading">
      <HeaderBones action={action} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="flex h-48 flex-col justify-between rounded-2xl border border-navy/10 bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <Bone className="h-5 w-32" />
              <Bone className="h-6 w-20 rounded-full" />
            </div>
            <div>
              <Bone className="h-3.5 w-40" />
              <Bone className="mt-2 h-3.5 w-28" />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function DetailSkeleton() {
  return (
    <Frame label="Loading details">
      <Bone className="h-4 w-32" />
      <div className="mt-4">
        <HeaderBones action />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          <Panel>
            <PanelHeading />
            <DefinitionBones count={6} />
          </Panel>
          <Panel>
            <PanelHeading />
            <RowBones count={3} />
          </Panel>
        </div>
        <div className="grid content-start gap-6">
          <Panel>
            <PanelHeading />
            <Bone className="h-4 w-full" />
            <Bone className="mt-2 h-4 w-4/5" />
            <Bone className="mt-6 h-11 w-36" />
          </Panel>
          <Panel>
            <PanelHeading />
            <RowBones count={3} />
          </Panel>
        </div>
      </div>
    </Frame>
  );
}

export function FormSkeleton({ fields = 6, back = false }: { fields?: number; back?: boolean }) {
  return (
    <Frame label="Loading form">
      {back && <Bone className="mb-4 h-4 w-32" />}
      <HeaderBones />
      <Panel>
        <FieldBones count={fields} />
        <div className="mt-8 flex gap-3">
          <Bone className="h-11 w-36" />
        </div>
      </Panel>
    </Frame>
  );
}
