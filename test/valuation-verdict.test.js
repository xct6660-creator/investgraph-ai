const assert = require("node:assert/strict");
const test = require("node:test");

const { buildEvidenceValuationVerdict } = require("../lib/valuation-verdict");

test("evidence valuation verdict rejects low-evidence low case and classifies expensive momentum as overvalued", () => {
  const verdict = buildEvidenceValuationVerdict({
    symbol: "688072.SS",
    companyName: "拓荆科技",
    market: "A股",
    aiPathway: "半导体设备",
    pe: 96.7,
    priceToBook: 21.9,
    revenueGrowthPct: 58.9,
    netMarginPct: 14.2,
    hardEvidenceCount: 1,
    evidenceConfidence: 69,
    return1m: 22.85,
    return3m: 47.9,
    volumeRatio: 1.49,
    scores: {
      undervalued: 59.9,
      overvalued: 68.6,
      valuationRisk: 84,
      quality: 78,
      expectations: 79,
      evidence: 64,
      proofGap: 61,
    },
    undervaluedCase: {
      label: "低估证据不足",
      score: 59.9,
    },
    overvaluedCase: {
      label: "估值门槛",
      score: 68.6,
    },
    evidenceItems: [
      {
        source: "东方财富公告",
        catalystType: "例行公告",
        title: "首次公开发行股票并上市之保荐总结报告书",
        summary: "例行披露，不足以证明新增订单或利润兑现。",
        url: "https://example.com/source",
      },
    ],
  });

  assert.equal(verdict.classification, "overvalued");
  assert.equal(verdict.label, "高估");
  assert.match(verdict.summary, /估值|预期/);
  assert.ok(verdict.confidence >= 60);
  assert.ok(verdict.evidenceLedger.valuation.length > 0);
  assert.ok(verdict.evidenceLedger.missing.some((item) => item.includes("订单") || item.includes("扣非")));
});

test("evidence valuation verdict only classifies undervalued when valuation, proof and underreaction gates pass", () => {
  const verdict = buildEvidenceValuationVerdict({
    symbol: "AIUS",
    companyName: "AI Value",
    market: "美股",
    aiPathway: "AI软件/数据平台",
    pe: 24,
    priceToBook: 4.2,
    revenueGrowthPct: 32,
    netMarginPct: 18,
    hardEvidenceCount: 3,
    evidenceConfidence: 78,
    return1m: -6,
    return3m: -18,
    maxDrawdown1y: -42,
    scores: {
      undervalued: 78,
      overvalued: 42,
      valuationRisk: 38,
      quality: 74,
      expectations: 34,
      evidence: 80,
      proofGap: 28,
    },
    undervaluedCase: {
      label: "优先深挖",
      score: 78,
    },
    overvaluedCase: {
      label: "高估证据不足",
      score: 42,
    },
    evidenceItems: [
      {
        source: "SEC",
        catalystType: "硬事实",
        title: "Revenue growth and margin expansion",
        summary: "Reported revenue growth and margin expansion.",
        url: "https://example.com/sec",
      },
    ],
  });

  assert.equal(verdict.classification, "undervalued");
  assert.equal(verdict.label, "低估");
  assert.match(verdict.summary, /低估|未充分/);
});

test("evidence valuation verdict does not convert missing PE into zero", () => {
  const verdict = buildEvidenceValuationVerdict({
    symbol: "688072.SS",
    companyName: "拓荆科技",
    pe: null,
    priceToBook: 21.9,
    hardEvidenceCount: 4,
    evidenceConfidence: 78,
    return1m: 18.5,
    return3m: 58.4,
    scores: {
      undervalued: 58.5,
      overvalued: 70.7,
      valuationRisk: 94,
      quality: 96,
      expectations: 84.5,
      evidence: 83.8,
      proofGap: 53,
    },
    overvaluedCase: {
      label: "估值门槛",
      score: 70.7,
    },
  });

  assert.equal(verdict.classification, "overvalued");
  assert.match(verdict.evidenceLedger.valuation[0], /PE -/);
  assert.doesNotMatch(verdict.evidenceLedger.valuation[0], /PE 0/);
});
