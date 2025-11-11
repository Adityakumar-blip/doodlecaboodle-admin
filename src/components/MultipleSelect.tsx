import React from "react";

// 🔹 Reusable MultiSelect (drop this in your ProductModal file or a small component file)
type Option = { value: string; label: string };

function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
}: {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
  }, [options, query]);

  const add = (val: string) => {
    if (selectedSet.has(val)) return;
    onChange([...value, val]);
    setQuery("");
  };

  const remove = (val: string) => {
    onChange(value.filter((v) => v !== val));
  };

  const toggle = (val: string) => {
    if (selectedSet.has(val)) remove(val);
    else add(val);
  };

  return (
    <div className="relative">
      {/* Control */}
      <div
        className={`min-h-10 w-full rounded-md border px-2 py-1.5 flex items-center flex-wrap gap-1 focus-within:ring-2 focus-within:ring-ring bg-background`}
        onClick={() => setOpen(true)}
      >
        {/* Selected chips */}
        {value.length > 0 &&
          value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm"
              >
                {opt?.label ?? v}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(v);
                  }}
                  className="inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
                  aria-label="Remove"
                >
                  ×
                </button>
              </span>
            );
          })}

        {/* Search input */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && query === "" && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={value.length ? "" : placeholder}
          className="flex-1 min-w-[8ch] bg-transparent outline-none text-sm py-0.5"
        />
      </div>

      {/* Dropdown list */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
          onMouseDown={(e) => e.preventDefault()} // keep focus
        >
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-2 text-sm text-muted-foreground">
                No results
              </div>
            ) : (
              filtered.map((opt) => {
                const active = selectedSet.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent ${
                      active ? "opacity-60" : ""
                    }`}
                    onClick={() => toggle(opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t px-2 py-1">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => {
                onChange([]);
                setQuery("");
              }}
            >
              Clear all
            </button>
            <button
              type="button"
              className="text-xs hover:underline"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
