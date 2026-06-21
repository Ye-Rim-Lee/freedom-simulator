export const won = (man) => {
  man = Math.round(man || 0);
  const a = Math.abs(man);
  if (a >= 10000) return (man / 10000).toFixed(a % 10000 === 0 ? 0 : 1) + "억";
  return man.toLocaleString() + "만";
};

export const yAxisFmt = (v) =>
  v >= 10000 ? (v / 10000).toFixed(0) + "억" : Math.round(v / 1000) + "천";
