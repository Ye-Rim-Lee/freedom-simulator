import React, { useState, useMemo, useEffect } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import {
  Users, User, ChevronLeft, Sliders, BarChart3, Table2, Sparkles, TrendingUp,
  Settings2, Share2, Plus, X, Copy, Check,
} from "lucide-react";
import { won, yAxisFmt } from "./format.js";
import {
  COMMON0, ME0, SPOUSE0, SOLO0, ADV0,
  equityWeight, useEngine,
} from "./engine.js";

/* ───────────── 공용 컴포넌트 ───────────── */
function Num({ label, value, onChange, unit, step = 1 }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-slate-500 mb-1">{label}</span>
      <div className="flex items-center rounded-lg bg-amber-50 ring-1 ring-amber-200 focus-within:ring-2 focus-within:ring-emerald-400 transition">
        <input type="number" step={step} value={value}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="w-full bg-transparent px-2.5 py-2 text-sm text-slate-900 tabular-nums outline-none" />
        {unit && <span className="pr-2.5 text-[11px] text-slate-400 whitespace-nowrap">{unit}</span>}
      </div>
    </label>
  );
}
function Slide({ label, value, onChange, min, max, step, unit }) {
  return (
    <label className="block">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
        <span className="text-sm font-semibold text-emerald-700 tabular-nums">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-emerald-600" />
    </label>
  );
}
function Card({ title, accent, children, icon: Icon }) {
  return (
    <section className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
      {title && (
        <h3 className="text-xs font-bold tracking-wide mb-3 flex items-center gap-1.5" style={{ color: accent || "#0f172a" }}>
          {Icon ? <Icon size={14} /> : <span className="inline-block w-1 h-3.5 rounded-full" style={{ background: accent || "#0f172a" }} />}
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
function Toggle({ on, onChange, label, accent = "#059669" }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center justify-between w-full">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="w-10 h-6 rounded-full p-0.5 transition shrink-0" style={{ background: on ? accent : "#cbd5e1" }}>
        <span className="block w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: on ? "translateX(16px)" : "none" }} />
      </span>
    </button>
  );
}
function MiniInput({ value, onChange, type = "number", w }) {
  return (
    <input type={type} value={value}
      onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value)}
      className={`${w || "w-full"} rounded-lg bg-amber-50 ring-1 ring-amber-200 px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-2 focus:ring-emerald-400`} />
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-slate-500 mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-amber-50 ring-1 ring-amber-200 px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

/* ───────────── 모드 선택 ───────────── */
function ModeSelect({ onPick }) {
  const opt = (mode, Icon, title, sub, accent) => (
    <button onClick={() => onPick(mode)}
      className="group flex-1 rounded-3xl bg-white ring-1 ring-slate-200 p-7 text-left shadow-sm hover:shadow-md hover:ring-2 transition"
      style={{ "--tw-ring-color": accent }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition group-hover:scale-105" style={{ background: accent + "1a", color: accent }}>
        <Icon size={24} />
      </div>
      <div className="text-lg font-bold text-slate-900">{title}</div>
      <div className="text-sm text-slate-500 mt-1 leading-relaxed">{sub}</div>
      <div className="mt-4 text-xs font-semibold" style={{ color: accent }}>시작하기 →</div>
    </button>
  );
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-slate-50">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-semibold bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-3 py-1 mb-4">
            <Sparkles size={13} /> 경제적 자유 시뮬레이터
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">몇 살에 자유로워질까?</h1>
          <p className="text-slate-500 mt-2.5 text-sm leading-relaxed">소득·소비·자산을 넣으면 은퇴 가능 나이와<br />FIRE 단계별 도달 시점을 계산해요.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {opt("single", User, "싱글 모드", "혼자 기준으로 계산해요.", "#4f46e5")}
          {opt("couple", Users, "부부 모드", "두 사람 합산·개인 기준 모두 봐요.", "#059669")}
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-8">모든 금액 단위는 만원 · 링크로 시나리오를 공유할 수 있어요.</p>
      </div>
    </div>
  );
}

/* ───────────── FIRE 사다리 ───────────── */
const LADDER = [
  { key: "coast", name: "Coast FIRE", desc: "더 안 모아도 은퇴나이에 도달" },
  { key: "barista", name: "Barista FIRE", desc: "생활비 절반을 자산으로 충당" },
  { key: "lean", name: "Lean FIRE", desc: "검소하게 조기은퇴" },
  { key: "std", name: "Standard FIRE", desc: "현재 수준 유지 은퇴" },
  { key: "fat", name: "Fat FIRE", desc: "여유로운 은퇴" },
];
function Ladder({ data }) {
  return (
    <div className="space-y-2.5">
      {LADDER.map((l) => {
        const age = data.cross[l.key];
        const need = data.today[l.key];
        const pct = need > 0 ? data.asset0 / need : 0;
        const achieved = pct >= 1;
        return (
          <div key={l.key} className="rounded-xl ring-1 ring-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-bold text-slate-900">{l.name}</div>
                <div className="text-[11px] text-slate-400">{l.desc}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold tabular-nums" style={{ color: age == null ? "#94a3b8" : "#4f46e5" }}>{age == null ? "100세+" : `${age}세`}</div>
                <div className="text-[11px] text-slate-400 tabular-nums">필요 {won(need)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct * 100, 100)}%`, background: achieved ? "#059669" : "#6366f1" }} />
              </div>
              <span className="text-[11px] font-semibold tabular-nums w-10 text-right" style={{ color: achieved ? "#059669" : "#64748b" }}>{(pct * 100).toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── 결과 ───────────── */
function Results({ eng, mode, people }) {
  const [goal, setGoal] = useState("retire");
  const [sc, setSc] = useState("hh");
  const scopeData = eng.scope(mode === "single" ? 0 : sc);
  const seg = (v, label, cur, set, accent) => (
    <button onClick={() => set(v)} className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition" style={cur === v ? { background: accent, color: "#fff" } : { color: "#64748b" }}>{label}</button>
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
        {seg("retire", "일반 은퇴", goal, setGoal, "#059669")}
        {seg("fire", "단계별 FIRE", goal, setGoal, "#4f46e5")}
      </div>
      {goal === "retire" ? (
        <>
          <Card>
            <div className="text-xs font-medium text-slate-500">예상 은퇴 가능 나이</div>
            {eng.earliest != null ? (
              <div className="mt-1">
                <span className="text-5xl font-extrabold text-emerald-600 tabular-nums">{eng.earliest}</span>
                <span className="text-2xl font-bold text-emerald-600">세</span>
                <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
                  이 나이에 일을 멈춰도 자산이 <b>{eng.startAge + eng.years}세</b>까지 마르지 않아요.
                  {eng.base.depletedAt ? ` 단, 지금 입력한 정년대로면 ${eng.base.depletedAt}세에 자산이 고갈돼요.` : " 지금 입력한 은퇴 계획으로도 자산은 마르지 않아요."}
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">현재 조건으로는 100세까지 자산을 유지하기 어려워요. 소비를 줄이거나 소득·수익률을 높여보세요.</p>
            )}
          </Card>
          <Card title="자산 추이 (현재 은퇴 계획 기준)" accent="#059669">
            <RetireChart eng={eng} />
            <p className="text-[11px] text-slate-400 mt-2">초록 점선 = 은퇴 가능 나이 · 빨강 = 고갈 시점 · 곡선의 출렁임은 침체/둠스데이 반영</p>
          </Card>
        </>
      ) : (
        <>
          {mode === "couple" && (
            <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
              {seg("hh", "가구", sc, setSc, "#4f46e5")}
              {seg(0, people[0].name, sc, setSc, "#4f46e5")}
              {seg(1, people[1].name, sc, setSc, "#4f46e5")}
            </div>
          )}
          <Card title="단계별 도달 나이 · 현재 달성률" accent="#4f46e5">
            <Ladder data={scopeData} />
            <p className="text-[11px] text-slate-400 mt-3">막대 = 현재 자산이 각 단계 필요자산의 몇 %인지 (현재가치). 연금은 일반 은퇴에만 반영돼요.</p>
          </Card>
          <Card title="자산 vs FIRE 목표선" accent="#4f46e5">
            <FireChart rows={scopeData.rows} />
            <p className="text-[11px] text-slate-400 mt-2">자산 곡선이 각 목표선을 넘는 나이가 도달 시점이에요.</p>
          </Card>
        </>
      )}
    </div>
  );
}
function RetireChart({ eng }) {
  const data = eng.base.rows.map((r) => ({ age: r.age, 자산: r.asset }));
  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={9} />
        <YAxis tickFormatter={yAxisFmt} tick={{ fontSize: 11, fill: "#94a3b8" }} width={38} />
        <Tooltip formatter={(v) => [won(v), "자산"]} labelFormatter={(l) => `${l}세`} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
        <Area type="monotone" dataKey="자산" stroke="#059669" strokeWidth={2.5} fill="url(#g1)" connectNulls={false} />
        {eng.earliest != null && <ReferenceLine x={eng.earliest} stroke="#059669" strokeDasharray="4 3" label={{ value: "자유", fontSize: 10, fill: "#059669", position: "top" }} />}
        {eng.base.depletedAt && <ReferenceLine x={eng.base.depletedAt} stroke="#dc2626" strokeDasharray="4 3" label={{ value: "고갈", fontSize: 10, fill: "#dc2626", position: "top" }} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
function FireChart({ rows }) {
  const data = rows.filter((r) => r.age <= 90);
  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={9} />
        <YAxis tickFormatter={yAxisFmt} tick={{ fontSize: 11, fill: "#94a3b8" }} width={38} />
        <Tooltip formatter={(v, n) => [won(v), n]} labelFormatter={(l) => `${l}세`} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="asset" name="내 자산" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="lean" name="Lean" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        <Line type="monotone" dataKey="std" name="Standard" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        <Line type="monotone" dataKey="fat" name="Fat" stroke="#ec4899" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ───────────── 연도별 표 ───────────── */
function YearTable({ eng, hasPension }) {
  return (
    <Card title={`연도별 자산 (${eng.startAge + eng.years}세까지)`} accent="#0f172a">
      <div className="overflow-auto max-h-[60vh] -mx-1">
        <table className="w-full text-[12px] tabular-nums">
          <thead className="sticky top-0 bg-white">
            <tr className="text-slate-400 text-left border-b border-slate-200">
              <th className="py-1.5 px-1 font-medium">나이</th>
              <th className="py-1.5 px-1 font-medium text-right">소득</th>
              {hasPension && <th className="py-1.5 px-1 font-medium text-right">연금</th>}
              <th className="py-1.5 px-1 font-medium text-right">소비</th>
              <th className="py-1.5 px-1 font-medium text-right">자산</th>
            </tr>
          </thead>
          <tbody>
            {eng.base.rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-50 ${r.asset == null ? "bg-red-50/40" : ""}`}>
                <td className="py-1.5 px-1 font-semibold text-slate-700">{r.age}</td>
                <td className="py-1.5 px-1 text-right text-slate-500">{r.income ? won(r.income) : "·"}</td>
                {hasPension && <td className="py-1.5 px-1 text-right text-slate-500">{r.pension ? won(r.pension) : "·"}</td>}
                <td className="py-1.5 px-1 text-right text-slate-500">{won(r.expense)}</td>
                <td className="py-1.5 px-1 text-right font-bold text-slate-900">{r.asset == null ? "—" : won(r.asset)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ───────────── 고급 옵션 ───────────── */
function Advanced({ adv, setAdv, people }) {
  const setP = (path, v) => setAdv((a) => ({ ...a, [path]: { ...a[path], ...v } }));
  const updItem = (path, i, key, v) => setAdv((a) => ({ ...a, [path]: { ...a[path], list: a[path].list.map((it, j) => (j === i ? { ...it, [key]: v } : it)) } }));
  const addItem = (path, item) => setAdv((a) => ({ ...a, [path]: { ...a[path], list: [...a[path].list, item] } }));
  const rmItem = (path, i) => setAdv((a) => ({ ...a, [path]: { ...a[path], list: a[path].list.filter((_, j) => j !== i) } }));
  const Block = ({ children }) => <div className="py-3 border-b border-slate-100 last:border-0">{children}</div>;
  const Hint = ({ children }) => <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{children}</p>;

  return (
    <Card title="고급 옵션" accent="#0f172a" icon={Settings2}>
      <Block>
        <Toggle on={adv.pension.on} onChange={(v) => setP("pension", { on: v })} label="국민·퇴직 연금" />
        {adv.pension.on && <Hint>켜면 입력 탭의 각 사람 카드에 '연금 개시·수령액' 칸이 생겨요. 연금은 일반 은퇴 계산에만 반영됩니다.</Hint>}
      </Block>

      <Block>
        <Toggle on={adv.recession.on} onChange={(v) => setP("recession", { on: v })} label="경기 침체 주기" accent="#d97706" />
        {adv.recession.on && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Num label="주기 (년마다)" value={adv.recession.every} onChange={(v) => setP("recession", { every: v })} unit="년" />
            <Num label="그 해 수익률" value={adv.recession.drop} onChange={(v) => setP("recession", { drop: v })} unit="-%" />
          </div>
        )}
        {adv.recession.on && <Hint>설정 주기마다 그 해 투자 수익률을 −{adv.recession.drop}%로 적용해 하락장을 반영해요.</Hint>}
      </Block>

      <Block>
        <Toggle on={adv.children.on} onChange={(v) => setP("children", { on: v })} label="자녀 양육" accent="#0ea5e9" />
        {adv.children.on && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1.2fr_auto] gap-2 text-[10px] text-slate-400 font-medium px-1">
              <span>현재 나이</span><span>독립 나이</span><span>연 양육비</span><span />
            </div>
            {adv.children.list.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1.2fr_auto] gap-2 items-center">
                <MiniInput value={c.curAge} onChange={(v) => updItem("children", i, "curAge", v)} />
                <MiniInput value={c.indepAge} onChange={(v) => updItem("children", i, "indepAge", v)} />
                <MiniInput value={c.cost} onChange={(v) => updItem("children", i, "cost", v)} />
                <button onClick={() => rmItem("children", i)} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
            <button onClick={() => addItem("children", { curAge: 0, indepAge: 25, cost: 1500 })}
              className="flex items-center gap-1 text-[12px] font-semibold text-sky-600 mt-1"><Plus size={14} /> 자녀 추가</button>
          </div>
        )}
        {adv.children.on && <Hint>독립 나이가 될 때까지 매년 양육비(만원)를 가구 소비에 더해요. 대학·결혼 목돈은 아래 '목돈 이벤트'로.</Hint>}
      </Block>

      <Block>
        <Toggle on={adv.lumps.on} onChange={(v) => setP("lumps", { on: v })} label="일회성 목돈 이벤트" accent="#7c3aed" />
        {adv.lumps.on && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2 text-[10px] text-slate-400 font-medium px-1">
              <span>내용</span><span>내 나이</span><span>금액</span><span />
            </div>
            {adv.lumps.list.map((l, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2 items-center">
                <MiniInput type="text" value={l.label} onChange={(v) => updItem("lumps", i, "label", v)} />
                <MiniInput value={l.age} onChange={(v) => updItem("lumps", i, "age", v)} />
                <MiniInput value={l.amount} onChange={(v) => updItem("lumps", i, "amount", v)} />
                <button onClick={() => rmItem("lumps", i)} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
            <button onClick={() => addItem("lumps", { age: 50, amount: 3000, label: "" })}
              className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 mt-1"><Plus size={14} /> 목돈 추가</button>
          </div>
        )}
        {adv.lumps.on && <Hint>차량 교체·대학 등록금·결혼·주택처럼 특정 나이에 한 번 빠지는 목돈(만원, 현재가치)이에요.</Hint>}
      </Block>

      <Block>
        <Toggle on={adv.doomsday.on} onChange={(v) => setP("doomsday", { on: v })} label="둠스데이 (스트레스 테스트)" accent="#dc2626" />
        {adv.doomsday.on && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Num label="발생 나이 (내)" value={adv.doomsday.age} onChange={(v) => setP("doomsday", { age: v })} unit="세" />
            <Num label="자산 충격" value={adv.doomsday.drop} onChange={(v) => setP("doomsday", { drop: v })} unit="-%" />
          </div>
        )}
        {adv.doomsday.on && <Hint>그 해에 자산이 한 번 −{adv.doomsday.drop}% 증발하는 최악의 상황에서도 버티는지 확인해요.</Hint>}
      </Block>
    </Card>
  );
}

/* ───────────── 자산 배분 카드 ───────────── */
function AllocCard({ common, setCommon, age, retireAge }) {
  const a = common.alloc;
  const set = (k, v) => setCommon("alloc", { ...a, [k]: v });
  const rules = [["g100", "100 − 나이 (보수적)"], ["g110", "110 − 나이 (표준)"], ["g120", "120 − 나이 (공격적)"], ["fixed", "고정 비중"], ["rising", "라이징 글라이드패스 (본드텐트)"]];
  const w = equityWeight(a, age, age, retireAge);
  const blended = w * common.ret + (1 - w) * a.safe;
  return (
    <Card title="자산 배분 · 위험자산 비중" accent="#0f172a" icon={Sliders}>
      <Select label="비중 규칙" value={a.rule} onChange={(v) => set("rule", v)} options={rules} />
      <div className="grid grid-cols-2 gap-3 mt-3">
        {a.rule === "fixed" && <Num label="위험자산 비중" value={a.fixed} onChange={(v) => set("fixed", v)} unit="%" />}
        {a.rule === "rising" && <Num label="저점 비중 (은퇴 무렵)" value={a.trough} onChange={(v) => set("trough", v)} unit="%" />}
        {a.rule === "rising" && <Num label="회복 목표 비중" value={a.end} onChange={(v) => set("end", v)} unit="%" />}
        <Num label="안전자산 수익률" value={a.safe} onChange={(v) => set("safe", v)} unit="%" />
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 p-2.5 text-[12px] text-slate-600">
        지금 ({age}세) 위험자산 <b className="text-slate-900">{Math.round(w * 100)}%</b> · 안전자산 {100 - Math.round(w * 100)}% → 블렌디드 기대수익 <b className="text-emerald-700">{blended.toFixed(1)}%</b>
      </div>
      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
        '100/110/120 − 나이'는 나이가 들수록 위험자산을 줄이는 고전 경험칙이에요. '라이징(본드텐트)'은 은퇴 직전·직후를 보수적으로 가고 이후 비중을 다시 높이는 Pfau·Kitces 연구 기반 전략이고요. 안전자산은 매년 '안전자산 수익률'로, 침체·둠스데이 충격은 위험자산 부분에만 적용돼요.
      </p>
    </Card>
  );
}

/* ───────────── 입력 ───────────── */
function Inputs({ common, setCommon, people, setPerson, setExp, adv, setAdv }) {
  const personCard = (p, idx, accent) => (
    <Card key={idx} title={p.name} accent={accent}>
      <div className="grid grid-cols-2 gap-3">
        <Num label="현재 나이" value={p.age} onChange={(v) => setPerson(idx, "age", v)} unit="세" />
        <Num label="현재 자산" value={p.asset} onChange={(v) => setPerson(idx, "asset", v)} unit="만원" />
        <Num label="연 소득 (세후)" value={p.income} onChange={(v) => setPerson(idx, "income", v)} unit="만원/년" />
        <Num label="연평균 수입 증가율" value={p.growth} onChange={(v) => setPerson(idx, "growth", v)} unit="%" />
        <Num label="예상 정년 (은퇴)" value={p.retireAge} onChange={(v) => setPerson(idx, "retireAge", v)} unit="세" />
        {idx === 0 && <Num label="예상 수명" value={p.life} onChange={(v) => setPerson(idx, "life", v)} unit="세" />}
        {adv.pension.on && <Num label="연금 개시" value={p.pensionAge} onChange={(v) => setPerson(idx, "pensionAge", v)} unit="세" />}
        {adv.pension.on && <Num label="연금 수령액" value={p.pension} onChange={(v) => setPerson(idx, "pension", v)} unit="만원/년" />}
      </div>
    </Card>
  );
  return (
    <div className="space-y-4">
      {people.map((p, i) => personCard(p, i, i === 0 ? "#4f46e5" : "#059669"))}
      <Card title="생활비 (만원, 현재가치)" accent="#0f172a">
        <div className="text-[11px] font-semibold text-slate-400 mb-2">월 생활비</div>
        <div className="grid gap-x-3 gap-y-2" style={{ gridTemplateColumns: `auto repeat(${people.length},1fr)` }}>
          <div />
          {people.map((p, i) => <div key={i} className="text-[11px] font-bold text-slate-500 text-center">{p.name}</div>)}
          {[["now", "현재"], ["lean", "Lean"], ["std", "Standard"], ["fat", "Fat"]].map(([k, lab]) => (
            <React.Fragment key={k}>
              <div className="text-[11px] font-medium text-slate-500 self-center">{lab}</div>
              {people.map((p, i) => <MiniInput key={i} value={p.exp[k]} onChange={(v) => setExp(i, k, v)} />)}
            </React.Fragment>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">현재=실제 지출 / Lean·Standard·Fat=각 FIRE 목표의 생활 수준</p>
        <div className="border-t border-slate-100 mt-3 pt-3">
          <div className="text-[11px] font-semibold text-slate-400 mb-2">연 비정기 지출 (만원/년)</div>
          <div className="grid gap-x-3 gap-y-2 items-center" style={{ gridTemplateColumns: `auto repeat(${people.length},1fr)` }}>
            <div className="text-[11px] font-medium text-slate-500">연 합계</div>
            {people.map((p, i) => <MiniInput key={i} value={p.irr} onChange={(v) => setPerson(i, "irr", v)} />)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">여행·차량 교체·의료·경조사·집수리처럼 매달은 아니지만 가끔 나가는 목돈의 1년 합계예요.</p>
        </div>
      </Card>
      <Card title="투자 · 경제 가정" accent="#0f172a">
        <div className="space-y-4">
          <Slide label="위험자산 수익률 (연)" value={common.ret} onChange={(v) => setCommon("ret", v)} min={0} max={15} step={0.5} unit="%" />
          <Slide label="생활비 증가율 (연)" value={common.expg} onChange={(v) => setCommon("expg", v)} min={0} max={8} step={0.1} unit="%" />
          <Slide label="물가상승률 (연)" value={common.infl} onChange={(v) => setCommon("infl", v)} min={0} max={6} step={0.1} unit="%" />
          <Slide label="인출률 SWR (연)" value={common.swr} onChange={(v) => setCommon("swr", v)} min={2.5} max={6} step={0.1} unit="%" />
          <Slide label="자산 매각비용" value={common.salecost} onChange={(v) => setCommon("salecost", v)} min={0} max={3} step={0.1} unit="%" />
        </div>
        <p className="text-[11px] text-slate-400 mt-3">생활비 증가율 = 생활비·FIRE 목표선 상승 / 물가상승률 = 연금·자녀비·목돈 등 일반 물가 / 매각비용은 자산을 헐어 쓰는 해에만 적용돼요.</p>
      </Card>
      <AllocCard common={common} setCommon={setCommon} age={people[0].age} retireAge={people[0].retireAge} />
      <Advanced adv={adv} setAdv={setAdv} people={people} />
    </div>
  );
}

/* ───────────── 시나리오 공유 ───────────── */
const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const dec = (s) => JSON.parse(decodeURIComponent(escape(atob(s))));
function Share({ snapshot, onLoad }) {
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState("");
  const code = useMemo(() => { try { return enc(snapshot); } catch { return ""; } }, [snapshot]);
  const url = (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "") + "#s=" + code;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { /* sandbox */ }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const load = () => {
    try {
      const m = paste.match(/s=([^&\s]+)/);
      const c = m ? m[1] : paste.trim();
      onLoad(dec(c));
    } catch { alert("코드를 읽을 수 없어요. 전체 링크나 코드를 그대로 붙여넣어 주세요."); }
  };
  return (
    <Card title="시나리오 공유" accent="#0f172a" icon={Share2}>
      <p className="text-[12px] text-slate-500 mb-2 leading-relaxed">현재 입력을 링크로 만들어 친구에게 보내면, 친구는 같은 값에서 시작해 자기 숫자로 바꿔볼 수 있어요.</p>
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()}
          className="flex-1 rounded-lg bg-slate-50 ring-1 ring-slate-200 px-2.5 py-2 text-[11px] text-slate-500 outline-none truncate" />
        <button onClick={copy} className="flex items-center gap-1 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold">
          {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "복사됨" : "복사"}
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="받은 링크·코드 붙여넣기"
          className="flex-1 rounded-lg bg-amber-50 ring-1 ring-amber-200 px-2.5 py-2 text-[12px] outline-none focus:ring-2 focus:ring-emerald-400" />
        <button onClick={load} className="px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold">불러오기</button>
      </div>
    </Card>
  );
}

/* ───────────── 앱 ───────────── */
export default function App() {
  const [mode, setMode] = useState(null);
  const [common, setCommonState] = useState(COMMON0);
  const [people, setPeople] = useState([ME0]);
  const [adv, setAdv] = useState(ADV0);
  const [tab, setTab] = useState("in");

  useEffect(() => {
    try {
      const m = (window.location.hash || "").match(/s=([^&]+)/);
      if (m) loadSnapshot(dec(m[1]));
    } catch { /* ignore */ }
  }, []);

  const loadSnapshot = (st) => {
    if (!st || !st.mode) return;
    setMode(st.mode);
    setCommonState({ ...COMMON0, ...st.common });
    setPeople(st.people);
    setAdv({ ...ADV0, ...st.adv });
    setTab("out");
  };
  const pick = (m) => {
    setMode(m);
    setPeople(m === "couple" ? [{ ...ME0 }, { ...SPOUSE0 }] : [{ ...SOLO0 }]);
    setCommonState(COMMON0); setAdv(ADV0); setTab("in");
  };
  const setCommon = (k, v) => setCommonState((c) => ({ ...c, [k]: v }));
  const setPerson = (i, k, v) => setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const setExp = (i, k, v) => setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, exp: { ...p.exp, [k]: v } } : p)));

  const eng = useEngine(common, people, adv);
  if (!mode) return <ModeSelect onPick={pick} />;

  const tabs = [
    { k: "in", label: "입력", Icon: Sliders },
    { k: "out", label: "결과", Icon: BarChart3 },
    { k: "tbl", label: "연도별", Icon: Table2 },
  ];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-xl mx-auto px-4 pb-28 pt-4">
        <header className="flex items-center justify-between mb-4">
          <button onClick={() => setMode(null)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ChevronLeft size={18} /> 모드</button>
          <div className="flex items-center gap-1.5 text-sm font-bold">
            {mode === "couple" ? <Users size={16} className="text-emerald-600" /> : <User size={16} className="text-indigo-600" />}
            {mode === "couple" ? "부부 모드" : "싱글 모드"}
          </div>
          <div className="w-12" />
        </header>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 mb-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] opacity-80 flex items-center gap-1"><TrendingUp size={13} /> 예상 은퇴 가능 나이</div>
            <div className="text-3xl font-extrabold tabular-nums mt-0.5">{eng.earliest != null ? `${eng.earliest}세` : "재검토 필요"}</div>
          </div>
          <div className="text-right text-[11px] opacity-90 leading-relaxed">현재 자산<br /><b className="text-sm">{won(people.reduce((s, p) => s + (+p.asset || 0), 0))}</b><br />에서 시작</div>
        </div>

        {tab === "in" && (
          <div className="space-y-4">
            <Inputs {...{ common, setCommon, people, setPerson, setExp, adv, setAdv }} />
            <Share snapshot={{ mode, common, people, adv }} onLoad={loadSnapshot} />
          </div>
        )}
        {tab === "out" && <Results eng={eng} mode={mode} people={people} />}
        {tab === "tbl" && <YearTable eng={eng} hasPension={adv.pension.on} />}
      </div>

      <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-slate-200">
        <div className="max-w-xl mx-auto flex">
          {tabs.map(({ k, label, Icon }) => (
            <button key={k} onClick={() => setTab(k)} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition" style={{ color: tab === k ? "#059669" : "#94a3b8" }}>
              <Icon size={20} />{label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
