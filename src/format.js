// 자연 입력 파서: "1.2억" / "5000만" / "1억2천" / "12000" → 만원 단위 정수.
// 인식 실패 시 null 반환.
export function parseMoneyMan(text) {
  if (typeof text === "number") return Math.round(text);
  let s = String(text || "").trim().replace(/[,\s원]/g, "");
  if (!s) return 0;
  let total = 0;
  const eok = s.match(/^([0-9]*\.?[0-9]+)억(.*)$/);
  if (eok) {
    total += parseFloat(eok[1]) * 10000;
    s = eok[2];
  }
  if (!s) return Math.round(total);
  const cheon = s.match(/^([0-9]*\.?[0-9]+)천(만?)$/);
  if (cheon) return Math.round(total + parseFloat(cheon[1]) * 1000);
  const baek = s.match(/^([0-9]*\.?[0-9]+)백(만?)$/);
  if (baek) return Math.round(total + parseFloat(baek[1]) * 100);
  const man = s.match(/^([0-9]*\.?[0-9]+)만$/);
  if (man) return Math.round(total + parseFloat(man[1]));
  if (/^[0-9]*\.?[0-9]+$/.test(s)) return Math.round(total + parseFloat(s));
  return null;
}

export const won = (man) => {
  man = Math.round(man || 0);
  const a = Math.abs(man);
  if (a >= 10000) return (man / 10000).toFixed(a % 10000 === 0 ? 0 : 1) + "억";
  return man.toLocaleString() + "만";
};

export const yAxisFmt = (v) =>
  v >= 10000 ? (v / 10000).toFixed(0) + "억" : Math.round(v / 1000) + "천";
