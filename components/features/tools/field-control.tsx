"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Controller, type Control, type FieldErrors } from "react-hook-form";

import { GpuSelect } from "@/components/features/catalog/gpu-select";
import { ModelSelect } from "@/components/features/catalog/model-select";
import { ToolSelect } from "@/components/features/catalog/tool-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Field } from "@/lib/tools/spec";
import { cn } from "@/lib/utils";

/**
 * One renderer per control kind.
 *
 * Every branch here is written once and inherited by all 28 tools. A tool
 * author picks a `kind` and gets label, description, unit suffix, validation
 * message, and correct `aria-describedby` wiring for free — which is the
 * difference between accessibility being a policy and being the default.
 */

type Values = Record<string, unknown>;

export function FieldControl({
  field,
  control,
  errors,
  values,
}: {
  field: Field;
  control: Control<Values>;
  errors: FieldErrors<Values>;
  values: Values;
}) {
  // `showWhen` is evaluated here rather than at the form level so a hidden
  // field still keeps its registered value — toggling a switch back and forth
  // must not silently clear what the user typed.
  if (field.showWhen && !field.showWhen(values)) return null;

  const error = errors[field.name];
  const message = typeof error?.message === "string" ? error.message : undefined;
  const describedBy = [
    field.description ? `${field.name}-description` : null,
    message ? `${field.name}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        field.span === 4 && "sm:col-span-4",
        field.span === 6 && "sm:col-span-6",
        field.span === 8 && "sm:col-span-8",
        (field.span === 12 || !field.span) && "sm:col-span-12",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={field.name} className="text-[13px]">
          {field.label}
        </Label>
        {field.kind === "slider" ? <SliderValue field={field} value={values[field.name]} /> : null}
      </div>

      <Controller
        name={field.name}
        control={control}
        render={({ field: rhf }) => (
          <Renderer
            field={field}
            value={rhf.value}
            onChange={rhf.onChange}
            onBlur={rhf.onBlur}
            invalid={Boolean(message)}
            describedBy={describedBy || undefined}
          />
        )}
      />

      {field.description ? (
        <p id={`${field.name}-description`} className="text-xs leading-relaxed text-fg-muted">
          {field.description}
        </p>
      ) : null}
      {message ? (
        <p id={`${field.name}-error`} role="alert" className="text-xs font-medium text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function SliderValue({ field, value }: { field: Field; value: unknown }) {
  if (field.kind !== "slider") return null;
  const numeric = typeof value === "number" ? value : Number(value ?? field.min);
  return (
    <span className="text-xs text-fg-muted tabular-nums">
      {field.format ? field.format(numeric) : numeric}
      {field.unit ? ` ${field.unit}` : ""}
    </span>
  );
}

type RendererProps = {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  invalid: boolean;
  describedBy: string | undefined;
};

function Renderer({ field, value, onChange, onBlur, invalid, describedBy }: RendererProps) {
  const common = {
    id: field.name,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
    onBlur,
  };

  switch (field.kind) {
    case "text":
      return (
        <Input
          {...common}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "number":
    case "currency":
      return (
        <div className="relative">
          {field.kind === "currency" ? (
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-fg-subtle">
              $
            </span>
          ) : null}
          <Input
            {...common}
            type="number"
            inputMode="decimal"
            min={field.min}
            max={field.max}
            step={field.step ?? "any"}
            value={value === undefined || value === null ? "" : String(value)}
            placeholder={field.placeholder}
            className={cn(
              "tabular-nums",
              field.kind === "currency" && "pl-6",
              field.unit && "pr-14",
            )}
            // Empty means "unset", not zero. Coercing "" to 0 here would make
            // clearing a field silently submit a real value.
            onChange={(event) =>
              onChange(event.target.value === "" ? undefined : Number(event.target.value))
            }
          />
          {field.unit ? (
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-fg-subtle">
              {field.unit}
            </span>
          ) : null}
        </div>
      );

    case "slider":
      return (
        <Slider
          id={field.name}
          aria-describedby={describedBy}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={[typeof value === "number" ? value : field.min]}
          onValueChange={([next]) => onChange(next)}
          className="py-2"
        />
      );

    case "textarea":
    case "code":
      return (
        <Textarea
          {...common}
          rows={field.rows ?? (field.kind === "code" ? 10 : 4)}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          className={cn(field.kind === "code" && "font-mono text-xs leading-relaxed")}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={field.kind === "code" ? false : undefined}
        />
      );

    case "select":
      return (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger id={field.name} aria-describedby={describedBy} className="w-full">
            <SelectValue placeholder={field.placeholder ?? "Select…"} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-baseline gap-2">
                  {option.label}
                  {option.hint ? (
                    <span className="text-xs text-fg-subtle">{option.hint}</span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multi-select": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const atLimit = field.max !== undefined && selected.length >= field.max;
      return (
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((option) => {
            const isOn = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                disabled={atLimit && !isOn}
                onClick={() =>
                  onChange(
                    isOn
                      ? selected.filter((item) => item !== option.value)
                      : [...selected, option.value],
                  )
                }
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  isOn
                    ? "border-ember-line bg-ember-quiet text-ember"
                    : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
                  atLimit && !isOn && "cursor-not-allowed opacity-40",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "radio-group":
      return (
        <RadioGroup
          value={String(value ?? "")}
          onValueChange={onChange}
          aria-describedby={describedBy}
          className="gap-2"
        >
          {field.options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line px-3 py-2 text-[13px] transition-colors hover:border-line-strong has-[[data-state=checked]]:border-ember-line has-[[data-state=checked]]:bg-ember-quiet"
            >
              <RadioGroupItem value={option.value} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block font-medium text-fg">{option.label}</span>
                {option.hint ? (
                  <span className="block text-xs text-fg-muted">{option.hint}</span>
                ) : null}
              </span>
            </label>
          ))}
        </RadioGroup>
      );

    case "checkbox":
      return (
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
          <Checkbox
            id={field.name}
            checked={Boolean(value)}
            onCheckedChange={onChange}
            aria-describedby={describedBy}
          />
          <span className="text-fg-muted">{field.placeholder ?? "Enabled"}</span>
        </label>
      );

    case "switch":
      return (
        <div className="flex items-center gap-2.5">
          <Switch
            id={field.name}
            checked={Boolean(value)}
            onCheckedChange={onChange}
            aria-describedby={describedBy}
          />
          <span className="text-[13px] text-fg-muted">
            {value ? "On" : (field.placeholder ?? "Off")}
          </span>
        </div>
      );

    case "tag-input":
      return (
        <TagInput
          id={field.name}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
          max={field.max}
          placeholder={field.placeholder}
          describedBy={describedBy}
        />
      );

    case "key-value":
      return (
        <KeyValueInput
          value={value && typeof value === "object" ? (value as Record<string, string>) : {}}
          onChange={onChange}
          max={field.max}
        />
      );

    case "file":
      return (
        <Input
          id={field.name}
          type="file"
          accept={field.accept}
          aria-describedby={describedBy}
          className="h-9 cursor-pointer py-1.5 file:mr-3 file:text-xs"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              onChange(undefined);
              return;
            }
            // Read as text: every file-taking tool in this product wants the
            // contents, not a binary handle.
            void file.text().then(onChange);
          }}
        />
      );

    case "model-select":
      if (field.multiple) {
        return (
          <MultiModelSelect
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={onChange}
            family={field.family}
            max={field.max}
          />
        );
      }
      return (
        <ModelSelect
          id={field.name}
          value={typeof value === "string" ? value : undefined}
          onChange={onChange}
          family={field.family}
          placeholder={field.placeholder}
        />
      );

    case "tool-select":
      return (
        <ToolSelect
          id={field.name}
          value={value as string | string[] | undefined}
          onChange={onChange}
          category={field.category}
          multiple={field.multiple}
          max={field.max}
          placeholder={field.placeholder}
        />
      );

    case "gpu-select":
      return (
        <GpuSelect
          id={field.name}
          value={typeof value === "string" ? value : undefined}
          onChange={onChange}
          minVram={field.minVram}
          placeholder={field.placeholder}
        />
      );

    case "repeater":
      return (
        <Repeater
          field={field}
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          onChange={onChange}
        />
      );
  }
}

/**
 * A repeating group. Each row renders the sub-fields with the same `Renderer`
 * used everywhere else, so a `model-select` inside a repeater behaves exactly
 * like one outside it — including its catalog data and price display.
 */
function Repeater({
  field,
  value,
  onChange,
}: {
  field: Extract<Field, { kind: "repeater" }>;
  value: Record<string, unknown>[];
  onChange: (value: Record<string, unknown>[]) => void;
}) {
  const rows = value.length ? value : [field.newItem()];
  const atMax = field.max !== undefined && rows.length >= field.max;
  const atMin = rows.length <= (field.min ?? 1);

  function update(index: number, key: string, next: unknown) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: next } : row)));
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <div key={index} className="rounded-md border border-line bg-surface-2/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-[0.05em] text-fg-muted uppercase">
              {field.itemLabel} {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              disabled={atMin}
              aria-label={`Remove ${field.itemLabel.toLowerCase()} ${index + 1}`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              <XIcon className="size-3" aria-hidden />
            </Button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-12">
            {field.fields.map((sub) => (
              <div
                key={sub.name}
                className={cn(
                  "flex flex-col gap-1",
                  sub.span === 4 && "sm:col-span-4",
                  sub.span === 6 && "sm:col-span-6",
                  sub.span === 8 && "sm:col-span-8",
                  (sub.span === 12 || !sub.span) && "sm:col-span-12",
                )}
              >
                <Label htmlFor={`${field.name}.${index}.${sub.name}`} className="text-xs">
                  {sub.label}
                </Label>
                <Renderer
                  field={{ ...sub, name: `${field.name}.${index}.${sub.name}` }}
                  value={row[sub.name]}
                  onChange={(next) => update(index, sub.name, next)}
                  onBlur={() => undefined}
                  invalid={false}
                  describedBy={undefined}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={atMax}
        className="self-start"
        onClick={() => onChange([...rows, field.newItem()])}
      >
        <PlusIcon className="size-3.5" aria-hidden />
        Add {field.itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}

/**
 * Several models at once, for the comparison tools. A row of single selects
 * rather than a multi-select, because order is meaningful — it decides the
 * column order in the matrix.
 */
function MultiModelSelect({
  value,
  onChange,
  family,
  max = 4,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  family?: "chat" | "embedding" | "rerank";
  max?: number;
}) {
  const slots = Math.min(Math.max(value.length + 1, 2), max);

  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: slots }, (_, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-center text-xs text-fg-subtle tabular-nums">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <ModelSelect
              value={value[index]}
              family={family}
              placeholder={index < 2 ? "Required" : "Optional"}
              onChange={(next) => {
                const copy = [...value];
                copy[index] = next;
                onChange(copy.filter(Boolean));
              }}
            />
          </div>
          {value[index] ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={`Remove model ${index + 1}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <XIcon className="size-3.5" aria-hidden />
            </Button>
          ) : (
            <span className="size-8 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

function TagInput({
  id,
  value,
  onChange,
  max,
  placeholder,
  describedBy,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  placeholder?: string;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState("");
  const atLimit = max !== undefined && value.length >= max;

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed) || atLimit) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        value={draft}
        aria-describedby={describedBy}
        placeholder={atLimit ? `Maximum ${max}` : (placeholder ?? "Type and press Enter")}
        disabled={atLimit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          }
          // Backspace on an empty input removes the last tag — the behaviour
          // every tag input has, and its absence is immediately noticed.
          if (event.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
      />
      {value.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1 font-normal">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== tag))}
                className="rounded-xs p-0.5 text-fg-subtle hover:text-fg"
                aria-label={`Remove ${tag}`}
              >
                <XIcon className="size-3" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function KeyValueInput({
  value,
  onChange,
  max,
}: {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  max?: number;
}) {
  const entries = Object.entries(value);
  const atLimit = max !== undefined && entries.length >= max;

  function update(index: number, key: string, val: string) {
    const next = entries.map((entry, i) => (i === index ? [key, val] : entry));
    onChange(Object.fromEntries(next));
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([key, val], index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={key}
            placeholder="Key"
            className="flex-1 font-mono text-xs"
            onChange={(event) => update(index, event.target.value, val)}
          />
          <Input
            value={val}
            placeholder="Value"
            className="flex-1 font-mono text-xs"
            onChange={(event) => update(index, key, event.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={`Remove ${key || "entry"}`}
            onClick={() => onChange(Object.fromEntries(entries.filter((_, i) => i !== index)))}
          >
            <XIcon className="size-3.5" aria-hidden />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={atLimit}
        className="self-start"
        onClick={() => onChange({ ...value, "": "" })}
      >
        <PlusIcon className="size-3.5" aria-hidden />
        Add pair
      </Button>
    </div>
  );
}
