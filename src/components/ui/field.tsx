import type { ComponentProps, ReactNode } from "react";

const CONTROL =
  "w-full rounded-xl border border-navy/20 bg-white px-4 text-[16px] text-navy placeholder:text-navy/45 transition-colors focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy aria-[invalid=true]:border-[#B42318] disabled:bg-navy/[0.04] disabled:text-navy/70";

type FieldProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  errors?: string[];
  required?: boolean;
  children: ReactNode;
};

export function Field({ id, label, hint, errors, required, children }: FieldProps) {
  return (
    <div className="grid content-start gap-2">
      <label htmlFor={id} className="text-[14px] font-semibold text-navy">
        {label}
        {required ? <span className="text-orange-ink" aria-hidden="true"> *</span> : <span className="font-normal text-navy/70"> (optional)</span>}
      </label>
      {children}
      {hint && !errors?.length && (
        <p id={`${id}-hint`} className="text-[13px] leading-snug text-navy/70">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium leading-snug text-[#B42318]">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, errors?: string[], hint?: boolean): string | undefined {
  if (errors?.length) {
    return `${id}-error`;
  }
  return hint ? `${id}-hint` : undefined;
}

type ControlExtras = { errors?: string[]; hasHint?: boolean };

export function TextInput({ id, errors, hasHint, className, ...rest }: ComponentProps<"input"> & ControlExtras & { id: string }) {
  return (
    <input
      id={id}
      name={id}
      aria-invalid={errors?.length ? true : undefined}
      aria-describedby={describedBy(id, errors, hasHint)}
      className={`${CONTROL} h-12 ${className ?? ""}`}
      {...rest}
    />
  );
}

export function SelectInput({
  id,
  errors,
  hasHint,
  className,
  children,
  ...rest
}: ComponentProps<"select"> & ControlExtras & { id: string }) {
  return (
    <select
      id={id}
      name={id}
      aria-invalid={errors?.length ? true : undefined}
      aria-describedby={describedBy(id, errors, hasHint)}
      className={`${CONTROL} h-12 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 6L8 10.5L12.5 6' fill='none' stroke='%230B2545' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10 ${className ?? ""}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function TextArea({ id, errors, hasHint, className, ...rest }: ComponentProps<"textarea"> & ControlExtras & { id: string }) {
  return (
    <textarea
      id={id}
      name={id}
      aria-invalid={errors?.length ? true : undefined}
      aria-describedby={describedBy(id, errors, hasHint)}
      className={`${CONTROL} min-h-28 py-3 ${className ?? ""}`}
      {...rest}
    />
  );
}

export function CheckboxGroup({
  name,
  legend,
  options,
  defaultValues,
  errors,
  columns = 3,
}: {
  name: string;
  legend: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValues?: readonly string[];
  errors?: string[];
  columns?: 2 | 3 | 4;
}) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[columns];
  return (
    <fieldset className="grid gap-3" aria-describedby={errors?.length ? `${name}-error` : undefined}>
      <legend className="text-[14px] font-semibold text-navy">
        {legend}
        <span className="text-orange-ink" aria-hidden="true"> *</span>
      </legend>
      <div className={`grid grid-cols-2 gap-2 ${grid}`}>
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-[14px] text-navy transition-colors has-checked:border-navy has-checked:bg-navy/[0.03] has-checked:ring-1 has-checked:ring-navy has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-orange-ink"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={defaultValues?.includes(option.value)}
              className="size-4 accent-[#B84A00]"
            />
            {option.label}
          </label>
        ))}
      </div>
      {errors?.length ? (
        <p id={`${name}-error`} role="alert" className="text-[13px] font-medium text-[#B42318]">
          {errors[0]}
        </p>
      ) : null}
    </fieldset>
  );
}
