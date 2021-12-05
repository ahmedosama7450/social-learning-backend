import { MaybeNull } from "./types";

export const inProd = process.env.NODE_ENV === "production";

export function arraysEqual(a: unknown[], b: unknown[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  // TODO Performance Could be improved
  a.concat().sort();
  b.concat().sort();

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function nullableArrayEqual(
  a: MaybeNull<unknown[]>,
  b: MaybeNull<unknown[]>
) {
  if (a === null || b === null) {
    return a === b;
  }

  return arraysEqual(a, b);
}
