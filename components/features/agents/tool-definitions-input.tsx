"use client";

import { ChevronDownIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The tool-definition builder, shared by `mcp-config` and `function-schema`.
 *
 * Two levels of rows, which the generic repeater deliberately does not do:
 * nesting it would have produced eight labelled controls per parameter and a
 * form nobody can scan. Parameters have a fixed shape, so each is one dense
 * line — name, type, description, required — and the depth stays legible.
 *
 * Tools collapse. A five-tool server is otherwise a page of controls before
 * you reach the button.
 */

export type ParameterValue = {
  name?: string;
  type?: string;
  description?: string;
  required?: boolean;
};

export type ToolValue = {
  name?: string;
  description?: string;
  parameters?: ParameterValue[];
};

const TYPES = ["string", "integer", "number", "boolean", "array", "object"];

function newTool(): ToolValue {
  return { name: "", description: "", parameters: [] };
}

function newParameter(): ParameterValue {
  return { name: "", type: "string", description: "", required: true };
}

export function ToolDefinitionsInput({
  value,
  onChange,
  max = 30,
  maxParameters = 30,
}: {
  value: ToolValue[];
  onChange: (value: ToolValue[]) => void;
  max?: number;
  maxParameters?: number;
}) {
  const tools = value.length ? value : [newTool()];
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  function updateTool(index: number, patch: Partial<ToolValue>) {
    onChange(tools.map((tool, position) => (position === index ? { ...tool, ...patch } : tool)));
  }

  function updateParameter(toolIndex: number, paramIndex: number, patch: Partial<ParameterValue>) {
    const parameters = (tools[toolIndex]?.parameters ?? []).map((parameter, position) =>
      position === paramIndex ? { ...parameter, ...patch } : parameter,
    );
    updateTool(toolIndex, { parameters });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {tools.map((tool, index) => {
        const parameters = tool.parameters ?? [];
        const isCollapsed = collapsed[index] ?? false;

        return (
          <div key={index} className="rounded-md border border-line bg-surface-2/40">
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setCollapsed({ ...collapsed, [index]: !isCollapsed })}
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? "Expand" : "Collapse"} tool ${index + 1}`}
                className="text-fg-muted transition-colors hover:text-fg"
              >
                <ChevronDownIcon
                  className={cn("size-3.5 transition-transform", isCollapsed && "-rotate-90")}
                  aria-hidden
                />
              </button>
              <span className="text-[11px] font-medium tracking-[0.05em] text-fg-muted uppercase">
                Tool {index + 1}
              </span>
              {isCollapsed && tool.name ? (
                <span className="truncate font-mono text-xs text-fg">{tool.name}</span>
              ) : null}
              <span className="ml-auto text-[11px] text-fg-muted">
                {parameters.length} {parameters.length === 1 ? "parameter" : "parameters"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={tools.length <= 1}
                aria-label={`Remove tool ${index + 1}`}
                onClick={() => onChange(tools.filter((_, position) => position !== index))}
              >
                <XIcon className="size-3" aria-hidden />
              </Button>
            </div>

            {isCollapsed ? null : (
              <div className="flex flex-col gap-2.5 border-t border-line px-3 py-2.5">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`tools.${index}.name`} className="text-xs">
                    Name
                  </Label>
                  <Input
                    id={`tools.${index}.name`}
                    value={tool.name ?? ""}
                    placeholder="search_docs"
                    onChange={(event) => updateTool(index, { name: event.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor={`tools.${index}.description`} className="text-xs">
                    Description
                  </Label>
                  <Textarea
                    id={`tools.${index}.description`}
                    rows={2}
                    value={tool.description ?? ""}
                    placeholder="Search the internal handbook and return matching passages."
                    onChange={(event) => updateTool(index, { description: event.target.value })}
                  />
                  <p className="text-[11px] text-fg-muted">
                    What the model selects on. A thin one produces a tool called at the wrong
                    moments, which reads as a model problem.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium tracking-[0.05em] text-fg-muted uppercase">
                    Parameters
                  </span>

                  {parameters.map((parameter, paramIndex) => (
                    <div
                      key={paramIndex}
                      className="grid items-center gap-2 sm:grid-cols-[minmax(0,7rem)_minmax(0,7rem)_minmax(0,1fr)_auto_auto]"
                    >
                      <Input
                        aria-label={`Parameter ${paramIndex + 1} name`}
                        value={parameter.name ?? ""}
                        placeholder="query"
                        onChange={(event) =>
                          updateParameter(index, paramIndex, { name: event.target.value })
                        }
                      />
                      <Select
                        value={parameter.type ?? "string"}
                        onValueChange={(next) => updateParameter(index, paramIndex, { type: next })}
                      >
                        <SelectTrigger aria-label={`Parameter ${paramIndex + 1} type`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        aria-label={`Parameter ${paramIndex + 1} description`}
                        value={parameter.description ?? ""}
                        placeholder="What to look for."
                        onChange={(event) =>
                          updateParameter(index, paramIndex, { description: event.target.value })
                        }
                      />
                      <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                        <Checkbox
                          checked={parameter.required ?? true}
                          aria-label={`Parameter ${paramIndex + 1} required`}
                          onCheckedChange={(checked) =>
                            updateParameter(index, paramIndex, { required: checked === true })
                          }
                        />
                        required
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        aria-label={`Remove parameter ${paramIndex + 1}`}
                        onClick={() =>
                          updateTool(index, {
                            parameters: parameters.filter((_, position) => position !== paramIndex),
                          })
                        }
                      >
                        <XIcon className="size-3" aria-hidden />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={parameters.length >= maxParameters}
                    onClick={() =>
                      updateTool(index, { parameters: [...parameters, newParameter()] })
                    }
                  >
                    <PlusIcon className="size-3" aria-hidden />
                    Add parameter
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={tools.length >= max}
        onClick={() => onChange([...tools, newTool()])}
      >
        <PlusIcon className="size-3" aria-hidden />
        Add tool
      </Button>
    </div>
  );
}
