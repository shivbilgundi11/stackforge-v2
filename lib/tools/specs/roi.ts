import { z } from "zod";

import type { ToolSpec } from "@/lib/tools/spec";

/**
 * WF5 — ROI and business case.
 *
 * The cleanest fit for the tool engine in the whole product: four forms, four
 * sets of metrics, no escape hatch. What makes this workflow work is not the
 * rendering but the *inbound* handoff — a cost figure the user already
 * produced in WF1 arrives pre-filled rather than being retyped from memory,
 * which is where the number usually gets rounded or misremembered.
 */

export const hoursSavedSpec: ToolSpec = {
  slug: "hours-saved",
  group: "roi",
  eyebrow: "WF5",
  title: "Hours Saved Calculator",
  summary: "Time reclaimed across a team, priced at fully-loaded cost.",
  keywords: ["productivity", "fte", "time", "savings", "headcount"],
  endpoint: "/api/v1/tools/roi/hours-saved",
  tier: "free",
  input: z.object({
    affected_users: z.number().int().min(1).max(1_000_000),
    hours_saved_per_user_per_week: z.number().min(0.1).max(168),
    fully_loaded_hourly_cost: z.number().min(1).max(10_000),
    adoption_rate_pct: z.number().min(1).max(100).optional(),
    error_rate_reduction_pct: z.number().min(0).max(100).optional(),
    rework_hours_per_month: z.number().min(0).max(100_000).optional(),
  }),
  defaults: {
    affected_users: 25,
    hours_saved_per_user_per_week: 3,
    fully_loaded_hourly_cost: 95,
    adoption_rate_pct: 70,
    error_rate_reduction_pct: 0,
    rework_hours_per_month: 0,
  },
  presets: [
    {
      label: "Support team",
      description: "High volume, moderate per-person saving",
      values: { affected_users: 40, hours_saved_per_user_per_week: 4, adoption_rate_pct: 80 },
    },
    {
      label: "Engineering",
      description: "Fewer people, higher loaded cost",
      values: {
        affected_users: 12,
        hours_saved_per_user_per_week: 5,
        fully_loaded_hourly_cost: 140,
        adoption_rate_pct: 60,
      },
    },
  ],
  fields: [
    { kind: "number", name: "affected_users", label: "Affected users", span: 6, min: 1 },
    {
      kind: "number",
      name: "hours_saved_per_user_per_week",
      label: "Hours saved",
      unit: "/user/wk",
      span: 6,
      min: 0.1,
      step: 0.5,
    },
    {
      kind: "currency",
      name: "fully_loaded_hourly_cost",
      label: "Fully-loaded rate",
      unit: "/hr",
      span: 6,
      min: 1,
      description:
        "Salary plus benefits, overhead, and equipment — usually 1.25-1.4x base. A case built on the base rate understates itself and is easy to dismiss.",
    },
    {
      kind: "slider",
      name: "adoption_rate_pct",
      label: "Adoption",
      span: 6,
      min: 1,
      max: 100,
      step: 5,
      unit: "%",
      description: "Share of affected users actually using it.",
    },
    {
      kind: "number",
      name: "rework_hours_per_month",
      label: "Rework hours",
      unit: "/mo",
      span: 6,
      min: 0,
      description: "Time currently spent fixing errors. Optional.",
    },
    {
      kind: "slider",
      name: "error_rate_reduction_pct",
      label: "Error reduction",
      span: 6,
      min: 0,
      max: 100,
      step: 5,
      unit: "%",
      showWhen: (values) => Number(values["rework_hours_per_month"] ?? 0) > 0,
    },
  ],
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["monthly_value", "annual_value", "monthly_hours", "fte_equivalent"],
        emphasise: "annual_value",
        labels: { fte_equivalent: "FTE equivalent", monthly_hours: "Hours / month" },
      },
      { kind: "callout" },
      { kind: "table", key: "breakdown", title: "Where the value comes from" },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "model-roi",
      label: "Build the ROI case",
      description: "Carry this saving in as the current process cost.",
      values: ({ metrics }) => ({
        current_monthly_cost: Number(metrics.total_monthly_value ?? 0),
      }),
    },
  ],
  relatedTools: ["model-roi", "implementation-cost"],
};

export const modelRoiSpec: ToolSpec = {
  slug: "model-roi",
  group: "roi",
  eyebrow: "WF5",
  title: "AI Model ROI",
  summary: "Payback, twelve-month ROI, and NPV against a realistic adoption ramp.",
  keywords: ["roi", "payback", "npv", "business case", "savings", "cfo"],
  endpoint: "/api/v1/tools/roi/model-roi",
  tier: "free",
  input: z.object({
    current_monthly_cost: z.number().min(0).max(100_000_000),
    ai_monthly_cost: z.number().min(0).max(100_000_000),
    implementation_cost: z.number().min(0).max(100_000_000),
    adoption_ramp_months: z.number().int().min(1).max(36),
    horizon_months: z.number().int().min(6).max(120).optional(),
    discount_rate_pct: z.number().min(0).max(50).optional(),
  }),
  defaults: {
    current_monthly_cost: 12_000,
    ai_monthly_cost: 2_500,
    implementation_cost: 40_000,
    adoption_ramp_months: 6,
    horizon_months: 36,
    discount_rate_pct: 10,
  },
  fields: [
    {
      kind: "currency",
      name: "current_monthly_cost",
      label: "Current process cost",
      unit: "/mo",
      span: 6,
      min: 0,
    },
    {
      kind: "currency",
      name: "ai_monthly_cost",
      label: "AI running cost",
      unit: "/mo",
      span: 6,
      min: 0,
      description: "Paid in full from month one, whether or not rollout has finished.",
    },
    {
      kind: "currency",
      name: "implementation_cost",
      label: "Implementation",
      unit: "one-off",
      span: 6,
      min: 0,
    },
    {
      kind: "slider",
      name: "adoption_ramp_months",
      label: "Adoption ramp",
      span: 6,
      min: 1,
      max: 18,
      step: 1,
      format: (value) => (value === 1 ? "instant" : `${value} months`),
      description:
        "Months to full utilisation. Assuming instant adoption is the single most common flaw in an AI business case, and the reason finance reviewers discount them.",
    },
    {
      kind: "slider",
      name: "horizon_months",
      label: "Horizon",
      span: 6,
      min: 12,
      max: 60,
      step: 6,
      format: (value) => `${value} months`,
    },
    {
      kind: "slider",
      name: "discount_rate_pct",
      label: "Discount rate",
      span: 6,
      min: 0,
      max: 25,
      step: 1,
      unit: "%",
      description: "Annual, applied monthly. Zero gives the undiscounted total.",
    },
  ],
  submitLabel: "Build the case",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["payback_months", "roi_12m_pct", "npv", "year_one_net"],
        emphasise: "payback_months",
        labels: {
          payback_months: "Payback",
          roi_12m_pct: "12-month ROI",
          npv: "NPV",
          year_one_net: "Year-one net",
        },
      },
      { kind: "callout" },
      {
        kind: "chart",
        key: "cash_flow",
        chart: "line",
        x: "month",
        y: "cumulative",
        title: "Cumulative cash flow",
        format: "currency",
      },
      {
        kind: "table",
        key: "assumptions",
        title: "Stated assumptions",
        description:
          "Exported with the case. A business case whose assumptions are invisible gets challenged and discarded.",
      },
      { kind: "code", artifact: "business-case", title: "Business case" },
      { kind: "json" },
    ],
  },
  relatedTools: ["implementation-cost", "hours-saved", "roi-build-vs-buy"],
};

export const implementationCostSpec: ToolSpec = {
  slug: "implementation-cost",
  group: "roi",
  eyebrow: "WF5",
  title: "Implementation Cost",
  summary: "Effort by role, infrastructure, training, and the contingency you will use.",
  keywords: ["implementation", "effort", "contingency", "burn", "project"],
  endpoint: "/api/v1/tools/roi/implementation-cost",
  tier: "free",
  input: z.object({
    roles: z
      .array(
        z.object({
          name: z.string().min(1).max(80),
          hours: z.number().int().min(0).max(200_000),
          hourly_rate: z.number().min(1).max(10_000),
        }),
      )
      .min(1, "Add at least one role.")
      .max(15),
    duration_months: z.number().min(1).max(60),
    infrastructure_setup: z.number().min(0).optional(),
    licences: z.number().min(0).optional(),
    training: z.number().min(0).optional(),
    contingency_pct: z.number().min(0).max(100).optional(),
    ongoing_monthly: z.number().min(0).optional(),
  }),
  defaults: {
    roles: [
      { name: "Senior engineer", hours: 320, hourly_rate: 140 },
      { name: "ML engineer", hours: 200, hourly_rate: 160 },
    ],
    duration_months: 3,
    infrastructure_setup: 4_000,
    licences: 0,
    training: 3_000,
    contingency_pct: 15,
    ongoing_monthly: 0,
  },
  fields: [
    {
      kind: "repeater",
      name: "roles",
      label: "Team",
      itemLabel: "Role",
      min: 1,
      max: 8,
      newItem: () => ({ name: "", hours: 100, hourly_rate: 120 }),
      fields: [
        { kind: "text", name: "name", label: "Role", span: 12, placeholder: "Backend engineer" },
        { kind: "number", name: "hours", label: "Hours", span: 6, min: 0 },
        { kind: "currency", name: "hourly_rate", label: "Rate", unit: "/hr", span: 6, min: 1 },
      ],
    },
    { kind: "number", name: "duration_months", label: "Duration", unit: "months", span: 6, min: 1 },
    {
      kind: "slider",
      name: "contingency_pct",
      label: "Contingency",
      span: 6,
      min: 0,
      max: 50,
      step: 5,
      unit: "%",
      description: "Integration and data work are where these overrun.",
    },
    {
      kind: "currency",
      name: "infrastructure_setup",
      label: "Infrastructure",
      span: 4,
      min: 0,
    },
    { kind: "currency", name: "licences", label: "Licences", span: 4, min: 0 },
    { kind: "currency", name: "training", label: "Training", span: 4, min: 0 },
    {
      kind: "currency",
      name: "ongoing_monthly",
      label: "Ongoing run cost",
      unit: "/mo",
      span: 6,
      min: 0,
      description: "Carried into the ROI case as the AI running cost.",
    },
  ],
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["total_cost", "labour_cost", "contingency", "monthly_burn"],
        emphasise: "total_cost",
      },
      { kind: "callout" },
      {
        kind: "chart",
        key: "burn",
        chart: "area",
        x: "month",
        y: "cumulative",
        title: "Burn",
        format: "currency",
      },
      { kind: "table", key: "phases", title: "Cost breakdown" },
      { kind: "table", key: "roles", title: "Effort by role" },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "model-roi",
      label: "Use in the ROI case",
      description: "Carry the total in as implementation cost, and the run cost with it.",
      values: ({ metrics }) => ({
        implementation_cost: Number(metrics.total_cost ?? 0),
        ai_monthly_cost: Number(metrics.ongoing_monthly ?? 0) || undefined,
      }),
    },
    {
      to: "roi-build-vs-buy",
      label: "Weigh against buying",
      description: "Carry the build effort into a full TCO comparison.",
      values: ({ input }) => {
        // Sum the role hours: build-vs-buy models one blended effort figure,
        // and the blended rate follows from the same rows rather than being
        // asked for twice.
        const roles = (input.roles ?? []) as { hours?: number; hourly_rate?: number }[];
        const hours = roles.reduce((total, role) => total + Number(role.hours ?? 0), 0);
        const cost = roles.reduce(
          (total, role) => total + Number(role.hours ?? 0) * Number(role.hourly_rate ?? 0),
          0,
        );
        return {
          build_hours: hours || undefined,
          blended_hourly_rate: hours > 0 ? Math.round(cost / hours) : undefined,
        };
      },
    },
  ],
  relatedTools: ["model-roi", "roi-build-vs-buy"],
};

export const roiBuildVsBuySpec: ToolSpec = {
  slug: "roi-build-vs-buy",
  path: "build-vs-buy",
  group: "roi",
  eyebrow: "WF5",
  title: "Build vs Buy TCO",
  summary: "Full financial model with maintenance drag, vendor escalation, and a break-even month.",
  keywords: ["tco", "build", "buy", "vendor", "maintenance", "escalation"],
  endpoint: "/api/v1/tools/roi/build-vs-buy",
  tier: "free",
  input: z.object({
    build_hours: z.number().int().min(1).max(200_000),
    blended_hourly_rate: z.number().min(1).max(10_000),
    build_infra_monthly: z.number().min(0).optional(),
    maintenance_pct_of_build_annual: z.number().min(0).max(200).optional(),
    vendor_monthly: z.number().min(0).max(10_000_000),
    vendor_integration_hours: z.number().int().min(0).max(50_000).optional(),
    vendor_escalation_pct_annual: z.number().min(0).max(50).optional(),
    build_months_to_value: z.number().int().min(0).max(60).optional(),
    buy_months_to_value: z.number().int().min(0).max(60).optional(),
  }),
  defaults: {
    build_hours: 600,
    blended_hourly_rate: 120,
    build_infra_monthly: 300,
    maintenance_pct_of_build_annual: 20,
    vendor_monthly: 2_500,
    vendor_integration_hours: 80,
    vendor_escalation_pct_annual: 5,
    build_months_to_value: 6,
    buy_months_to_value: 1,
  },
  fields: [
    { kind: "number", name: "build_hours", label: "Build effort", unit: "hours", span: 6, min: 1 },
    {
      kind: "currency",
      name: "blended_hourly_rate",
      label: "Blended rate",
      unit: "/hr",
      span: 6,
      min: 1,
    },
    {
      kind: "slider",
      name: "maintenance_pct_of_build_annual",
      label: "Annual maintenance",
      span: 6,
      min: 0,
      max: 60,
      step: 5,
      unit: "%",
      description: "Of the original build cost, per year. 15-25% is typical and rarely budgeted.",
    },
    {
      kind: "currency",
      name: "build_infra_monthly",
      label: "Build infrastructure",
      unit: "/mo",
      span: 6,
      min: 0,
    },
    {
      kind: "currency",
      name: "vendor_monthly",
      label: "Vendor subscription",
      unit: "/mo",
      span: 6,
      min: 0,
    },
    {
      kind: "number",
      name: "vendor_integration_hours",
      label: "Integration effort",
      unit: "hours",
      span: 6,
      min: 0,
    },
    {
      kind: "slider",
      name: "vendor_escalation_pct_annual",
      label: "Price escalation",
      span: 6,
      min: 0,
      max: 20,
      step: 1,
      unit: "%",
      description: "Annual uplift in the contract. Zero assumes the price never moves.",
    },
    {
      kind: "number",
      name: "build_months_to_value",
      label: "Build time to value",
      unit: "months",
      span: 6,
      min: 0,
    },
  ],
  submitLabel: "Model both paths",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["recommendation", "break_even_month", "build_tco_36m", "buy_tco_36m"],
        emphasise: "recommendation",
        labels: {
          recommendation: "Recommendation",
          break_even_month: "Build overtakes buy",
          build_tco_36m: "Build · 36mo",
          buy_tco_36m: "Buy · 36mo",
        },
      },
      { kind: "callout" },
      {
        kind: "chart",
        key: "crossover",
        chart: "line",
        x: "month",
        y: ["build", "buy"],
        title: "Cumulative cost",
        format: "currency",
      },
      { kind: "table", key: "tco", title: "Total cost of ownership" },
      {
        kind: "table",
        key: "sensitivity",
        title: "If the estimate is wrong",
        description:
          "Build hours and blended rates are guesses. The answer often flips inside their plausible range.",
      },
      { kind: "json" },
    ],
  },
  relatedTools: ["implementation-cost", "model-roi", "compare-build-vs-buy"],
};

export const ROI_SPECS = [modelRoiSpec, roiBuildVsBuySpec, hoursSavedSpec, implementationCostSpec];
