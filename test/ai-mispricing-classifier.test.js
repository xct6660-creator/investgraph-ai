const assert = require("node:assert/strict");
const test = require("node:test");

const { splitAiMispricingCandidates } = require("../lib/ai-mispricing");

test("ai mispricing split excludes insufficient low-evidence names and keeps buckets exclusive", () => {
  const rows = [
    {
      symbol: "688072.SS",
      companyName: "拓荆科技",
      undervaluedCase: {
        score: 59.9,
        label: "低估证据不足",
        why: "相关度存在，但估值、基本面或证据不足。",
        evidence: "发行保荐总结报告",
        firstRejection: "估值已经偏高。",
        nextWorkflow: "核实公告。",
      },
      overvaluedCase: {
        score: 68.6,
        label: "估值门槛",
        why: "1月涨幅较大且PE不可比。",
        evidence: "价格/估值反应强于可验证证据。",
        firstRejection: "若后续订单兑现，高估判断可能失效。",
        nextWorkflow: "加入复盘观察。",
      },
    },
    {
      symbol: "NVDA",
      companyName: "英伟达",
      undervaluedCase: {
        score: 75.2,
        label: "优先深挖",
        why: "证据、质量和估值支持过线。",
        evidence: "财报和客户需求验证。",
        firstRejection: "毛利率下行。",
        nextWorkflow: "核实财报。",
      },
      overvaluedCase: {
        score: 58.1,
        label: "高估证据不足",
        why: "高估证据不足。",
        evidence: "不足。",
        firstRejection: "不足。",
        nextWorkflow: "观察。",
      },
    },
    {
      symbol: "SMCI",
      companyName: "超微电脑",
      undervaluedCase: {
        score: 70.1,
        label: "观察低估",
        why: "有低估线索。",
        evidence: "收入增长。",
        firstRejection: "财务质量。",
        nextWorkflow: "核实财报。",
      },
      overvaluedCase: {
        score: 73.4,
        label: "高估警报",
        why: "高估风险更强。",
        evidence: "估值和预期过热。",
        firstRejection: "订单兑现。",
        nextWorkflow: "复盘观察。",
      },
    },
  ];

  const { undervalued, overvalued } = splitAiMispricingCandidates(rows, 12);
  const lowSymbols = new Set(undervalued.map((item) => item.symbol));
  const highSymbols = new Set(overvalued.map((item) => item.symbol));

  assert.equal(lowSymbols.has("688072.SS"), false);
  assert.equal(highSymbols.has("688072.SS"), true);
  assert.equal(lowSymbols.has("NVDA"), true);
  assert.equal(highSymbols.has("NVDA"), false);
  assert.equal(lowSymbols.has("SMCI"), false);
  assert.equal(highSymbols.has("SMCI"), true);
  for (const symbol of lowSymbols) {
    assert.equal(highSymbols.has(symbol), false, `${symbol} should not appear in both buckets`);
  }
});

test("ai mispricing split follows final evidence verdict before raw scores", () => {
  const rows = [
    {
      symbol: "688072.SS",
      companyName: "拓荆科技",
      finalVerdict: {
        classification: "overvalued",
        label: "高估",
        summary: "估值和预期已经走在主营证据前面。",
      },
      undervaluedCase: {
        score: 72,
        label: "优先深挖",
      },
      overvaluedCase: {
        score: 66,
        label: "估值门槛",
      },
    },
    {
      symbol: "TESTLOW",
      companyName: "低估样本",
      finalVerdict: {
        classification: "undervalued",
        label: "低估",
        summary: "低估证据过线。",
      },
      undervaluedCase: {
        score: 68,
        label: "观察低估",
      },
      overvaluedCase: {
        score: 70,
        label: "估值门槛",
      },
    },
    {
      symbol: "TESTMISS",
      companyName: "证据不足样本",
      finalVerdict: {
        classification: "insufficient",
        label: "证据不足",
        summary: "证据链不足。",
      },
      undervaluedCase: {
        score: 80,
        label: "优先深挖",
      },
      overvaluedCase: {
        score: 80,
        label: "高估警报",
      },
    },
  ];

  const { undervalued, overvalued, rejected } = splitAiMispricingCandidates(rows, 12);

  assert.deepEqual(undervalued.map((item) => item.symbol), ["TESTLOW"]);
  assert.deepEqual(overvalued.map((item) => item.symbol), ["688072.SS"]);
  assert.deepEqual(rejected.map((item) => item.symbol), ["TESTMISS"]);
});
