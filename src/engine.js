import { useMemo } from "react";

export const THIS_YEAR = 2026;

export const COMMON0 = {
  ret: 7, expg: 3, infl: 2.5, swr: 4, salecost: 0.5,
  alloc: { rule: "g110", fixed: 70, safe: 3, trough: 30, end: 65 },
  vol: 18, mcRuns: 1000,
};
export const ME0 = { name: "나", age: 34, asset: 12000, income: 7500, growth: 3, retireAge: 55, life: 100, irr: 800, pensionAge: 65, pension: 1200, exp: { now: 250, lean: 160, std: 250, fat: 480 } };
export const SPOUSE0 = { name: "배우자", age: 32, asset: 7000, income: 5500, growth: 3, retireAge: 55, life: 100, irr: 600, pensionAge: 65, pension: 900, exp: { now: 230, lean: 150, std: 230, fat: 420 } };
export const SOLO0 = { ...ME0, income: 6500, exp: { now: 280, lean: 190, std: 280, fat: 520 } };
export const ADV0 = {
  pension: { on: false },
  recession: { on: false, every: 8, drop: 25 },
  doomsday: { on: false, age: 60, drop: 40 },
  children: { on: false, list: [{ curAge: 3, indepAge: 25, cost: 1500 }] },
  lumps: { on: false, list: [{ age: 45, amount: 4000, label: "차량 교체" }] },
};

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function equityWeight(alloc, age, startAge, retireAge) {
  const al = alloc || { rule: "g110", safe: 3, fixed: 70, trough: 30, end: 65 };
  let w;
  if (al.rule === "fixed") w = al.fixed / 100;
  else if (al.rule === "rising") {
    const sW = clamp((110 - startAge) / 100, 0, 1);
    if (age < retireAge) {
      const f = retireAge > startAge ? (age - startAge) / (retireAge - startAge) : 1;
      w = sW + (al.trough / 100 - sW) * clamp(f, 0, 1);
    } else {
      const f = clamp((age - retireAge) / 15, 0, 1);
      w = al.trough / 100 + (al.end / 100 - al.trough / 100) * f;
    }
  } else {
    const base = { g100: 100, g110: 110, g120: 120 }[al.rule] || 110;
    w = (base - age) / 100;
  }
  return clamp(w, 0, 1);
}

export function useEngine(common, people, adv) {
  return useMemo(() => {
    const startAge = people[0].age;
    const endAge = people[0].life || 100;
    const years = endAge - startAge;
    const ret = common.ret / 100, expg = common.expg / 100, infl = common.infl / 100, swr = common.swr / 100, sc = common.salecost / 100;
    const safe = (common.alloc && common.alloc.safe != null ? common.alloc.safe : 3) / 100;
    const retA0 = people[0].retireAge;
    const isRec = (t) => adv.recession.on && t > 0 && adv.recession.every > 0 && t % adv.recession.every === 0;
    const eqW = (t) => equityWeight(common.alloc, startAge + t, startAge, retA0);
    const blended = (t) => { const w = eqW(t); const eq = isRec(t) ? -adv.recession.drop / 100 : ret; return w * eq + (1 - w) * safe; };

    function cashflow(tRet) {
      let asset = people.reduce((s, p) => s + (+p.asset || 0), 0);
      let depletedAt = null;
      const rows = [];
      for (let t = 0; t <= years; t++) {
        const age = startAge + t;
        let income = 0, pension = 0, expense = 0;
        people.forEach((p) => {
          const pa = p.age + t;
          const working = tRet != null ? t < tRet : pa < p.retireAge;
          if (working) income += p.income * Math.pow(1 + p.growth / 100, t);
          if (adv.pension.on && pa >= p.pensionAge) pension += p.pension * Math.pow(1 + infl, t);
          expense += (p.exp.now * 12 + p.irr) * Math.pow(1 + expg, t);
        });
        if (adv.children.on) adv.children.list.forEach((c) => { if (c.curAge + t < c.indepAge) expense += c.cost * Math.pow(1 + infl, t); });
        rows.push({ age, year: THIS_YEAR + t, income: Math.round(income), pension: Math.round(pension), expense: Math.round(expense), asset: asset < 0 ? null : Math.round(asset) });
        if (asset < 0 && depletedAt == null) depletedAt = age;
        const invest = asset > 0 ? asset * blended(t) : 0;
        const net = income + pension - expense;
        const saleCost = net < 0 ? -net * sc : 0;
        asset = asset + net + invest - saleCost;
        if (adv.lumps.on) adv.lumps.list.forEach((l) => { if (age === l.age) asset -= l.amount * Math.pow(1 + infl, t); });
        if (adv.doomsday.on && age === adv.doomsday.age) asset *= 1 - eqW(t) * adv.doomsday.drop / 100;
      }
      return { rows, depletedAt };
    }

    let earliest = null;
    for (let tr = 0; tr <= years; tr++) { if (cashflow(tr).depletedAt == null) { earliest = startAge + tr; break; } }
    const base = cashflow(null);

    function scope(which) {
      const hh = which === "hh";
      const ppl = hh ? people : [people[which]];
      const a0 = ppl.reduce((s, p) => s + (+p.asset || 0), 0);
      const leanA = ppl.reduce((s, p) => s + p.exp.lean * 12 + p.irr, 0);
      const stdA = ppl.reduce((s, p) => s + p.exp.std * 12 + p.irr, 0);
      const fatA = ppl.reduce((s, p) => s + p.exp.fat * 12 + p.irr, 0);
      const retA = people[0].retireAge;
      const nToRet = Math.max(retA - startAge, 0);
      const stdAtRet = (stdA * Math.pow(1 + expg, nToRet)) / swr;
      const coastNeedToday = stdAtRet / Math.pow(1 + ret, nToRet);
      let asset = a0;
      const cross = { coast: null, barista: null, lean: null, std: null, fat: null };
      const rows = [];
      for (let t = 0; t <= years; t++) {
        const age = startAge + t;
        const leanT = (leanA * Math.pow(1 + expg, t)) / swr;
        const stdT = (stdA * Math.pow(1 + expg, t)) / swr;
        const fatT = (fatA * Math.pow(1 + expg, t)) / swr;
        const barT = stdT * 0.5;
        const ytr = retA - age;
        const coastT = ytr > 0 ? stdAtRet / Math.pow(1 + ret, ytr) : stdT;
        if (cross.coast == null && asset >= coastT) cross.coast = age;
        if (cross.barista == null && asset >= barT) cross.barista = age;
        if (cross.lean == null && asset >= leanT) cross.lean = age;
        if (cross.std == null && asset >= stdT) cross.std = age;
        if (cross.fat == null && asset >= fatT) cross.fat = age;
        rows.push({ age, asset: asset > 0 ? Math.round(asset) : 0, lean: Math.round(leanT), std: Math.round(stdT), fat: Math.round(fatT) });
        let income = 0, expense = 0;
        ppl.forEach((p) => {
          const pa = p.age + t;
          if (pa < p.retireAge) income += p.income * Math.pow(1 + p.growth / 100, t);
          expense += (p.exp.now * 12 + p.irr) * Math.pow(1 + expg, t);
        });
        if (hh && adv.children.on) adv.children.list.forEach((c) => { if (c.curAge + t < c.indepAge) expense += c.cost * Math.pow(1 + infl, t); });
        const invest = asset > 0 ? asset * blended(t) : 0;
        const net = income - expense;
        const saleCost = net < 0 ? -net * sc : 0;
        asset = asset + net + invest - saleCost;
        if (hh && adv.lumps.on) adv.lumps.list.forEach((l) => { if (age === l.age) asset -= l.amount * Math.pow(1 + infl, t); });
        if (adv.doomsday.on && age === adv.doomsday.age) asset *= 1 - eqW(t) * adv.doomsday.drop / 100;
      }
      const today = { coast: coastNeedToday, barista: (stdA * 0.5) / swr, lean: leanA / swr, std: stdA / swr, fat: fatA / swr };
      return { rows, cross, today, asset0: a0 };
    }
    return { startAge, years, earliest, base, scope };
  }, [common, people, adv]);
}
