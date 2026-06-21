import { useMemo, useState, useEffect } from "react";

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

/* ───────────── 몬테카를로 ─────────────
   매년 위험자산 수익률을 N(ret, vol)에서 추출. 안전자산은 그대로 deterministic.
   같은 시뮬 안에서 path를 공유한 채 tRet(은퇴까지 남은 햇수)을 0..years 탐색하여
   각 run의 "최소 생존 가능 tRet"을 구한다. 자산 path는 현재 계획(각자 retireAge)
   기준으로 기록해 백분위 밴드와 성공률을 산출.
*/

function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function quantile(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

// 한 path(ret 시계열)로 자산이 endAge까지 살아남는지·자산 경로를 시뮬레이션.
// tRet: 모든 사람이 t==tRet 시점부터 일을 멈춤(=== null이면 각자 retireAge 따라 자동).
function simOnePath({ retPath, common, people, adv, tRet }) {
  const startAge = people[0].age;
  const years = (people[0].life || 100) - startAge;
  const expg = common.expg / 100, infl = common.infl / 100, sc = common.salecost / 100;
  const safe = (common.alloc && common.alloc.safe != null ? common.alloc.safe : 3) / 100;
  const retA0 = people[0].retireAge;

  let asset = people.reduce((s, p) => s + (+p.asset || 0), 0);
  const path = new Array(years + 1);
  let depleted = false;

  for (let t = 0; t <= years; t++) {
    const age = startAge + t;
    path[t] = asset < 0 ? 0 : asset;
    if (asset < 0) depleted = true;

    let income = 0, pension = 0, expense = 0;
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      const pa = p.age + t;
      const working = tRet != null ? t < tRet : pa < p.retireAge;
      if (working) income += p.income * Math.pow(1 + p.growth / 100, t);
      if (adv.pension.on && pa >= p.pensionAge) pension += p.pension * Math.pow(1 + infl, t);
      expense += (p.exp.now * 12 + p.irr) * Math.pow(1 + expg, t);
    }
    if (adv.children.on) for (const c of adv.children.list) if (c.curAge + t < c.indepAge) expense += c.cost * Math.pow(1 + infl, t);

    const w = equityWeight(common.alloc, age, startAge, retA0);
    const eqR = retPath[t]; // 이미 N(ret, vol)에서 뽑은 값(0~1 단위)
    const blended = w * eqR + (1 - w) * safe;
    const invest = asset > 0 ? asset * blended : 0;
    const net = income + pension - expense;
    const saleCost = net < 0 ? -net * sc : 0;
    asset = asset + net + invest - saleCost;
    if (adv.lumps.on) for (const l of adv.lumps.list) if (age === l.age) asset -= l.amount * Math.pow(1 + infl, t);
    if (adv.doomsday.on && age === adv.doomsday.age) asset *= 1 - w * adv.doomsday.drop / 100;
  }
  return { path, survived: !depleted };
}

export function runMonteCarlo(common, people, adv, runs = 1000) {
  const startAge = people[0].age;
  const years = (people[0].life || 100) - startAge;
  const mu = common.ret / 100;
  const sigma = Math.max(0, (common.vol ?? 18) / 100);
  const recOn = adv.recession.on;
  const recEvery = adv.recession.every;
  const recDrop = adv.recession.drop;

  // (years+1) × runs 자산 경로 저장 (메모리: 1000런 × 70년 × 8B ≈ 0.6MB — OK)
  const assetMatrix = []; // assetMatrix[t][r]
  for (let t = 0; t <= years; t++) assetMatrix.push(new Float64Array(runs));
  let successCnt = 0;
  const minTRetPerRun = new Array(runs); // 각 run에서 살아남는 최소 tRet

  for (let r = 0; r < runs; r++) {
    // 한 run의 수익률 경로 공유
    const retPath = new Array(years + 1);
    for (let t = 0; t <= years; t++) {
      if (recOn && t > 0 && recEvery > 0 && t % recEvery === 0) {
        retPath[t] = -recDrop / 100;
      } else {
        retPath[t] = mu + sigma * gaussian();
      }
    }

    // 현재 계획(tRet=null) 시뮬 → 백분위 밴드·성공률
    const cur = simOnePath({ retPath, common, people, adv, tRet: null });
    for (let t = 0; t <= years; t++) assetMatrix[t][r] = cur.path[t];
    if (cur.survived) successCnt++;

    // 최소 생존 가능 tRet: 0..years 탐색.
    // 같은 path에서 working을 일찍 멈출수록 자산이 줄어드는 단조성이 있으므로 가장 이른 tRet만 찾으면 됨.
    let minT = null;
    let lo = 0, hi = years;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const ok = simOnePath({ retPath, common, people, adv, tRet: mid }).survived;
      if (ok) { minT = mid; hi = mid - 1; } else { lo = mid + 1; }
    }
    minTRetPerRun[r] = minT; // null이면 never-survive
  }

  // 백분위 밴드
  const bands = [];
  for (let t = 0; t <= years; t++) {
    const sorted = Array.from(assetMatrix[t]).sort((a, b) => a - b);
    bands.push({
      age: startAge + t,
      p10: Math.round(quantile(sorted, 0.1)),
      p50: Math.round(quantile(sorted, 0.5)),
      p90: Math.round(quantile(sorted, 0.9)),
    });
  }

  // 신뢰도별 가장 이른 은퇴 가능 나이
  // 각 tRet 후보 a에 대해 "그 run의 minT ≤ a"인 비율 = 성공률
  // (한 run에서 minT=k면, tRet ≥ k 모두 성공)
  const validMins = minTRetPerRun.map((m) => (m == null ? years + 999 : m));
  const sortedMins = validMins.slice().sort((a, b) => a - b);
  const ageAt = (conf) => {
    // 가장 작은 tRet a 중 P(minT ≤ a) ≥ conf 인 것
    // = sortedMins[ceil(conf * runs) - 1]
    const idx = Math.max(0, Math.ceil(conf * runs) - 1);
    const m = sortedMins[idx];
    return m > years ? null : startAge + m;
  };

  return {
    runs,
    startAge,
    years,
    successPct: successCnt / runs,
    bands,
    earliestByConfidence: {
      p50: ageAt(0.5),
      p75: ageAt(0.75),
      p85: ageAt(0.85),
      p95: ageAt(0.95),
    },
  };
}

// 무거운 계산을 입력 변화에 따라 디바운스해 실행.
export function useMonteCarlo(common, people, adv, { enabled = true, delayMs = 250 } = {}) {
  const [mc, setMc] = useState(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!enabled) { setMc(null); return; }
    setPending(true);
    const id = setTimeout(() => {
      const runs = Math.max(100, Math.min(5000, common.mcRuns || 1000));
      const result = runMonteCarlo(common, people, adv, runs);
      setMc(result);
      setPending(false);
    }, delayMs);
    return () => clearTimeout(id);
  }, [common, people, adv, enabled, delayMs]);
  return { mc, pending };
}
