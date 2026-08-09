/**
 * Handoff value hygiene.
 *
 * Pure and free of React so that both `<HandoffBar>` and the spec conformance
 * test can apply exactly the same transform. If the test built its payload a
 * different way it would be checking a payload the product never sends.
 */

/**
 * Drop keys a handoff declined to set.
 *
 * `{...defaults, ...values}` treats an explicit `undefined` as a value and
 * overwrites the destination's default with it, so a handoff meaning "I have
 * nothing for this field" lands the user on a form that fails validation
 * before they touch it. Stripping here lets a spec write
 * `x: something || undefined` and mean the obvious thing.
 */
export function omitUndefined(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}
