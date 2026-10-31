"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CloseIcon, SearchIcon } from "@/components/line-icons";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = {
  id: string;
  name?: string;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  searchable?: boolean;
  className?: string;
};

const SEARCH_THRESHOLD = 8;
const PANEL_MAX_HEIGHT = 320;
const PHONE_QUERY = "(max-width: 639px)";

export function Select({ id, name, options, value, defaultValue = "", onValueChange, placeholder = "Select an option", label, disabled, invalid, describedBy, searchable, className }: SelectProps) {
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [sheet, setSheet] = useState(false);
  const [title, setTitle] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const listId = useId();

  const current = value ?? internal;
  const selected = current ? options.find((option) => option.value === current) : undefined;
  const hasSearch = searchable ?? options.length > SEARCH_THRESHOLD;
  const needle = query.trim().toLowerCase();
  const listed = options.filter((option) => !(option.disabled && option.value === "") && (!needle || option.label.toLowerCase().includes(needle)));
  const optionId = (index: number) => `${listId}-${index}`;

  const position = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const isPhone = window.matchMedia(PHONE_QUERY).matches;
    setSheet(isPhone);
    if (isPhone) {
      setPanelStyle({});
      return;
    }
    const width = Math.max(rect.width, 240);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const openUp = below < Math.min(PANEL_MAX_HEIGHT, 220) && above > below;
    const maxHeight = Math.min(PANEL_MAX_HEIGHT, Math.max(openUp ? above : below, 160));
    setPanelStyle(openUp ? { left, width, maxHeight, bottom: window.innerHeight - rect.top + 6 } : { left, width, maxHeight, top: rect.bottom + 6 });
  }, []);

  function fieldLabel(): string {
    const text = triggerRef.current?.labels?.[0]?.textContent ?? "";
    return label ?? (text.replace(/\s*(\*|\(optional\))\s*$/, "").trim() || placeholder);
  }

  function show() {
    if (disabled) {
      return;
    }
    position();
    setTitle(fieldLabel());
    setQuery("");
    setActive(listed.findIndex((option) => option.value === current));
    setOpen(true);
  }

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setQuery("");
    if (refocus) {
      triggerRef.current?.focus();
    }
  }, []);

  function choose(option: SelectOption) {
    if (option.disabled) {
      return;
    }
    setInternal(option.value);
    onValueChange?.(option.value);
    close(true);
  }

  function step(from: number, direction: 1 | -1): number {
    for (let move = 1; move <= listed.length; move += 1) {
      const index = (from + direction * move + listed.length * 2) % listed.length;
      if (!listed[index].disabled) {
        return index;
      }
    }
    return -1;
  }

  function jumpTo(character: string) {
    const now = Date.now();
    const text = now - typeahead.current.at > 600 ? character : typeahead.current.text + character;
    typeahead.current = { text, at: now };
    const match = listed.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(text));
    if (match >= 0) {
      setActive(match);
    }
  }

  function onPanelKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((index) => (listed.length ? step(index, 1) : -1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((index) => (listed.length ? step(index < 0 ? 0 : index, -1) : -1));
        break;
      case "Home":
        if (!hasSearch) {
          event.preventDefault();
          setActive(step(-1, 1));
        }
        break;
      case "End":
        if (!hasSearch) {
          event.preventDefault();
          setActive(step(0, -1));
        }
        break;
      case "Enter":
        event.preventDefault();
        if (listed[active]) {
          choose(listed[active]);
        }
        break;
      case " ":
        if (!hasSearch) {
          event.preventDefault();
          if (listed[active]) {
            choose(listed[active]);
          }
        }
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case "Tab":
        event.preventDefault();
        close(true);
        break;
      default:
        if (!hasSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          jumpTo(event.key.toLowerCase());
        }
    }
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show();
    }
  }

  useLayoutEffect(() => {
    if (open) {
      (hasSearch ? searchRef.current : panelRef.current)?.focus({ preventScroll: true });
    }
  }, [open, hasSearch]);

  useEffect(() => {
    if (open && active >= 0) {
      document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (target !== backdropRef.current && !panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        close(false);
      }
    };
    const onViewportChange = (event: Event) => {
      if (!(event.target instanceof Node && panelRef.current?.contains(event.target))) {
        position();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [open, close, position]);

  useEffect(() => {
    if (!open || !sheet) {
      return;
    }
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open, sheet]);

  const activeId = open && active >= 0 && listed[active] ? optionId(active) : undefined;

  return (
    <>
      {name && <input type="hidden" name={name} value={current} disabled={disabled} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={onTriggerKeyDown}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 text-left text-[16px] transition-colors focus:outline-none focus-visible:border-navy focus-visible:ring-1 focus-visible:ring-navy disabled:cursor-not-allowed disabled:bg-navy/[0.04] disabled:text-navy/50 ${
          invalid ? "border-[#B42318]" : open ? "border-navy ring-1 ring-navy" : "border-navy/20 hover:border-navy/40"
        } ${className ?? ""}`}
      >
        <span className={`min-w-0 truncate ${selected ? "text-navy" : "text-navy/50"}`}>{selected?.label ?? placeholder}</span>
        <svg viewBox="0 0 16 16" className={`size-4 shrink-0 text-navy/60 transition-transform duration-150 ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M3.5 6L8 10.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        createPortal(
          <>
            {sheet && <button ref={backdropRef} type="button" tabIndex={-1} aria-hidden="true" onClick={() => close(true)} className="fixed inset-0 z-[60] bg-navy/50 backdrop-blur-[2px]" />}
            <div
              ref={panelRef}
              tabIndex={-1}
              onKeyDown={onPanelKeyDown}
              aria-activedescendant={hasSearch ? undefined : activeId}
              style={sheet ? undefined : panelStyle}
              className={`select-panel z-[61] flex flex-col overflow-hidden bg-white text-navy focus:outline-none ${
                sheet
                  ? "fixed inset-x-0 bottom-0 max-h-[75svh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] shadow-[0_-24px_60px_rgba(5,14,28,0.35)]"
                  : "fixed rounded-2xl border border-navy/10 shadow-[0_24px_60px_rgba(11,37,69,0.18)]"
              }`}
            >
              {sheet && (
                <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
                  <p className="text-[17px] font-semibold text-navy">{title}</p>
                  <button type="button" aria-label="Close" onClick={() => close(true)} className="grid size-10 place-items-center rounded-full bg-sand text-navy">
                    <CloseIcon className="size-5" />
                  </button>
                </div>
              )}
              {hasSearch && (
                <div className={sheet ? "px-4 pb-2" : "border-b border-navy/10 p-2"}>
                  <div className="flex h-11 items-center gap-2 rounded-xl bg-sand/70 px-3">
                    <SearchIcon className="size-4 shrink-0 text-navy/50" />
                    <input
                      ref={searchRef}
                      type="text"
                      role="searchbox"
                      aria-label="Search options"
                      aria-controls={listId}
                      aria-activedescendant={activeId}
                      autoComplete="off"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setActive(-1);
                      }}
                      placeholder="Search"
                      className="h-full w-full min-w-0 bg-transparent text-[16px] text-navy placeholder:text-navy/50 focus:outline-none"
                    />
                  </div>
                </div>
              )}
              <ul id={listId} role="listbox" aria-label={title || placeholder} className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${sheet ? "px-2 pb-3" : "p-1.5"}`}>
                {listed.length === 0 && <li className="px-3 py-3 text-[15px] text-navy/60">No matches</li>}
                {listed.map((option, index) => {
                  const isSelected = option.value === current && current !== "";
                  return (
                    <li
                      key={option.value || "none"}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      data-value={option.value}
                      onPointerMove={() => !option.disabled && setActive(index)}
                      onClick={() => choose(option)}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 text-[15px] ${sheet ? "min-h-12" : "min-h-10"} ${
                        option.disabled ? "cursor-not-allowed text-navy/40" : `cursor-pointer ${index === active ? "bg-navy/[0.06]" : ""} ${isSelected ? "font-semibold text-navy" : "text-navy/85"}`
                      }`}
                    >
                      <span className="min-w-0 py-2">{option.label}</span>
                      {isSelected && <CheckIcon className="size-4 shrink-0 text-orange-ink" />}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
