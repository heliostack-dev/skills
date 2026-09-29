/** Join class names, skipping falsy values. The only styling helper the design system needs. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}
