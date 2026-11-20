import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };
export const D = (v: Decimal.Value) => new Decimal(v);
export const r2 = (v: Decimal.Value) => new Decimal(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
export const r3 = (v: Decimal.Value) => new Decimal(v).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
export const r6 = (v: Decimal.Value) => new Decimal(v).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);

/** Split `total` across `weights` in 2-decimal amounts that add back to exactly `total` (largest remainder). */
export function allocate(total: Decimal.Value, weights: Decimal.Value[]): Decimal[] {
  const t = r2(total);
  const w = weights.map((x) => D(x));
  const sum = w.reduce((a, b) => a.plus(b), D(0));
  if (w.length === 0) return [];
  if (sum.isZero()) {
    const even = t.div(w.length).toDecimalPlaces(2, Decimal.ROUND_DOWN);
    const out = w.map(() => even);
    out[0] = out[0].plus(t.minus(even.times(w.length)));
    return out;
  }
  const raw = w.map((x) => t.times(x).div(sum));
  const floor = raw.map((x) => x.toDecimalPlaces(2, Decimal.ROUND_DOWN));
  let leftover = t.minus(floor.reduce((a, b) => a.plus(b), D(0)));
  const order = raw
    .map((x, i) => ({ i, frac: x.minus(floor[i]) }))
    .sort((a, b) => b.frac.comparedTo(a.frac) || a.i - b.i);
  const cent = D("0.01");
  for (let k = 0; leftover.gt(0) && k < order.length; k++) {
    floor[order[k].i] = floor[order[k].i].plus(cent);
    leftover = leftover.minus(cent);
  }
  return floor;
}
