"use client";

import { CheckIcon, LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { useMounted } from "@/hooks/use-mounted";
import { ACCENTS, type AccentValue } from "@/lib/theme/accents";
import { useAccent } from "@/lib/theme/use-accent";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "light", label: "Light", hint: "Warm cream", Icon: SunIcon },
  { value: "system", label: "System", hint: "Follows your OS", Icon: LaptopIcon },
  { value: "dark", label: "Dark", hint: "Low light", Icon: MoonIcon },
] as const;

/**
 * Two settings, not one.
 *
 * Mode and accent are independent: choosing dark should not reset your accent,
 * and choosing an accent should not decide whether it is dark. Collapsing them
 * into a single list of named themes is what forces that coupling.
 */
export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const mounted = useMounted();

  return (
    <Panel>
      <PanelHeader
        title="Appearance"
        description="Applies to this browser only, and takes effect immediately."
      />

      <PanelBody className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-[12.5px] font-medium text-fg">Mode</legend>

          <div role="radiogroup" aria-label="Colour mode" className="grid gap-2 sm:grid-cols-3">
            {MODES.map(({ value, label, hint, Icon }) => {
              // Nothing is active until hydration: the server cannot know the
              // resolved theme, so marking one early marks the wrong one.
              const active = mounted && theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
                    active
                      ? "border-ember bg-ember-quiet/40"
                      : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
                  )}
                >
                  <span className="flex w-full items-center gap-2">
                    <Icon
                      className={cn("size-4", active ? "text-ember" : "text-fg-subtle")}
                      aria-hidden
                    />
                    <span className="text-[13px] font-medium text-fg">{label}</span>
                    {active ? (
                      <CheckIcon className="ml-auto size-3.5 text-ember" aria-hidden />
                    ) : null}
                  </span>
                  <span className="text-xs text-fg-muted">{hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-[12.5px] font-medium text-fg">Accent</legend>

          <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-2">
            {ACCENTS.map((option) => {
              const active = accent === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={option.label}
                  title={option.hint ? `${option.label} — ${option.hint}` : option.label}
                  onClick={() => setAccent(option.value as AccentValue)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 transition-colors",
                    active
                      ? "border-ember bg-ember-quiet/40"
                      : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <span
                    aria-hidden
                    className="flex size-5 items-center justify-center rounded-full"
                    // Inline because the value is data, not a class: a swatch
                    // has to render its own colour even when it is not the
                    // active accent, so it cannot read `--ember`. One value for
                    // both modes — these are chosen colours, not a ramp.
                    style={{ background: option.hex }}
                  >
                    {active ? (
                      <CheckIcon
                        className="size-3"
                        // The tick sits on the swatch, so it needs the same
                        // label colour the button would use. White on yellow
                        // is 1.6:1 and simply is not there.
                        style={{ color: option.labelOn === "white" ? "#FFFFFF" : "#0A0A0A" }}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  <span className="text-[12.5px] text-fg">{option.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs leading-relaxed text-fg-muted">
            Each of these sits near a hue that already means something — warning, success, or the
            indigo that marks AI-generated content. Picking one nudges that colour aside so the two
            stay tellable apart.
          </p>
        </fieldset>

        <Preview />
      </PanelBody>
    </Panel>
  );
}

/**
 * A live sample rather than a description.
 *
 * The accent lands on buttons, links, focus rings, and the quiet tinted
 * surface. Showing those four together is the difference between choosing a
 * swatch and choosing a theme.
 */
function Preview() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12.5px] font-medium text-fg">Preview</span>
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface-2 p-4">
        <span className="rounded-sm bg-ember px-3 py-1.5 text-[13px] font-medium text-ember-fg">
          Primary action
        </span>
        <span className="rounded-sm border border-ember-line bg-ember-quiet px-3 py-1.5 text-[13px] text-fg">
          Selected
        </span>
        <span className="text-[13px] font-medium text-ember underline underline-offset-2">
          A link
        </span>
        <span className="rounded-sm border border-line bg-surface px-3 py-1.5 text-[13px] text-fg ring-2 ring-ember ring-offset-2 ring-offset-surface-2">
          Focus ring
        </span>
      </div>
    </div>
  );
}
