function numberValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstNumber(...values) {
  for (const value of values) {
    const number = numberValue(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function clamp(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function round(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

function formatNumber(value, suffix = "") {
  const number = numberValue(value);
  if (!Number.isFinite(number)) return "-";
  return `${round(number, Math.abs(number) >= 100 ? 0 : 1)}${suffix}`;
}

function score(candidate, key) {
  return numberValue(candidate?.scores?.[key]);
}

function caseScore(candidate, key) {
  return firstNumber(candidate?.scores?.[key], candidate?.[`${key}Case`]?.score);
}

function isInsufficientLabel(value) {
  return /证据不足|不足/.test(String(value || ""));
}

function buildEvidenceRows(candidate) {
  return (candidate.evidenceItems || []).slice(0, 6).map((item) => ({
    title: item.title || item.summary || "未命名证据",
    source: item.source || "来源待核实",
    type: item.catalystType || item.sourceTier || "证据",
    summary: item.summary || item.excerpt || "",
    url: item.url || "",
    publishedAt: item.publishedAt || "",
  }));
}

function buildEvidenceValuationVerdict(candidate = {}) {
  const pe = numberValue(candidate.pe);
  const pb = numberValue(candidate.priceToBook);
  const revenueGrowth = numberValue(candidate.revenueGrowthPct);
  const margin = numberValue(candidate.netMarginPct);
  const hardEvidenceCount = numberValue(candidate.hardEvidenceCount) || 0;
  const evidenceConfidence = numberValue(candidate.evidenceConfidence) || 0;
  const lowScore = caseScore(candidate, "undervalued") || 0;
  const highScore = caseScore(candidate, "overvalued") || 0;
  const valuationRisk = firstNumber(score(candidate, "valuationRisk"), pe && pe > 60 ? 78 : 48);
  const quality = firstNumber(score(candidate, "quality"), revenueGrowth ? 50 + revenueGrowth * 0.45 : 45);
  const expectations = firstNumber(score(candidate, "expectations"), 50);
  const evidence = firstNumber(score(candidate, "evidence"), evidenceConfidence);
  const proofGap = firstNumber(score(candidate, "proofGap"), hardEvidenceCount ? 42 : 72);
  const return1m = numberValue(candidate.return1m);
  const return3m = numberValue(candidate.return3m);
  const drawdown = numberValue(candidate.maxDrawdown1y);

  const lowLabel = candidate.undervaluedCase?.label || "";
  const highLabel = candidate.overvaluedCase?.label || "";
  const lowEvidenceGate = hardEvidenceCount >= 1 && evidenceConfidence >= 58 && evidence >= 55 && !isInsufficientLabel(lowLabel);
  const valuationLowGate =
    valuationRisk <= 50 ||
    (Number.isFinite(pe) && pe > 0 && pe <= 45 && (!Number.isFinite(pb) || pb <= 8));
  const qualityGate = quality >= 56 || (Number.isFinite(revenueGrowth) && revenueGrowth >= 15 && Number.isFinite(margin) && margin >= 8);
  const marketUnderreacted =
    expectations <= 72 ||
    (Number.isFinite(return1m) && return1m <= 5) ||
    (Number.isFinite(drawdown) && drawdown <= -25);
  const lowCase = lowScore >= 68 && lowScore >= highScore + 8 && lowEvidenceGate && valuationLowGate && qualityGate && marketUnderreacted;

  const highValuationGate =
    valuationRisk >= 66 ||
    (Number.isFinite(pe) && (pe <= 0 || pe >= 60)) ||
    (Number.isFinite(pb) && pb >= 10);
  const expectationGate =
    expectations >= 60 ||
    (Number.isFinite(return1m) && return1m >= 15) ||
    (Number.isFinite(return3m) && return3m >= 35);
  const proofWeak = proofGap >= 58 || hardEvidenceCount < 2 || evidenceConfidence < 65;
  const highCase = highScore >= 64 && highScore >= lowScore - 4 && !isInsufficientLabel(highLabel) && highValuationGate && (expectationGate || proofWeak);

  let classification = "insufficient";
  if (highCase) classification = "overvalued";
  else if (lowCase) classification = "undervalued";

  const valuation = [
    `PE ${formatNumber(pe)}，PB ${formatNumber(pb)}。`,
    `估值风险 ${formatNumber(valuationRisk, "分")}，低估分 ${formatNumber(lowScore, "分")}，高估分 ${formatNumber(highScore, "分")}。`,
  ];
  const operating = [
    `收入增长 ${formatNumber(revenueGrowth, "%")}，净利率 ${formatNumber(margin, "%")}。`,
    `质量分 ${formatNumber(quality, "分")}，证据置信 ${formatNumber(evidenceConfidence, "%")}，硬证据 ${hardEvidenceCount} 条。`,
  ];
  const market = [
    `1月 ${formatNumber(return1m, "%")}，3月 ${formatNumber(return3m, "%")}，预期热度 ${formatNumber(expectations, "分")}。`,
    `证据缺口 ${formatNumber(proofGap, "分")}。`,
  ];
  const missing = [];
  if (hardEvidenceCount < 2) missing.push("缺少足够公司级硬证据：订单金额、客户名称、收入确认或管理层明确指引。");
  if (!Number.isFinite(pe) || !Number.isFinite(pb)) missing.push("缺少完整估值倍数，需要补齐市值、净利、净资产或一致预期。");
  if (classification !== "undervalued" && !valuationLowGate) missing.push("估值不便宜，不能把题材相关性直接当成低估。");
  if (classification !== "undervalued" && !lowEvidenceGate) missing.push("低估证据链未闭合：需要扣非利润、订单和现金流共同验证。");
  if (classification === "overvalued") missing.push("若后续订单、扣非利润和现金流连续兑现，高估判断需要下修。");

  const confidenceBase =
    classification === "overvalued"
      ? 56 + Math.max(0, highScore - lowScore) * 0.5 + Math.max(0, valuationRisk - 60) * 0.35 + (expectationGate ? 8 : 0)
      : classification === "undervalued"
        ? 56 + Math.max(0, lowScore - highScore) * 0.5 + Math.max(0, 58 - valuationRisk) * 0.35 + hardEvidenceCount * 4
        : 42 + Math.abs(highScore - lowScore) * 0.25;
  const confidence = round(clamp(confidenceBase, 35, 92), 1);

  const label =
    classification === "overvalued" ? "高估" : classification === "undervalued" ? "低估" : "证据不足";
  const summary =
    classification === "overvalued"
      ? `估值和预期已经走在主营证据前面：${valuation[0]} ${market[0]}`
      : classification === "undervalued"
        ? `低估证据过线：估值未充分反映AI路径和基本面兑现，${operating[0]} ${market[0]}`
        : `证据链不足，暂不能判低估或高估：${valuation[0]} ${operating[1]}`;

  return {
    classification,
    label,
    confidence,
    summary,
    action:
      classification === "overvalued"
        ? "不按低估机会处理，进入高估/回避观察。"
        : classification === "undervalued"
          ? "进入低估候选，但仍需模拟盘和公告原文确认。"
          : "先观察，等待硬证据补齐。",
    decisionRule:
      "低估必须同时通过估值、主营兑现、硬证据和未充分定价；高估看估值透支、预期过热、证据缺口和利润质量。",
    evidenceLedger: {
      valuation,
      operating,
      market,
      sourceEvidence: buildEvidenceRows(candidate),
      missing,
    },
  };
}

module.exports = {
  buildEvidenceValuationVerdict,
};
