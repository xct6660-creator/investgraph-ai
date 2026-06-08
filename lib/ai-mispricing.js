function caseScore(candidate, side) {
  return Number(candidate?.[`${side}Case`]?.score) || 0;
}

function caseLabel(candidate, side) {
  return String(candidate?.[`${side}Case`]?.label || "");
}

function isInsufficientCase(candidate, side) {
  return /证据不足|不足/.test(caseLabel(candidate, side));
}

function materializeCase(candidate, side) {
  const sourceCase = candidate[`${side}Case`] || {};
  return {
    ...candidate,
    mispricingSide: side === "undervalued" ? "潜在低估" : "严重高估",
    score: sourceCase.score,
    action: sourceCase.label,
    why: sourceCase.why,
    evidence: sourceCase.evidence,
    firstRejection: sourceCase.firstRejection,
    nextWorkflow: sourceCase.nextWorkflow,
  };
}

function splitAiMispricingCandidates(candidates, limit = 12) {
  const undervalued = [];
  const overvalued = [];
  const rejected = [];

  for (const candidate of candidates || []) {
    const lowScore = caseScore(candidate, "undervalued");
    const highScore = caseScore(candidate, "overvalued");
    const lowEligible = lowScore >= 62 && !isInsufficientCase(candidate, "undervalued");
    const highEligible = highScore >= 62 && !isInsufficientCase(candidate, "overvalued");

    if (lowEligible && (!highEligible || lowScore > highScore)) {
      undervalued.push(materializeCase(candidate, "undervalued"));
      continue;
    }
    if (highEligible) {
      overvalued.push(materializeCase(candidate, "overvalued"));
      continue;
    }
    rejected.push({
      symbol: candidate.symbol,
      companyName: candidate.companyName,
      reason: lowScore >= highScore ? caseLabel(candidate, "undervalued") : caseLabel(candidate, "overvalued"),
      lowScore,
      highScore,
    });
  }

  return {
    undervalued: undervalued.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit),
    overvalued: overvalued.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit),
    rejected,
  };
}

module.exports = {
  splitAiMispricingCandidates,
};
