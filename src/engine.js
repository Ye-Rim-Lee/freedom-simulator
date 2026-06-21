import { useMemo, useState, useEffect } from "react";

export const THIS_YEAR = 2026;

export const COMMON0 = {
  ret: 7, expg: 3, infl: 2.5, swr: 4, salecost: 0.5,
  alloc: { rule: "g110", fixed: 70, safe: 3, trough: 30, end: 65 },
  vol: 18, mcRuns: 1000,
  tax: { on: true, equityGain: 5, pension: 5, healthInsRetired: 60 },
  fee: 0.5, swrAdjust: true,
  firePensionMode: false, // true면 FIRE 목표에서 예상 연금만큼 차감 → 필요자산 축소
};

// 국민연금 예상 연수령액 (만원). 단순 근사 — 30년 가입 시 평균소득의 40% 대체율을
// 기준으로 가입년수당 ±2%p 보정, 0.1~0.6에서 클램프. 2024년 상한 ≈ 월 260만(연 3120만)도 적용.
export function estimateNPSAnnual({ avgMonthlyIncomeMan, years }) {
  if (!avgMonthlyIncomeMan || !years) return 0;
  const replacement = Math.min(0.6, Math.max(0.1, 0.40 + (years - 30) * 0.02));
  const monthly = Math.min(260, avgMonthlyIncomeMan * replacement);
  return Math.round(monthly * 12);
}

// 퇴직연금 예상 연수령액 (만원). 매년 월급 1개월치 적립 → 연 수익률 복리 누적 →
// 60세부터 20년 분할 수령 가정. 단순화.
export function estimateRetirementPensionAnnual({ avgMonthlyIncomeMan, years, returnPct = 4, payoutYears = 20 }) {
  if (!avgMonthlyIncomeMan || !years) return 0;
  const r = returnPct / 100;
  let acc = 0;
  for (let i = 0; i < years; i++) acc = acc * (1 + r) + avgMonthlyIncomeMan;
  return Math.round(acc / payoutYears);
}

// 비현실 입력·논리 오류 경고. 결과를 막지 않고 표시만 한다.
export function validateInputs(common, people, adv) {
  const w = [];
  people.forEach((p, i) => {
    const who = people.length > 1 ? `${p.name}: ` : "";
    if (p.age < 0 || p.age > 120) w.push({ level: "error", msg: `${who}현재 나이(${p.age})가 비정상이에요.` });
    if (p.retireAge < p.age) w.push({ level: "warn", msg: `${who}정년(${p.retireAge}세)이 현재 나이(${p.age}세)보다 빨라요. 그래도 계산은 정년부터 은퇴로 처리해요.` });
    if (i === 0 && p.life <= p.retireAge) w.push({ level: "warn", msg: `${who}예상 수명(${p.life}세)이 정년(${p.retireAge}세) 이하예요. 은퇴 기간이 없으면 FIRE 의미가 사라져요.` });
    if (i === 0 && p.life > 120) w.push({ level: "warn", msg: `${who}예상 수명(${p.life}세)이 너무 길어요.` });
    if (p.asset < 0) w.push({ level: "warn", msg: `${who}현재 자산이 음수예요. 빚이라면 자산 0으로 두고 별도 고려하세요.` });
    if (p.income < 0) w.push({ level: "error", msg: `${who}소득이 음수예요.` });
    if (adv.pension.on && p.pensionAge < 50) w.push({ level: "warn", msg: `${who}연금 개시(${p.pensionAge}세)가 일반 수령 연령보다 일러요.` });
  });
  if (common.ret < 0) w.push({ level: "warn", msg: "위험자산 수익률이 음수예요." });
  if ((common.vol ?? 0) > 30) w.push({ level: "warn", msg: `변동성(${common.vol}%)이 비현실적으로 높아요. 일반 주식은 보통 15~20%입니다.` });
  if (common.swr > 5.5) w.push({ level: "warn", msg: `SWR(${common.swr}%)이 매우 높아요. 4% 룰을 크게 벗어나면 자산 고갈 위험이 커져요.` });
  if (adv.recession.on && adv.recession.every < 2) w.push({ level: "warn", msg: "침체 주기가 너무 짧아요(매 1~2년마다)." });
  if (adv.children.on) adv.children.list.forEach((c, i) => {
    if (c.indepAge <= c.curAge) w.push({ level: "warn", msg: `자녀 ${i + 1}: 독립 나이(${c.indepAge})가 현재 나이(${c.curAge}) 이하예요.` });
  });
  return w;
}

// 기간보정 SWR: 30년 기준 baseSwr, 길이 1년당 0.025%p 감소, [2.5, baseSwr]로 클램프.
export function adjustedSWR(baseSwrPct, retirementYears, on) {
  if (!on) return baseSwrPct;
  if (!isFinite(retirementYears) || retirementYears <= 0) return baseSwrPct;
  const delta = Math.max(0, retirementYears - 30) * 0.025;
  return Math.max(2.5, Math.min(baseSwrPct, baseSwrPct - delta));
}
export const ME0 = { name: "나", age: 34, asset: 12000, income: 7500, growth: 3, retireAge: 55, life: 100, irr: 800, pensionAge: 65, pension: 1200, exp: { now: 250, lean: 160, std: 250, fat: 480 } };
export const SPOUSE0 = { name: "배우자", age: 32, asset: 7000, income: 5500, growth: 3, retireAge: 55, life: 100, irr: 600, pensionAge: 65, pension: 900, exp: { now: 230, lean: 150, std: 230, fat: 420 } };
export const SOLO0 = { ...ME0, income: 6500, exp: { now: 280, lean: 190, std: 280, fat: 520 } };
export const ADV0 = {
  pension: { on: false },
  recession: { on: false, every: 8, drop: 25 },
  doomsday: { on: false, age: 60, drop: 40 },
  children: { on: false, list: [{ curAge: 3, indepAge: 25, cost: 1500 }] },
  lumps: { on: false, list: [{ age: 45, amount: 4000, label: "차량 교체" }] },
  retireExp: {
    on: false,
    slowAge: 70,   // slow-go 시작
    slowMult: 85,  // % — 활동기 대비 안정기 소비 (보통 80~90%)
    careAge: 85,   // no-go 시작 (간병기)
    careMult: 100, // % — 안정기 대비 간병기 소비 (의료비로 다시 ↑)
    careSpike: 2400, // 만원/년, 현재가치 — 가구 단위 간병비 추가
  },
  realEstate: {
    on: false,
    value: 50000,       // 현재 가치 (만원). 실거주 또는 전세보증금.
    growth: 1,          // 연 가치 상승률 (%). 한국 장기 ≈ 1~3%.
    downsize: { on: false, age: 70, sellRatio: 40 }, // 그 나이에 부동산 sellRatio%를 현금화→투자자산
    reverseMort: { on: false, startAge: 65, annual: 1200 }, // 주택연금: 그 나이부터 매년 annual(만원, 현재가치) 수령
  },
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
    const fee = (common.fee || 0) / 100;
    const tax = common.tax || { on: false, equityGain: 0, pension: 0, healthInsRetired: 0 };
    const taxEq = tax.on ? tax.equityGain / 100 : 0;
    const taxPen = tax.on ? tax.pension / 100 : 0;
    const taxHI = tax.on ? (tax.healthInsRetired || 0) : 0;
    const rx = adv.retireExp || { on: false };
    const rxOn = !!rx.on;
    const rxSlowMult = rxOn ? rx.slowMult / 100 : 1;
    const rxCareMult = rxOn ? rx.careMult / 100 : 1;
    const re = adv.realEstate || { on: false };
    const reGrowth = re.on ? (re.growth || 0) / 100 : 0;
    const reDsAge = re.on && re.downsize?.on ? re.downsize.age : null;
    const reDsRatio = re.on && re.downsize?.on ? (re.downsize.sellRatio || 0) / 100 : 0;
    const revOn = re.on && re.reverseMort?.on;
    const revStartAge = revOn ? re.reverseMort.startAge : null;
    const revAnnual = revOn ? (re.reverseMort.annual || 0) : 0;
    const retA0 = people[0].retireAge;
    const isRec = (t) => adv.recession.on && t > 0 && adv.recession.every > 0 && t % adv.recession.every === 0;
    const eqW = (t) => equityWeight(common.alloc, startAge + t, startAge, retA0);
    const blended = (t) => { const w = eqW(t); const eq = isRec(t) ? -adv.recession.drop / 100 : ret; return w * eq + (1 - w) * safe - fee; };

    function cashflow(tRet) {
      let asset = people.reduce((s, p) => s + (+p.asset || 0), 0);
      let reValue = re.on ? (+re.value || 0) : 0;
      let depletedAt = null;
      const rows = [];
      for (let t = 0; t <= years; t++) {
        const age = startAge + t;
        let income = 0, pension = 0, expense = 0, anyRetired = false, anyInCare = false;
        people.forEach((p) => {
          const pa = p.age + t;
          const working = tRet != null ? t < tRet : pa < p.retireAge;
          if (working) income += p.income * Math.pow(1 + p.growth / 100, t);
          if (!working) anyRetired = true;
          if (adv.pension.on && pa >= p.pensionAge) pension += p.pension * Math.pow(1 + infl, t);
          let mult = 1;
          if (rxOn && !working) {
            if (pa >= rx.careAge) { mult = rxCareMult; anyInCare = true; }
            else if (pa >= rx.slowAge) mult = rxSlowMult;
          }
          expense += (p.exp.now * 12 + p.irr) * Math.pow(1 + expg, t) * mult;
        });
        if (adv.children.on) adv.children.list.forEach((c) => { if (c.curAge + t < c.indepAge) expense += c.cost * Math.pow(1 + infl, t); });
        if (taxHI > 0 && anyRetired) expense += taxHI * Math.pow(1 + infl, t);
        if (rxOn && anyInCare && rx.careSpike) expense += rx.careSpike * Math.pow(1 + infl, t);
        if (revOn && age >= revStartAge) pension += revAnnual * Math.pow(1 + infl, t);
        const pensionNet = pension * (1 - taxPen);
        rows.push({ age, year: THIS_YEAR + t, income: Math.round(income), pension: Math.round(pensionNet), expense: Math.round(expense), asset: asset < 0 ? null : Math.round(asset), realEstate: re.on ? Math.round(reValue) : 0 });
        if (asset < 0 && depletedAt == null) depletedAt = age;
        const invest = asset > 0 ? asset * blended(t) : 0;
        const net = income + pensionNet - expense;
        const saleCost = net < 0 ? -net * (sc + taxEq) : 0;
        asset = asset + net + invest - saleCost;
        if (adv.lumps.on) adv.lumps.list.forEach((l) => { if (age === l.age) asset -= l.amount * Math.pow(1 + infl, t); });
        if (adv.doomsday.on && age === adv.doomsday.age) asset *= 1 - eqW(t) * adv.doomsday.drop / 100;
        // 다운사이징: 부동산 일부 매각 → 투자자산으로 (현재가치 기준 입력이라 무가공)
        if (reDsAge != null && age === reDsAge && reValue > 0) {
          const cashed = reValue * reDsRatio;
          asset += cashed;
          reValue -= cashed;
        }
        reValue *= 1 + reGrowth;
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
      // FIRE 목표에서 연금 차감 (현재가치 기준 단순 차감)
      const pensionAdj = common.firePensionMode
        ? (adv.pension.on ? ppl.reduce((s, p) => s + (p.pension || 0) * (1 - taxPen), 0) : 0)
          + (hh && revOn ? revAnnual : 0) // 주택연금은 가구 단위 1개
        : 0;
      const leanA = Math.max(0, ppl.reduce((s, p) => s + p.exp.lean * 12 + p.irr, 0) - pensionAdj);
      const stdA = Math.max(0, ppl.reduce((s, p) => s + p.exp.std * 12 + p.irr, 0) - pensionAdj);
      const fatA = Math.max(0, ppl.reduce((s, p) => s + p.exp.fat * 12 + p.irr, 0) - pensionAdj);
      const retA = people[0].retireAge;
      const nToRet = Math.max(retA - startAge, 0);
      const retirementYears = Math.max(0, endAge - retA);
      const swrEffPct = adjustedSWR(common.swr, retirementYears, !!common.swrAdjust);
      const swrEff = swrEffPct / 100;
      const stdAtRet = (stdA * Math.pow(1 + expg, nToRet)) / swrEff;
      const coastNeedToday = stdAtRet / Math.pow(1 + ret, nToRet);
      let asset = a0;
      const cross = { coast: null, barista: null, lean: null, std: null, fat: null };
      const rows = [];
      for (let t = 0; t <= years; t++) {
        const age = startAge + t;
        const leanT = (leanA * Math.pow(1 + expg, t)) / swrEff;
        const stdT = (stdA * Math.pow(1 + expg, t)) / swrEff;
        const fatT = (fatA * Math.pow(1 + expg, t)) / swrEff;
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
      const today = { coast: coastNeedToday, barista: (stdA * 0.5) / swrEff, lean: leanA / swrEff, std: stdA / swrEff, fat: fatA / swrEff };
      return { rows, cross, today, asset0: a0, swrEff: swrEffPct, retirementYears };
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
  const fee = (common.fee || 0) / 100;
  const tax = common.tax || { on: false, equityGain: 0, pension: 0, healthInsRetired: 0 };
  const taxEq = tax.on ? tax.equityGain / 100 : 0;
  const taxPen = tax.on ? tax.pension / 100 : 0;
  const taxHI = tax.on ? (tax.healthInsRetired || 0) : 0;
  const rx = adv.retireExp || { on: false };
  const rxOn = !!rx.on;
  const rxSlowMult = rxOn ? rx.slowMult / 100 : 1;
  const rxCareMult = rxOn ? rx.careMult / 100 : 1;
  const re = adv.realEstate || { on: false };
  const reGrowth = re.on ? (re.growth || 0) / 100 : 0;
  const reDsAge = re.on && re.downsize?.on ? re.downsize.age : null;
  const reDsRatio = re.on && re.downsize?.on ? (re.downsize.sellRatio || 0) / 100 : 0;
  const revOn = re.on && re.reverseMort?.on;
  const revStartAge = revOn ? re.reverseMort.startAge : null;
  const revAnnual = revOn ? (re.reverseMort.annual || 0) : 0;
  const retA0 = people[0].retireAge;

  let asset = people.reduce((s, p) => s + (+p.asset || 0), 0);
  let reValue = re.on ? (+re.value || 0) : 0;
  const path = new Array(years + 1);
  let depleted = false;

  for (let t = 0; t <= years; t++) {
    const age = startAge + t;
    path[t] = asset < 0 ? 0 : asset;
    if (asset < 0) depleted = true;

    let income = 0, pension = 0, expense = 0, anyRetired = false, anyInCare = false;
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      const pa = p.age + t;
      const working = tRet != null ? t < tRet : pa < p.retireAge;
      if (working) income += p.income * Math.pow(1 + p.growth / 100, t);
      if (!working) anyRetired = true;
      if (adv.pension.on && pa >= p.pensionAge) pension += p.pension * Math.pow(1 + infl, t);
      let mult = 1;
      if (rxOn && !working) {
        if (pa >= rx.careAge) { mult = rxCareMult; anyInCare = true; }
        else if (pa >= rx.slowAge) mult = rxSlowMult;
      }
      expense += (p.exp.now * 12 + p.irr) * Math.pow(1 + expg, t) * mult;
    }
    if (adv.children.on) for (const c of adv.children.list) if (c.curAge + t < c.indepAge) expense += c.cost * Math.pow(1 + infl, t);
    if (taxHI > 0 && anyRetired) expense += taxHI * Math.pow(1 + infl, t);
    if (rxOn && anyInCare && rx.careSpike) expense += rx.careSpike * Math.pow(1 + infl, t);
    if (revOn && age >= revStartAge) pension += revAnnual * Math.pow(1 + infl, t);

    const w = equityWeight(common.alloc, age, startAge, retA0);
    const eqR = retPath[t];
    const blended = w * eqR + (1 - w) * safe - fee;
    const invest = asset > 0 ? asset * blended : 0;
    const pensionNet = pension * (1 - taxPen);
    const net = income + pensionNet - expense;
    const saleCost = net < 0 ? -net * (sc + taxEq) : 0;
    asset = asset + net + invest - saleCost;
    if (adv.lumps.on) for (const l of adv.lumps.list) if (age === l.age) asset -= l.amount * Math.pow(1 + infl, t);
    if (adv.doomsday.on && age === adv.doomsday.age) asset *= 1 - w * adv.doomsday.drop / 100;
    if (reDsAge != null && age === reDsAge && reValue > 0) {
      const cashed = reValue * reDsRatio;
      asset += cashed;
      reValue -= cashed;
    }
    reValue *= 1 + reGrowth;
  }
  return { path, survived: !depleted };
}

// 평균치 결정론(변동성 0, 침체는 결정론적으로 적용)으로 가장 이른 은퇴 가능 나이.
function deterministicRetPath(common, adv, years) {
  const ret = common.ret / 100;
  const path = new Array(years + 1).fill(ret);
  if (adv.recession.on && adv.recession.every > 0) {
    for (let t = adv.recession.every; t <= years; t += adv.recession.every) path[t] = -adv.recession.drop / 100;
  }
  return path;
}
export function computeEarliestDet(common, people, adv) {
  const startAge = people[0].age;
  const years = (people[0].life || 100) - startAge;
  const retPath = deterministicRetPath(common, adv, years);
  for (let tr = 0; tr <= years; tr++) {
    if (simOnePath({ retPath, common, people, adv, tRet: tr }).survived) return startAge + tr;
  }
  return null;
}

// 매달 +X만원 더 모으면 은퇴를 몇 년 앞당기는지. 가장 작은 X 1개를 반환.
const NUDGE_STEPS = [10, 20, 30, 50, 80, 120, 200, 300, 500];
export function nudgeMonthlySavings(common, people, adv, currentEarliest) {
  if (currentEarliest == null) return null;
  for (const monthly of NUDGE_STEPS) {
    const boosted = people.map((p) => ({ ...p, income: p.income + monthly * 12 }));
    const e = computeEarliestDet(common, boosted, adv);
    if (e != null && currentEarliest - e >= 1) {
      return { monthly, yearsEarlier: currentEarliest - e };
    }
  }
  return null;
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
