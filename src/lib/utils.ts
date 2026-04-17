/**
 * Minimal className merge helper so we don't force tailwind-merge as a dep
 * in the package. Consumers that want real tailwind-merge behavior can
 * provide their own `cn` via wrapping components.
 *
 * Accepts strings, numbers, and falsy values; falsy values are dropped.
 */

type ClassValue = string | number | null | undefined | false | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input && input !== 0) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      out.push(String(input));
    }
  }
  return out.join(' ');
}
