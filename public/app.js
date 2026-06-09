const state = {
  data: null,
  range: "1y",
  chartMode: "kline",
  klinePeriod: "day",
  chartZoom: 1,
  chartOffset: 0,
  drawingMode: false,
  pendingDrawPoint: null,
  intraday: null,
  intradayLoading: false,
  watchlist: [],
  history: [],
  briefing: [],
  briefingMeta: null,
  backtest: null,
  tradePlan: null,
  profitRunId: 0,
  paper: null,
  dailyPicks: null,
  cycle: null,
  aiMispricing: null,
  valuationVerdict: null,
  nightly: null,
  diagnostics: null,
  review: null,
  briefingOutcomes: null,
  sources: null,
  jobs: {},
  pinchStartZoom: null,
};

const elements = {
  form: document.querySelector("#search-form"),
  input: document.querySelector("#symbol-input"),
  status: document.querySelector("#status-band"),
  deviceAccess: document.querySelector("#device-access"),
  deviceAccessLinks: document.querySelector("#device-access-links"),
  companyName: document.querySelector("#company-name"),
  symbolLabel: document.querySelector("#symbol-label"),
  lastPrice: document.querySelector("#last-price"),
  lastDate: document.querySelector("#last-date"),
  dayChange: document.querySelector("#day-change"),
  volumeRatio: document.querySelector("#volume-ratio"),
  topCandidate: document.querySelector("#top-candidate"),
  topScore: document.querySelector("#top-score"),
  chart: document.querySelector("#price-chart"),
  chartSubtitle: document.querySelector("#chart-subtitle"),
  memoStance: document.querySelector("#memo-stance"),
  bullishList: document.querySelector("#bullish-list"),
  bearishList: document.querySelector("#bearish-list"),
  driverList: document.querySelector("#driver-list"),
  topicList: document.querySelector("#topic-list"),
  chainSource: document.querySelector("#chain-source"),
  chainThesis: document.querySelector("#chain-thesis"),
  network: document.querySelector("#network-graph"),
  candidateTable: document.querySelector("#candidate-table"),
  newsList: document.querySelector("#news-list"),
  verifyList: document.querySelector("#verify-list"),
  fundamentals: document.querySelector("#fundamentals"),
  notes: document.querySelector("#data-notes"),
  evidenceMeta: document.querySelector("#evidence-meta"),
  evidenceScore: document.querySelector("#evidence-score"),
  evidenceVerdict: document.querySelector("#evidence-verdict"),
  evidenceList: document.querySelector("#evidence-list"),
  evidenceQuestionList: document.querySelector("#evidence-question-list"),
  watchlistForm: document.querySelector("#watchlist-form"),
  watchlistInput: document.querySelector("#watchlist-input"),
  watchlistList: document.querySelector("#watchlist-list"),
  historySubtitle: document.querySelector("#history-subtitle"),
  historyList: document.querySelector("#history-list"),
  saveReportButton: document.querySelector("#save-report-button"),
  briefingSubtitle: document.querySelector("#briefing-subtitle"),
  briefingButton: document.querySelector("#briefing-button"),
  briefingList: document.querySelector("#briefing-list"),
  strategySelect: document.querySelector("#strategy-select"),
  backtestButton: document.querySelector("#backtest-button"),
  planButton: document.querySelector("#plan-button"),
  paperButton: document.querySelector("#paper-button"),
  dailyPicksButton: document.querySelector("#daily-picks-button"),
  cycleButton: document.querySelector("#cycle-button"),
  aiMispricingButton: document.querySelector("#ai-mispricing-button"),
  verdictButton: document.querySelector("#verdict-button"),
  nightlyButton: document.querySelector("#nightly-button"),
  diagnosticsButton: document.querySelector("#diagnostics-button"),
  reviewButton: document.querySelector("#review-button"),
  backtestSummary: document.querySelector("#backtest-summary"),
  signalStats: document.querySelector("#signal-stats"),
  tradePlan: document.querySelector("#trade-plan"),
  paperPortfolio: document.querySelector("#paper-portfolio"),
  dailyPicks: document.querySelector("#daily-picks"),
  dailyCycle: document.querySelector("#daily-cycle"),
  aiMispricing: document.querySelector("#ai-mispricing"),
  valuationVerdict: document.querySelector("#valuation-verdict"),
  nightlyDeepDive: document.querySelector("#nightly-deep-dive"),
  systemDiagnostics: document.querySelector("#system-diagnostics"),
  investorQa: document.querySelector("#investor-qa"),
  briefingOutcomes: document.querySelector("#briefing-outcomes"),
  nextUpgrades: document.querySelector("#next-upgrades"),
  autoReview: document.querySelector("#auto-review"),
  dataSourceList: document.querySelector("#data-source-list"),
};

const API_ORIGIN = window.location.protocol === "file:" ? "http://localhost:4173" : "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortText(value, maxLength = 38) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatPct(value) {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number)) return "-";
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(2)}%`;
}

function pct(current, previous) {
  const currentValue = toFiniteNumber(current);
  const previousValue = toFiniteNumber(previous);
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
}

function mean(values) {
  const valid = values.map(toFiniteNumber).filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function pctClass(value) {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number) || number === 0) return "";
  return number > 0 ? "positive" : "negative";
}

function formatPrice(value, currency) {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number)) return "-";
  const digits = Math.abs(number) >= 100 ? 2 : 3;
  return `${number.toFixed(digits)} ${currency || ""}`.trim();
}

function compactNumber(value) {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number)) return "-";
  const units = [
    { suffix: "万亿", value: 1_000_000_000_000 },
    { suffix: "亿", value: 100_000_000 },
    { suffix: "万", value: 10_000 },
  ];
  for (const unit of units) {
    if (Math.abs(number) >= unit.value) {
      return `${(number / unit.value).toFixed(2)}${unit.suffix}`;
    }
  }
  return number.toFixed(2);
}

function compactVolume(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
  const text = compactNumber(value);
  return text === "-" ? "-" : text.replace(".00", "");
}

function setStatus(message, mode = "loading") {
  elements.status.className = `status-band is-${mode}`;
  elements.status.innerHTML = `<div class="loading-line"></div><span>${escapeHtml(message)}</span>`;
}

async function apiJson(url, options = {}) {
  const response = await fetch(`${API_ORIGIN}${url}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "请求失败");
  return payload;
}

function jobNoticeHtml(title, job, detail = "") {
  const started = job?.startedAt ? formatDateTime(job.startedAt) : "刚刚";
  return `
    <div class="cycle-section job-notice">
      <strong>${escapeHtml(title)}</strong>
      <span>后台任务已启动 · ${escapeHtml(started)}</span>
      <span>${escapeHtml(detail || "页面不会继续卡住；完成后会自动刷新这里。")}</span>
    </div>
  `;
}

function prependJobNotice(container, title, job, detail = "") {
  container.insertAdjacentHTML("afterbegin", jobNoticeHtml(title, job, detail));
}

function pollJob(job, handlers) {
  if (!job?.id) return;
  const poll = async () => {
    try {
      const payload = await apiJson(`/api/jobs/${encodeURIComponent(job.id)}`);
      const current = payload.job;
      if (!current) throw new Error("后台任务不存在，可能服务刚重启过。");
      if (current.status === "completed") {
        handlers.onDone?.(current.result, current);
        handlers.onSettled?.();
        return;
      }
      if (current.status === "failed") {
        handlers.onFail?.(current.error || "后台任务失败", current);
        handlers.onSettled?.();
        return;
      }
      handlers.onTick?.(current);
      window.setTimeout(poll, 3500);
    } catch (error) {
      handlers.onFail?.(error.message);
      handlers.onSettled?.();
    }
  };
  window.setTimeout(poll, 1500);
}

async function loadAnalysis(symbol) {
  const cleanSymbol = symbol || elements.input.value || "NVDA";
  elements.input.value = cleanSymbol;
  state.intraday = null;
  state.chartOffset = 0;
  state.pendingDrawPoint = null;
  resetProfitWorkbench(cleanSymbol);
  setStatus(`正在分析 ${cleanSymbol}：拉取行情、新闻、产业链和财务事实...`);
  try {
    const payload = await apiJson(`/api/analyze?symbol=${encodeURIComponent(cleanSymbol)}`);
    state.data = payload;
    renderAll();
    loadHistory(payload.symbol);
    refreshProfitWorkbench();
    const generatedAt = new Date(payload.generatedAt).toLocaleString();
    setStatus(`已生成 ${payload.symbol} 研究报告 · ${generatedAt}`, "ready");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadWatchlist() {
  try {
    const payload = await apiJson("/api/watchlist");
    state.watchlist = normalizeWatchlistItems(payload);
    renderWatchlist();
    if (!state.briefing.length) renderBriefingPlaceholder();
  } catch (error) {
    elements.watchlistList.innerHTML = `<span class="muted-text">${escapeHtml(error.message)}</span>`;
  }
}

async function addWatchlist(symbol) {
  const cleanSymbol = symbol || elements.watchlistInput.value;
  if (!cleanSymbol) return;
  const payload = await apiJson("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ symbol: cleanSymbol }),
  });
  state.watchlist = normalizeWatchlistItems(payload);
  elements.watchlistInput.value = "";
  renderWatchlist();
}

async function removeWatchlist(symbol) {
  const payload = await apiJson(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, {
    method: "DELETE",
  });
  state.watchlist = normalizeWatchlistItems(payload);
  renderWatchlist();
}

function normalizeWatchlistItems(payload) {
  const symbols = payload.symbols || [];
  return (payload.items || symbols.map((symbol) => ({ symbol, name: symbol }))).filter((item) => item?.symbol);
}

function renderWatchlist() {
  if (!state.watchlist.length) {
    elements.watchlistList.innerHTML = '<span class="muted-text">暂无自选股。</span>';
    return;
  }
  elements.watchlistList.innerHTML = state.watchlist
    .map(
      (item) => `
        <article class="stock-chip" title="${escapeHtml(item.symbol)}">
          <button class="stock-load" type="button" data-load-symbol="${escapeHtml(item.symbol)}">
            <strong>${escapeHtml(item.name || item.symbol)}</strong>
          </button>
          <button class="chip-remove" type="button" title="移除" data-remove-symbol="${escapeHtml(item.symbol)}">×</button>
        </article>
      `,
    )
    .join("");
}

function syncChartControls() {
  document.querySelectorAll("[data-chart-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.chartMode === state.chartMode);
  });
  document.querySelectorAll("[data-kline-period]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.klinePeriod === state.klinePeriod);
    button.disabled = state.chartMode !== "kline";
  });
  document.querySelectorAll("[data-chart-tool='draw-line']").forEach((button) => {
    button.classList.toggle("is-active", state.drawingMode);
  });
}

function setChartZoom(value) {
  state.chartZoom = Math.round(clampNumber(value, 1, 12) * 10) / 10;
  state.chartOffset = Math.max(0, state.chartOffset);
  if (state.data) renderChart();
}

function chartZoomLabel() {
  return state.chartZoom.toFixed(1).replace(/\.0$/, "");
}

function adjustChartZoom(direction) {
  const levels = [1, 1.5, 2.5, 4, 6, 9];
  const current = levels.findIndex((level) => level === state.chartZoom);
  const fallback = levels.findIndex((level) => level >= state.chartZoom);
  const index = current >= 0 ? current : Math.max(0, fallback);
  const nextIndex = Math.max(0, Math.min(levels.length - 1, index + direction));
  setChartZoom(levels[nextIndex]);
}

function panChart(direction) {
  const baseLength = pointsForRange(aggregatePoints(state.data?.chart?.points || [], state.klinePeriod)).length;
  const windowSize = Math.max(24, Math.floor(baseLength / state.chartZoom));
  const shift = Math.max(5, Math.floor(windowSize / 3));
  const maxOffset = Math.max(0, baseLength - windowSize);
  state.chartOffset = Math.max(0, Math.min(maxOffset, state.chartOffset + direction * shift));
  if (state.data) renderChart();
}

async function loadHistory(symbol) {
  if (!symbol) return;
  try {
    const payload = await apiJson(`/api/reports?symbol=${encodeURIComponent(symbol)}`);
    state.history = payload.reports || [];
    elements.historySubtitle.textContent = payload.symbol || "当前股票";
    renderHistory();
  } catch (error) {
    elements.historyList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

async function saveCurrentReport() {
  if (!state.data?.symbol) return;
  elements.saveReportButton.disabled = true;
  elements.saveReportButton.textContent = "保存中";
  try {
    const payload = await apiJson("/api/reports/snapshot", {
      method: "POST",
      body: JSON.stringify({ symbol: state.data.symbol }),
    });
    state.history = payload.reports || [];
    renderHistory();
  } catch (error) {
    elements.historyList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  } finally {
    elements.saveReportButton.disabled = false;
    elements.saveReportButton.textContent = "保存";
  }
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function historySourceLabel(reason) {
  if (reason === "manual") return "手动保存";
  if (reason === "briefing") return "简报扫描";
  if (reason === "daily-pick") return "每日候选";
  return "历史快照";
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = '<div class="empty-state">还没有保存过报告。</div>';
    return;
  }
  const groups = new Map();
  [...state.history]
    .sort((a, b) => new Date(b.generatedAt || 0) - new Date(a.generatedAt || 0))
    .forEach((item) => {
      const label = item.topDriver || item.stance || "未归因";
      const key = label.replace(/\s+/g, "");
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          latest: item,
          count: 1,
          sources: new Set([historySourceLabel(item.reason)]),
        });
        return;
      }
      existing.count += 1;
      existing.sources.add(historySourceLabel(item.reason));
    });

  elements.historyList.innerHTML = [...groups.values()]
    .slice(0, 6)
    .map(
      ({ latest: item, count, sources }) => `
        <article class="history-item">
          <div>
            <strong>${escapeHtml(formatPct(item.dayChangePct))}</strong>
            <span>${escapeHtml(item.topDriver || item.stance || "-")}</span>
            <small>${escapeHtml([...sources].join(" / "))}${count > 1 ? `<b class="history-count">${escapeHtml(count)}次</b>` : ""}</small>
          </div>
          <time>${escapeHtml(formatDateTime(item.generatedAt))}</time>
        </article>
      `,
    )
    .join("");
}

function renderBriefingPlaceholder() {
  const count = state.watchlist.length || 0;
  elements.briefingList.innerHTML = `
    <div class="empty-state">
      点击“生成”扫描 ${escapeHtml(count)} 只自选股，按涨跌幅、成交量、新闻/公告和证据置信度排序。
    </div>
  `;
}

async function generateBriefing() {
  elements.briefingButton.disabled = true;
  elements.briefingButton.textContent = "生成中";
  elements.briefingList.innerHTML = jobNoticeHtml(
    "每日简报后台生成中",
    null,
    "先显示最近一份可用简报；后台会补充证据摘要和操作理由。",
  );
  try {
    const payload = await apiJson("/api/briefing/job");
    state.jobs.briefing = payload.job;
    if (payload.latest) {
      state.briefing = payload.latest.items || [];
      state.briefingMeta = payload.latest;
      elements.briefingSubtitle.textContent = new Date(payload.latest.generatedAt).toLocaleString();
      renderBriefing();
      prependJobNotice(elements.briefingList, "正在后台刷新简报", payload.job, "当前先显示最近结果；新结果完成后自动替换。");
    } else {
      elements.briefingList.innerHTML = jobNoticeHtml("正在后台生成第一份每日简报", payload.job);
    }
    elements.briefingButton.disabled = false;
    elements.briefingButton.textContent = "生成";
    pollJob(payload.job, {
      onDone: (result) => {
        state.briefing = result.items || [];
        state.briefingMeta = result;
        elements.briefingSubtitle.textContent = new Date(result.generatedAt).toLocaleString();
        renderBriefing();
        prependJobNotice(elements.briefingList, "每日简报已更新", payload.job, "已补充可核查证据、新闻摘要和风险点。");
        loadInvestorQa();
        loadBriefingOutcomes();
        syncBriefingWatchOrders();
        if (state.data?.symbol) loadHistory(state.data.symbol);
      },
      onFail: (message) => {
        elements.briefingList.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
      },
      onSettled: () => {
        elements.briefingButton.disabled = false;
        elements.briefingButton.textContent = "生成";
      },
    });
  } catch (error) {
    elements.briefingList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    elements.briefingButton.disabled = false;
    elements.briefingButton.textContent = "生成";
  }
}

function renderBriefing() {
  if (!state.briefing.length) {
    renderBriefingPlaceholder();
    return;
  }
  const meta = state.briefingMeta || {};
  const notes = [
    ...(meta.notes || []),
    meta.selectionMode === "fast-focus"
      ? `快筛模式：总自选 ${meta.totalSymbols || "-"} 只，行情快筛 ${meta.screenedSymbols || "-"} 只，深度分析 ${meta.scannedSymbols || state.briefing.length} 只。`
      : "",
  ].filter(Boolean);
  elements.briefingList.innerHTML = `
    ${
      notes.length
        ? `<div class="briefing-scan-note">${notes.map((note) => `<span>${escapeHtml(note)}</span>`).join("")}</div>`
        : ""
    }
    ${state.briefing
    .slice(0, 12)
    .map((item) => {
      if (item.error) {
        return `<article class="briefing-item"><strong>${escapeHtml(displayStockName(item))}</strong><span>${escapeHtml(item.error)}</span></article>`;
      }
      const evidenceItems = (item.evidenceItems || []).slice(0, 2);
      const newsDigests = (item.newsDigests || item.headlines || []).slice(0, 2);
      const risks = (item.riskBullets || []).slice(0, 2);
      const signalBullets = (item.signalBullets || item.reasons || []).slice(0, 3);
      return `
        <article class="briefing-item">
          <button class="briefing-head" type="button" data-load-symbol="${escapeHtml(item.symbol)}" title="${escapeHtml(item.symbol)}">
            <div>
              <strong>${escapeHtml(displayStockName(item))}</strong>
              <span>${escapeHtml(item.decisionWhy || item.evidenceVerdict || "暂无明确催化")}</span>
            </div>
            <strong class="${pctClass(item.dayChangePct)}">${escapeHtml(formatPct(item.dayChangePct))}</strong>
          </button>
          <div class="briefing-summary">
            <span>建议</span>
            <strong class="briefing-action ${briefingActionClass(item.briefAction)}">${escapeHtml(item.briefAction || "观望")}</strong>
            <span>证据</span>
            <strong>${escapeHtml(item.trustLabel || (item.evidenceConfidence ? `${Math.round(item.evidenceConfidence)}% · 硬证据 ${item.hardEvidenceCount || 0}` : "待核实"))}</strong>
          </div>
          <div class="briefing-detail-grid">
            <div class="briefing-block">
              <b>为什么</b>
              ${item.evidenceMix ? `<span>${escapeHtml(item.evidenceMix)}</span>` : ""}
              ${signalBullets.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}
            </div>
            <div class="briefing-block">
              <b>关键证据</b>
              ${
                evidenceItems.length
                  ? evidenceItems
                      .map(
                        (evidence) => `
                          <span>
                            <strong>${escapeHtml(evidence.sourceTier || evidence.catalystType || "证据")}</strong>
                            ${escapeHtml(shortText(evidence.content || evidence.title || "暂无摘要", 136))}
                            ${evidence.url ? `<a class="briefing-source-link" href="${escapeHtml(evidence.url)}" target="_blank" rel="noreferrer">原文</a>` : ""}
                          </span>
                        `,
                      )
                      .join("")
                  : "<span>暂无可核查证据，不能只因涨跌作判断。</span>"
              }
            </div>
            <div class="briefing-block">
              <b>新闻/公告内容</b>
              ${
                newsDigests.length
                  ? newsDigests
                      .map(
                        (news) => `
                          <span>
                            <strong>${escapeHtml(news.source || "来源待核实")}</strong>
                            ${escapeHtml(shortText(news.digest || news.title || "暂无摘要", 136))}
                            ${news.url ? `<a class="briefing-source-link" href="${escapeHtml(news.url)}" target="_blank" rel="noreferrer">原文</a>` : ""}
                          </span>
                        `,
                      )
                      .join("")
                  : "<span>暂无有效新闻/公告摘要。</span>"
              }
            </div>
            <div class="briefing-block">
              <b>操作触发</b>
              <span>${escapeHtml(item.nextAction || "暂无明确交易触发，先观察。")}</span>
            </div>
            <div class="briefing-block">
              <b>反向风险</b>
              ${
                risks.length
                  ? risks.map((risk) => `<span>${escapeHtml(risk)}</span>`).join("")
                  : "<span>暂未识别重大反向风险，但仍需看止损和仓位。</span>"
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("")}
  `;
}

function currentSymbol() {
  return state.data?.symbol || elements.input.value || "688122";
}

function isMainlandSymbol(symbol) {
  return /\.(SS|SZ|BJ)$/i.test(String(symbol || ""));
}

function displayStockName(item) {
  if (!item) return "-";
  if (isMainlandSymbol(item.symbol) && (item.companyName || item.name)) return item.companyName || item.name;
  return item.symbol || item.companyName || item.name || "-";
}

function briefingActionClass(action) {
  if (action === "买入") return "is-buy";
  if (action === "卖出") return "is-sell";
  return "is-watch";
}

function signalActionClass(action) {
  if (action === "强买") return "is-buy";
  if (action === "不碰") return "is-sell";
  return "is-watch";
}

function setButtonBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = busy ? "运行中" : label;
}

function renderNextUpgrades(items) {
  const upgrades =
    items && items.length
      ? items
      : [
          {
            title: "错过机会归因",
            detail: "把观望后 5 日涨超 5% 的样本拉出来，反查是证据不足、主题未映射公司，还是规则太保守。",
            status: "已接入",
          },
          {
            title: "触发后自动模拟成交",
            detail: "观察单满足结构化条件后自动虚拟买入/卖出，并记录触发前后的 1/5/20 日收益。",
            status: "已接入",
          },
          {
            title: "夜间全量深挖",
            detail: "白天快筛，夜间把自选和主题池全部深挖，第二天直接看完整候选和复盘。",
            status: "已接入",
          },
        ];
  if (!elements.nextUpgrades) return;
  elements.nextUpgrades.innerHTML = upgrades
    .map(
      (item, index) => `
        <article class="next-upgrade-item">
          <b>${escapeHtml(index + 1)} · ${escapeHtml(item.title || item)}</b>
          <span>${escapeHtml(item.detail || item)}</span>
          <small>${escapeHtml(item.status || "待排期")}</small>
        </article>
      `,
    )
    .join("");
}

function renderWorkbenchStaticPlaceholders() {
  elements.backtestSummary.innerHTML = '<div class="empty-state">加载股票后自动跑当前策略的最近 5 年回测。</div>';
  elements.signalStats.innerHTML = '<div class="empty-state">这里会显示各策略的胜率、均值和最大回撤。</div>';
  elements.tradePlan.innerHTML = '<div class="empty-state">加载股票后自动计算买入区间、止损、目标价和建议仓位。</div>';
  elements.paperPortfolio.innerHTML = '<div class="empty-state">正在读取本地模拟盘账户...</div>';
  elements.dailyPicks.innerHTML = '<div class="empty-state">点击“推荐”会扫描自选股和前沿主题池，生成当天候选池。</div>';
  elements.dailyCycle.innerHTML = '<div class="empty-state">点击“闭环”会执行：推荐扫描、信号过滤、模拟买卖、组合风控和复盘。</div>';
  elements.aiMispricing.innerHTML = '<div class="empty-state">点击“AI错价”会扫描A股和美股AI相关公司，分出潜在低估和严重高估候选。</div>';
  elements.valuationVerdict.innerHTML = '<div class="empty-state">点击“裁决”会深挖当前股票证据，只输出低估、高估或证据不足。</div>';
  elements.nightlyDeepDive.innerHTML = '<div class="empty-state">点击“深挖”会把更多自选和主题池放到后台跑，完成后缓存给第二天看。</div>';
  elements.systemDiagnostics.innerHTML = '<div class="empty-state">点击“自检”会检查数据源、扫描速度、模拟盘、风控和复盘样本。</div>';
  elements.investorQa.innerHTML = '<div class="empty-state">正在用投资者视角检查：废话、缺证据、乱推荐和模拟验证缺口。</div>';
  elements.briefingOutcomes.innerHTML = '<div class="empty-state">正在统计历史简报的 1/5/20 日后续表现。</div>';
  renderNextUpgrades();
  elements.autoReview.innerHTML = '<div class="empty-state">点击“复盘”会检查历史报告是否兑现。</div>';
  elements.dataSourceList.innerHTML = '<div class="empty-state">正在检查免费和已配置数据源...</div>';
}

async function loadDeviceAccess() {
  if (!elements.deviceAccessLinks) return;
  try {
    const payload = await apiJson("/api/device-access");
    const networkLinks = (payload.networkUrls || []).slice(0, 3);
    const links = [
      `<a href="${escapeHtml(payload.localUrl)}">Mac 本机 ${escapeHtml(payload.localUrl)}</a>`,
      networkLinks.length
        ? networkLinks
            .map(
              (item, index) =>
                `<a href="${escapeHtml(item.url)}">${escapeHtml(index === 0 ? "手机/Windows 优先" : item.interface || "局域网")} ${escapeHtml(item.url)}</a>`,
            )
            .join("")
        : '<span class="muted-text">未检测到同 Wi-Fi 地址</span>',
      '<span>iPhone 可用 Safari 打开后添加到主屏幕</span>',
    ];
    elements.deviceAccessLinks.innerHTML = links.join("");
  } catch (error) {
    elements.deviceAccessLinks.innerHTML = `<span class="muted-text">${escapeHtml(error.message)}</span>`;
  }
}

function resetProfitWorkbench(symbol) {
  state.profitRunId += 1;
  state.backtest = null;
  state.tradePlan = null;
  state.valuationVerdict = null;
  const label = symbol ? ` ${symbol}` : "";
  elements.backtestSummary.innerHTML = `<div class="empty-state">等待${escapeHtml(label)}基础分析完成后自动回测。</div>`;
  elements.signalStats.innerHTML = "";
  elements.tradePlan.innerHTML = `<div class="empty-state">等待${escapeHtml(label)}行情和证据数据后自动生成仓位方案。</div>`;
  elements.valuationVerdict.innerHTML = `<div class="empty-state">等待${escapeHtml(label)}基础分析完成；需要最终高估/低估判断时点击“裁决”。</div>`;
}

async function refreshProfitWorkbench() {
  if (!state.data?.symbol) return;
  const runId = ++state.profitRunId;
  await Promise.allSettled([runBacktest({ auto: true, runId }), generateTradePlan({ auto: true, runId })]);
}

async function runBacktest(options = {}) {
  const { auto = false, runId = state.profitRunId } = options;
  setButtonBusy(elements.backtestButton, true, "回测");
  elements.backtestSummary.innerHTML = `<div class="empty-state">${auto ? "正在自动跑当前策略 5 年历史信号..." : "正在跑 5 年历史信号..."}</div>`;
  elements.signalStats.innerHTML = "";
  try {
    const payload = await apiJson(
      `/api/backtest?symbol=${encodeURIComponent(currentSymbol())}&strategy=${encodeURIComponent(
        elements.strategySelect.value,
      )}&years=5`,
    );
    if (runId !== state.profitRunId) return;
    state.backtest = payload;
    renderBacktest();
  } catch (error) {
    if (runId !== state.profitRunId) return;
    elements.backtestSummary.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  } finally {
    setButtonBusy(elements.backtestButton, false, "回测");
  }
}

function metricBox(label, value) {
  return `<div class="mini-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "-")}</strong></div>`;
}

function renderBacktest() {
  const selected = state.backtest?.selected;
  if (!selected) {
    elements.backtestSummary.innerHTML = '<div class="empty-state">暂无回测结果。</div>';
    elements.signalStats.innerHTML = '<div class="empty-state">换策略或股票后会重新统计信号表现。</div>';
    return;
  }
  const summary = selected.summary || {};
  elements.backtestSummary.innerHTML = [
    metricBox("样本", `${state.backtest.coverage?.years || "-"}年 / ${state.backtest.coverage?.points || 0}日`),
    metricBox("交易次数", summary.trades),
    metricBox("胜率", formatPct(summary.winRate)),
    metricBox("平均收益", formatPct(summary.avgReturn)),
    metricBox("20日均值", formatPct(summary.avgForward20d)),
    metricBox("最大回撤", formatPct(summary.maxDrawdown)),
  ].join("");
  const warnings = (state.backtest.warnings || []).map((item) => `<p>${escapeHtml(item)}</p>`).join("");
  elements.signalStats.innerHTML = `
    <table>
      <thead><tr><th>策略</th><th>次数</th><th>胜率</th><th>均值</th><th>5日</th><th>20日</th><th>回撤</th></tr></thead>
      <tbody>
        ${(state.backtest.signalStats || [])
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.trades)}</td>
                <td>${escapeHtml(formatPct(item.winRate))}</td>
                <td class="${pctClass(item.avgReturn)}">${escapeHtml(formatPct(item.avgReturn))}</td>
                <td class="${pctClass(item.avgForward5d)}">${escapeHtml(formatPct(item.avgForward5d))}</td>
                <td class="${pctClass(item.avgForward20d)}">${escapeHtml(formatPct(item.avgForward20d))}</td>
                <td class="${pctClass(item.maxDrawdown)}">${escapeHtml(formatPct(item.maxDrawdown))}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
    <div class="warning-list">${warnings}</div>
  `;
}

async function generateTradePlan(options = {}) {
  const { auto = false, runId = state.profitRunId } = options;
  setButtonBusy(elements.planButton, true, "仓位");
  elements.tradePlan.innerHTML = `<div class="empty-state">${auto ? "正在自动计算买卖点、仓位和风控..." : "正在计算买卖点和风控..."}</div>`;
  try {
    const payload = await apiJson(
      `/api/trade-plan?symbol=${encodeURIComponent(currentSymbol())}&strategy=${encodeURIComponent(
        elements.strategySelect.value,
      )}&capital=100000`,
    );
    if (runId !== state.profitRunId) return;
    state.tradePlan = payload.plan;
    renderTradePlan();
  } catch (error) {
    if (runId !== state.profitRunId) return;
    elements.tradePlan.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  } finally {
    setButtonBusy(elements.planButton, false, "仓位");
  }
}

function renderTradePlan() {
  const plan = state.tradePlan;
  if (!plan) {
    elements.tradePlan.innerHTML = '<div class="empty-state">暂无仓位方案。</div>';
    return;
  }
  elements.tradePlan.innerHTML = `
    <div class="plan-head">
      <strong>${escapeHtml(plan.action)}</strong>
      <span>${escapeHtml(plan.strategy)} · ${escapeHtml(plan.evidenceVerdict)}</span>
    </div>
    <div class="mini-metrics">
      ${metricBox("买入区间", `${formatPrice(plan.buyZone?.[0])} - ${formatPrice(plan.buyZone?.[1])}`)}
      ${metricBox("止损", formatPrice(plan.stopPrice))}
      ${metricBox("目标", formatPrice(plan.targetPrice))}
      ${metricBox("建议股数", plan.shares)}
      ${metricBox("仓位", formatPct(plan.positionPct))}
      ${metricBox("单笔风险", formatPct(plan.riskBudgetPct))}
    </div>
    <ul>${(plan.risks || []).map((risk) => `<li>${escapeHtml(risk)}</li>`).join("") || "<li>暂无额外风险提示。</li>"}</ul>
  `;
}

async function generatePaperRecommendation() {
  setButtonBusy(elements.paperButton, true, "模拟");
  elements.paperPortfolio.innerHTML = '<div class="empty-state">正在生成模拟交易建议...</div>';
  try {
    const payload = await apiJson("/api/paper/recommend", {
      method: "POST",
      body: JSON.stringify({ symbol: currentSymbol(), strategy: elements.strategySelect.value, capital: 100000, execute: true }),
    });
    state.paper = payload.portfolio;
    state.tradePlan = payload.plan;
    renderTradePlan();
    await loadPaperPortfolio();
  } catch (error) {
    elements.paperPortfolio.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  } finally {
    setButtonBusy(elements.paperButton, false, "模拟");
  }
}

async function loadPaperPortfolio() {
  try {
    state.paper = await apiJson("/api/paper");
    renderPaperPortfolio();
  } catch (error) {
    elements.paperPortfolio.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

async function syncBriefingWatchOrders() {
  try {
    const payload = await apiJson("/api/paper/watch-orders/sync", {
      method: "POST",
      body: JSON.stringify({}),
    });
    state.paper = payload.portfolio;
    renderPaperPortfolio();
  } catch (error) {
    console.warn("watch order sync failed", error);
  }
}

function structuredTriggerText(trigger) {
  if (!trigger) return "";
  return [trigger.priceRule, trigger.volumeRule, trigger.evidenceRule].filter(Boolean).join("；");
}

function renderPaperPortfolio() {
  const paper = state.paper || {};
  const positions = paper.positions || [];
  const watchOrders = paper.watchOrders || [];
  const latestRec = paper.recommendations?.[0];
  const latestTrade = paper.trades?.[0];
  const risk = paper.risk || {};
  elements.paperPortfolio.innerHTML = `
    <div class="mini-metrics">
      ${metricBox("权益", compactNumber(paper.equity || paper.initialCapital || 0))}
      ${metricBox("现金", compactNumber(paper.cash || 0))}
      ${metricBox("收益", formatPct(paper.totalReturnPct))}
      ${metricBox("持仓数", positions.length)}
      ${metricBox("回撤", formatPct(risk.drawdownPct))}
      ${metricBox("连亏", risk.lossStreak ?? 0)}
    </div>
    ${
      latestRec
        ? `<div class="paper-rec"><strong>${escapeHtml(displayStockName(latestRec))} · ${escapeHtml(latestRec.signalGrade || latestRec.action)}</strong><span>仓位 ${escapeHtml(
            formatPct(latestRec.positionPct),
          )} · 止损 ${escapeHtml(formatPrice(latestRec.stopPrice))} · 目标 ${escapeHtml(formatPrice(latestRec.targetPrice))}</span></div>`
        : '<div class="empty-state">暂无模拟建议。</div>'
    }
    ${
      latestTrade
        ? `<div class="paper-rec"><strong>最近模拟成交：${escapeHtml(latestTrade.side === "buy" ? "买入" : "卖出")} ${escapeHtml(
            latestTrade.symbol,
          )}</strong><span>${escapeHtml(latestTrade.reason || "-")} · ${escapeHtml(latestTrade.shares)} 股 · ${escapeHtml(
            formatPrice(latestTrade.price),
          )}${Number.isFinite(latestTrade.realizedPnl) ? ` · 已实现 ${escapeHtml(compactNumber(latestTrade.realizedPnl))}` : ""}</span></div>`
        : ""
    }
    ${
      watchOrders.length
        ? `<div class="watch-order-list">
            <strong>简报观察单</strong>
            ${watchOrders
              .slice(0, 6)
              .map(
                (order) => `
                  <div class="watch-order-item">
                    <div>
                      <b>${escapeHtml(displayStockName(order))}</b>
                      <span>${escapeHtml(order.action || "观望")} · 参考 ${escapeHtml(formatPrice(order.referencePrice, order.currency))} · 最新 ${escapeHtml(
                        formatPrice(order.lastPrice, order.currency),
                      )} · ${escapeHtml(formatPct(order.returnPct))}</span>
                      <small>${escapeHtml(shortText(order.triggerText || order.decisionWhy, 88))}</small>
                      ${
                        structuredTriggerText(order.structuredTrigger)
                          ? `<small>触发规则：${escapeHtml(shortText(structuredTriggerText(order.structuredTrigger), 96))}</small>`
                          : ""
                      }
                      ${order.reviewNote ? `<small>处理结果：${escapeHtml(shortText(order.reviewNote, 96))}</small>` : ""}
                    </div>
                    <em>${escapeHtml(order.status === "done" ? "已模拟处理" : order.triggerState || "观察中")}</em>
                  </div>
                `,
              )
              .join("")}
          </div>`
        : '<div class="empty-state">暂无简报观察单；生成每日简报后会自动记录触发条件。</div>'
    }
    ${
      (risk.violations || []).length
        ? `<div class="warning-list">${risk.violations.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
        : ""
    }
    ${positions
      .slice(0, 6)
      .map(
        (position) => `
          <div class="paper-position">
            <strong>${escapeHtml(displayStockName(position))}</strong>
            <span>${escapeHtml(position.shares)} 股 · 成本 ${escapeHtml(formatPrice(position.avgCost))} · 盈亏 ${escapeHtml(
              formatPct(position.unrealizedPnlPct),
            )} · 止损 ${escapeHtml(formatPrice(position.stopPrice))} · 目标 ${escapeHtml(formatPrice(position.targetPrice))}</span>
          </div>
        `,
      )
      .join("")}
  `;
}

async function generateDailyPicks() {
  setButtonBusy(elements.dailyPicksButton, true, "推荐");
  elements.dailyPicks.innerHTML = jobNoticeHtml(
    "每日推荐后台扫描中",
    null,
    "正在启动后台任务，免费数据源慢也不会卡死页面。",
  );
  try {
    const payload = await apiJson("/api/daily-picks/job?limit=80&capital=100000");
    state.jobs.dailyPicks = payload.job;
    if (payload.latest) {
      state.dailyPicks = payload.latest;
      renderDailyPicks();
      prependJobNotice(elements.dailyPicks, "正在后台刷新每日推荐", payload.job, "先显示最近一次结果；新结果完成后会自动替换。");
    } else {
      elements.dailyPicks.innerHTML = jobNoticeHtml("正在后台生成第一份每日推荐", payload.job);
    }
    setButtonBusy(elements.dailyPicksButton, false, "推荐");
    pollJob(payload.job, {
      onDone: (result) => {
        state.dailyPicks = result;
        renderDailyPicks();
        prependJobNotice(elements.dailyPicks, "每日推荐已更新", payload.job, "这是后台任务刚生成的新结果。");
      },
      onFail: (message) => {
        elements.dailyPicks.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
      },
      onSettled: () => setButtonBusy(elements.dailyPicksButton, false, "推荐"),
    });
  } catch (error) {
    elements.dailyPicks.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    setButtonBusy(elements.dailyPicksButton, false, "推荐");
  }
}

function renderDailyPicks() {
  const payload = state.dailyPicks || {};
  const items = (payload.items || []).filter((item) => !item.error);
  const notes = (payload.notes || []).slice(0, 2);
  if (!items.length) {
    elements.dailyPicks.innerHTML = '<div class="empty-state">暂无候选。先维护自选股，再生成推荐。</div>';
    return;
  }
  elements.dailyPicks.innerHTML = `
    ${items
      .slice(0, 5)
      .map(
        (item) => `
          <article class="daily-pick">
            <div class="pick-head">
              <button class="link-button" type="button" data-load-symbol="${escapeHtml(item.symbol)}" title="${escapeHtml(item.symbol)}">
                ${escapeHtml(displayStockName(item))}
              </button>
              <div class="pick-score-row">
                <strong class="signal-badge ${signalActionClass(item.signalGrade || item.action)}">${escapeHtml(item.signalGrade || item.action)}</strong>
                <strong class="pick-score">${escapeHtml(item.score)}分</strong>
              </div>
            </div>
            <div class="pick-tags">
              <span>${escapeHtml(item.market)}</span>
              <span>${escapeHtml(item.universeSource || "候选池")}</span>
              <span>${escapeHtml(item.theme || "主题待定")}</span>
              <span>${escapeHtml(item.backtest?.strategy || "-")}</span>
            </div>
            <p>${escapeHtml(item.topDriver || item.evidenceVerdict || item.thesis || "免费源暂无强事件，按价格和回测信号观察。")}</p>
            <div class="mini-metrics compact-metrics">
              ${metricBox("1月", formatPct(item.return1m))}
              ${metricBox("3月", formatPct(item.return3m))}
              ${metricBox("胜率", formatPct(item.backtest?.winRate))}
              ${metricBox("止损", formatPrice(item.plan?.stopPrice))}
              ${metricBox("目标", formatPrice(item.plan?.targetPrice))}
              ${metricBox("仓位", formatPct(item.plan?.positionPct))}
            </div>
            <ul>
              ${(item.reasons || []).slice(0, 2).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
              ${(item.filterReasons || []).slice(0, 1).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
            </ul>
          </article>
        `,
      )
      .join("")}
    <div class="warning-list">${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}</div>
  `;
}

async function runDailyCycle() {
  setButtonBusy(elements.cycleButton, true, "闭环");
  elements.dailyCycle.innerHTML = jobNoticeHtml(
    "实战闭环后台运行中",
    null,
    "正在启动后台任务；它会扫描、过滤、模拟买卖、刷新风控和复盘。",
  );
  try {
    const payload = await apiJson("/api/daily-cycle/job?limit=80&capital=100000&execute=true");
    state.jobs.dailyCycle = payload.job;
    if (payload.latest) {
      state.cycle = payload.latest;
      state.dailyPicks = state.cycle.dailyPicks;
      state.paper = state.cycle.paper;
      renderDailyPicks();
      renderPaperPortfolio();
      renderDailyCycle();
      prependJobNotice(elements.dailyCycle, "正在后台刷新实战闭环", payload.job, "先显示最近一次闭环结果；新结果完成后会自动替换。");
    } else {
      elements.dailyCycle.innerHTML = jobNoticeHtml("正在后台生成第一份实战闭环", payload.job);
    }
    setButtonBusy(elements.cycleButton, false, "闭环");
    pollJob(payload.job, {
      onDone: (result) => {
        state.cycle = result;
        state.dailyPicks = state.cycle.dailyPicks;
        state.paper = state.cycle.paper;
        renderDailyPicks();
        renderPaperPortfolio();
        renderDailyCycle();
        prependJobNotice(elements.dailyCycle, "实战闭环已更新", payload.job, "这是后台任务刚生成的新结果。");
      },
      onFail: (message) => {
        elements.dailyCycle.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
      },
      onSettled: () => setButtonBusy(elements.cycleButton, false, "闭环"),
    });
  } catch (error) {
    elements.dailyCycle.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    setButtonBusy(elements.cycleButton, false, "闭环");
  }
}

function renderDailyCycle() {
  const cycle = state.cycle || {};
  const latest = cycle.paper?.cycles?.[0];
  const risk = cycle.risk || cycle.paper?.risk || {};
  const summary = cycle.review?.summary || {};
  const executions = cycle.executions || [];
  const watchProcess = cycle.watchOrderProcessing || {};
  elements.dailyCycle.innerHTML = `
    <div class="mini-metrics">
      ${metricBox("扫描", latest?.scanned ?? cycle.dailyPicks?.universeBreakdown?.scanned ?? "-")}
      ${metricBox("强买", latest?.strongBuys ?? "-")}
      ${metricBox("模拟成交", executions.length)}
      ${metricBox("观察触发", watchProcess.reviewItems?.length ?? 0)}
      ${metricBox("现金", formatPct(risk.cashPct))}
      ${metricBox("组合回撤", formatPct(risk.drawdownPct))}
    </div>
    <div class="cycle-section">
      <strong>信号过滤</strong>
      <span>只有同时满足证据、放量、趋势、回测、风险和行业强度的候选，才允许进入模拟盘。</span>
    </div>
    ${
      executions.length
        ? `<div class="cycle-section"><strong>本次模拟成交</strong>${executions
            .slice(0, 6)
            .map(
              (trade) =>
                `<span>${escapeHtml(trade.side === "buy" ? "买入" : "卖出")} ${escapeHtml(trade.symbol)} · ${escapeHtml(
                  trade.shares,
                )} 股 · ${escapeHtml(formatPrice(trade.price))} · ${escapeHtml(trade.reason || "-")}</span>`,
            )
            .join("")}</div>`
        : '<div class="cycle-section"><strong>本次模拟成交</strong><span>没有候选同时通过所有过滤条件，暂不乱买。</span></div>'
    }
    ${
      (watchProcess.reviewItems || []).length
        ? `<div class="cycle-section"><strong>观察单自动处理</strong>${watchProcess.reviewItems
            .slice(0, 5)
            .map(
              (item) =>
                `<span>${escapeHtml(displayStockName(item))} · ${escapeHtml(item.action)} · ${escapeHtml(formatPct(item.returnPct))} · ${escapeHtml(
                  item.note || item.triggerState || "",
                )}</span>`,
            )
            .join("")}</div>`
        : '<div class="cycle-section"><strong>观察单自动处理</strong><span>当前没有观察单满足自动模拟或归因条件。</span></div>'
    }
    <div class="cycle-section">
      <strong>推荐复盘样本</strong>
      <span>1日胜率 ${escapeHtml(formatPct(summary["1d"]?.hitRate))} · 5日胜率 ${escapeHtml(
        formatPct(summary["5d"]?.hitRate),
      )} · 20日胜率 ${escapeHtml(formatPct(summary["20d"]?.hitRate))}</span>
    </div>
    ${
      (risk.violations || []).length
        ? `<div class="warning-list">${risk.violations.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
        : ""
    }
    ${
      (cycle.skipped || []).length
        ? `<div class="warning-list">${cycle.skipped.slice(0, 5).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
        : ""
    }
  `;
}

async function runAiMispricingScan() {
  setButtonBusy(elements.aiMispricingButton, true, "AI错价");
  elements.aiMispricing.innerHTML = jobNoticeHtml(
    "AI错价扫描后台运行中",
    null,
    "正在扫描自选股、A股AI/先进科技主题池和美股AI核心池；先做研究候选，不直接给实盘指令。",
  );
  try {
    const payload = await apiJson("/api/ai-mispricing/job?limit=72");
    state.jobs.aiMispricing = payload.job;
    if (payload.latest) {
      state.aiMispricing = payload.latest;
      renderAiMispricing();
      prependJobNotice(elements.aiMispricing, "正在后台刷新AI错价扫描", payload.job, "先显示最近一次结果；新结果完成后会自动替换。");
    } else {
      elements.aiMispricing.innerHTML = jobNoticeHtml("正在后台生成第一份AI错价扫描", payload.job);
    }
    setButtonBusy(elements.aiMispricingButton, false, "AI错价");
    pollJob(payload.job, {
      onDone: (result) => {
        state.aiMispricing = result;
        renderAiMispricing();
        prependJobNotice(elements.aiMispricing, "AI错价扫描已更新", payload.job, "这是后台任务刚生成的新结果。");
      },
      onFail: (message) => {
        elements.aiMispricing.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
      },
      onSettled: () => setButtonBusy(elements.aiMispricingButton, false, "AI错价"),
    });
  } catch (error) {
    elements.aiMispricing.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    setButtonBusy(elements.aiMispricingButton, false, "AI错价");
  }
}

function aiMispricingColumnHtml(title, items, kind) {
  const emptyText = kind === "undervalued" ? "本轮没有足够可信的低估候选。" : "本轮没有足够可信的高估候选。";
  return `
    <section class="mispricing-column ${kind}">
      <div class="mispricing-column-head">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(items.length)} 个候选</span>
      </div>
      ${
        items.length
          ? items
              .slice(0, 6)
              .map(
                (item) => {
                  const verdict = item.finalVerdict || null;
                  return `
                  <article class="mispricing-item">
                    <div class="pick-head">
                      <button class="link-button" type="button" data-load-symbol="${escapeHtml(item.symbol)}" title="${escapeHtml(item.symbol)}">
                        ${escapeHtml(item.companyName || displayStockName(item))}
                      </button>
                      <div class="pick-score-row">
                        <strong class="signal-badge ${kind === "undervalued" ? "is-buy" : "is-sell"}">${escapeHtml(item.action || item.mispricingSide)}</strong>
                        <strong class="pick-score">${escapeHtml(item.score ?? "-")}分</strong>
                      </div>
                    </div>
                    <div class="pick-tags">
                      <span>${escapeHtml(item.market || "-")}</span>
                      <span>${escapeHtml(item.aiPathway || item.theme || "AI路径待核验")}</span>
                      <span>PE ${escapeHtml(item.pe ?? "-")}</span>
                      <span>1月 ${escapeHtml(formatPct(item.return1m))}</span>
                    </div>
                    ${
                      verdict
                        ? `<div class="mispricing-final"><strong class="signal-badge ${verdictClass(verdict.label)}">最终：${escapeHtml(verdict.label)}</strong><span>${escapeHtml(
                            shortText(verdict.summary || "", 120),
                          )}</span></div>`
                        : ""
                    }
                    <p>${escapeHtml(item.why || "暂无错价解释。")}</p>
                    <div class="mispricing-evidence">
                      <strong>关键证据</strong>
                      <span>${escapeHtml(shortText(item.evidence || "暂无可验证证据。", 150))}</span>
                      ${(item.evidenceItems || [])
                        .slice(0, 2)
                        .map(
                          (evidence) => `
                            <small>
                              ${escapeHtml(evidence.catalystType || "线索")} · ${escapeHtml(evidence.source || "来源")} ·
                              ${evidence.url ? `<a href="${escapeHtml(evidence.url)}" target="_blank" rel="noreferrer">原文</a>` : escapeHtml(shortText(evidence.title || evidence.summary || "", 80))}
                            </small>
                          `,
                        )
                        .join("")}
                    </div>
                    <div class="mispricing-risk">
                      <strong>第一反证</strong>
                      <span>${escapeHtml(item.firstRejection || "需要继续核验。")}</span>
                    </div>
                    <div class="mispricing-next">${escapeHtml(item.nextWorkflow || "下一步进入人工核验和模拟盘观察。")}</div>
                  </article>
                `;
                },
              )
              .join("")
          : `<div class="empty-state">${escapeHtml(emptyText)}</div>`
      }
    </section>
  `;
}

function renderAiMispricing() {
  const payload = state.aiMispricing;
  if (!payload) {
    elements.aiMispricing.innerHTML = '<div class="empty-state">暂无AI错价扫描缓存。点击“AI错价”后台跑一轮，完成后会保留最近结果。</div>';
    return;
  }
  const undervalued = payload.undervalued || [];
  const overvalued = payload.overvalued || [];
  const breakdown = payload.universeBreakdown || {};
  elements.aiMispricing.innerHTML = `
    <div class="mispricing-summary">
      <div class="mini-metrics compact-metrics">
        ${metricBox("扫描", breakdown.completed ?? breakdown.scanned ?? "-")}
        ${metricBox("低估候选", undervalued.length)}
        ${metricBox("高估候选", overvalued.length)}
        ${metricBox("更新时间", formatDateTime(payload.generatedAt))}
        ${metricBox("A股主题池", breakdown.aiThemePool ?? "-")}
        ${metricBox("美股AI池", breakdown.usAiCore ?? "-")}
      </div>
      <p>这是研究候选池：低估侧看AI路径、证据、估值支持和未充分定价；高估侧看估值、涨幅、证据缺口和基本面承接。</p>
    </div>
    <div class="ai-mispricing-grid">
      ${aiMispricingColumnHtml("潜在低估候选", undervalued, "undervalued")}
      ${aiMispricingColumnHtml("严重高估候选", overvalued, "overvalued")}
    </div>
    ${
      (payload.notes || []).length
        ? `<div class="warning-list">${payload.notes.slice(0, 3).map((note) => `<p>${escapeHtml(note)}</p>`).join("")}</div>`
        : ""
    }
    ${
      (payload.errors || []).length
        ? `<div class="warning-list">${payload.errors.slice(0, 4).map((item) => `<p>${escapeHtml(item.symbol)}：${escapeHtml(item.error)}</p>`).join("")}</div>`
        : ""
    }
  `;
}

function verdictClass(label) {
  if (label === "低估") return "is-buy";
  if (label === "高估") return "is-sell";
  return "is-watch";
}

function verdictLedgerBlock(title, items) {
  const rows = (items || []).filter(Boolean);
  return `
    <div class="verdict-ledger-block">
      <b>${escapeHtml(title)}</b>
      ${
        rows.length
          ? rows.map((item) => `<span>${escapeHtml(item)}</span>`).join("")
          : "<span>暂无有效数据。</span>"
      }
    </div>
  `;
}

function renderValuationVerdict() {
  const payload = state.valuationVerdict;
  if (!payload?.verdict) {
    elements.valuationVerdict.innerHTML = '<div class="empty-state">点击“裁决”会抓取当前股票的公开证据，输出最终高估/低估判断。</div>';
    return;
  }
  const verdict = payload.verdict;
  const ledger = verdict.evidenceLedger || {};
  const sourceEvidence = ledger.sourceEvidence || [];
  elements.valuationVerdict.innerHTML = `
    <article class="verdict-card-body">
      <div class="verdict-head">
        <div>
          <strong>${escapeHtml(payload.companyName || payload.symbol)}</strong>
          <span>${escapeHtml(payload.symbol)} · ${escapeHtml(formatDateTime(payload.generatedAt))}</span>
        </div>
        <strong class="signal-badge ${verdictClass(verdict.label)}">最终：${escapeHtml(verdict.label)}</strong>
      </div>
      <div class="verdict-summary-row">
        ${metricBox("置信度", `${escapeHtml(verdict.confidence ?? "-")}%`)}
        ${metricBox("分类", verdict.classification || "-")}
        ${metricBox("硬证据", payload.evidenceReview?.hardEvidenceCount ?? "-")}
      </div>
      <p class="verdict-summary">${escapeHtml(verdict.summary || "暂无裁决摘要。")}</p>
      <div class="verdict-action">${escapeHtml(verdict.action || "先观察。")}</div>
      <div class="verdict-ledger-grid">
        ${verdictLedgerBlock("估值证据", ledger.valuation)}
        ${verdictLedgerBlock("经营证据", ledger.operating)}
        ${verdictLedgerBlock("市场反应", ledger.market)}
        ${verdictLedgerBlock("缺口/反证", ledger.missing)}
      </div>
      <div class="verdict-source-list">
        <b>原文证据</b>
        ${
          sourceEvidence.length
            ? sourceEvidence
                .map(
                  (item) => `
                    <span>
                      <strong>${escapeHtml(item.source || "来源")}</strong>
                      ${escapeHtml(shortText(item.title || item.summary || "暂无标题", 130))}
                      ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">原文</a>` : ""}
                    </span>
                  `,
                )
                .join("")
            : "<span>没有抓到足够原文证据，系统会保持保守。</span>"
        }
      </div>
      <small class="verdict-rule">${escapeHtml(verdict.decisionRule || "")}</small>
    </article>
  `;
}

async function runEvidenceVerdict() {
  setButtonBusy(elements.verdictButton, true, "裁决");
  elements.valuationVerdict.innerHTML = '<div class="empty-state">正在深挖公告、新闻、财务、估值和市场反应，然后做最终裁决...</div>';
  try {
    const payload = await apiJson(`/api/evidence-verdict?symbol=${encodeURIComponent(currentSymbol())}`);
    state.valuationVerdict = payload;
    renderValuationVerdict();
  } catch (error) {
    elements.valuationVerdict.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  } finally {
    setButtonBusy(elements.verdictButton, false, "裁决");
  }
}

async function runNightlyDeepDive() {
  setButtonBusy(elements.nightlyButton, true, "深挖");
  elements.nightlyDeepDive.innerHTML = jobNoticeHtml(
    "夜间深挖后台运行中",
    null,
    "正在启动后台任务；它会深挖更多标的、同步观察单、做 dry-run 触发复查，并缓存完整结果。",
  );
  try {
    const payload = await apiJson("/api/nightly-deep-dive/job?limit=120&focusLimit=24&capital=100000");
    state.jobs.nightly = payload.job;
    if (payload.latest) {
      state.nightly = payload.latest;
      renderNightlyDeepDive();
      prependJobNotice(elements.nightlyDeepDive, "正在后台刷新夜间深挖", payload.job, "先显示最近一次深挖结果；新结果完成后会自动替换。");
    } else {
      elements.nightlyDeepDive.innerHTML = jobNoticeHtml("正在后台生成第一份夜间深挖", payload.job);
    }
    setButtonBusy(elements.nightlyButton, false, "深挖");
    pollJob(payload.job, {
      onDone: (result) => {
        state.nightly = result;
        state.briefing = result.briefing?.items || state.briefing;
        state.briefingMeta = result.briefing || state.briefingMeta;
        state.dailyPicks = result.dailyPicks || state.dailyPicks;
        renderNightlyDeepDive();
        if (state.briefing?.length) renderBriefing();
        if (state.dailyPicks) renderDailyPicks();
        prependJobNotice(elements.nightlyDeepDive, "夜间深挖已更新", payload.job, "这是后台任务刚生成的新结果。");
      },
      onFail: (message) => {
        elements.nightlyDeepDive.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
      },
      onSettled: () => setButtonBusy(elements.nightlyButton, false, "深挖"),
    });
  } catch (error) {
    elements.nightlyDeepDive.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    setButtonBusy(elements.nightlyButton, false, "深挖");
  }
}

function renderNightlyDeepDive() {
  const payload = state.nightly;
  if (!payload) {
    elements.nightlyDeepDive.innerHTML = '<div class="empty-state">暂无夜间深挖缓存。点击“深挖”后台跑一轮，完成后下次打开会直接显示。</div>';
    return;
  }
  const scan = payload.scan || {};
  const topPicks = (payload.dailyPicks?.items || []).filter((item) => !item.error).slice(0, 4);
  const watchItems = payload.watchOrderProcessing?.reviewItems || [];
  elements.nightlyDeepDive.innerHTML = `
    <div class="mini-metrics">
      ${metricBox("深挖标的", scan.briefingScanned ?? "-")}
      ${metricBox("候选扫描", scan.dailyPickScanned ?? "-")}
      ${metricBox("强买", scan.strongBuys ?? 0)}
      ${metricBox("观察单新增", scan.watchOrdersAdded ?? 0)}
      ${metricBox("触发复查", scan.triggeredWatchOrders ?? 0)}
      ${metricBox("更新时间", formatDateTime(payload.generatedAt))}
    </div>
    <article class="nightly-item">
      <strong>夜间结果怎么用</strong>
      <span>第二天先看强买/观察排序，再打开对应公司证据和 K 线；观察单触发只进模拟盘，不会真实下单。</span>
    </article>
    ${
      topPicks.length
        ? `<article class="nightly-item"><strong>缓存候选前排</strong>${topPicks
            .map(
              (item) =>
                `<span>${escapeHtml(displayStockName(item))} · ${escapeHtml(item.signalGrade || item.action)} · ${escapeHtml(item.score)}分 · ${escapeHtml(
                  shortText(item.topDriver || item.theme || "", 70),
                )}</span>`,
            )
            .join("")}</article>`
        : '<article class="nightly-item"><strong>缓存候选前排</strong><span>还没有候选结果，等待后台任务完成。</span></article>'
    }
    ${
      watchItems.length
        ? `<article class="nightly-item"><strong>观察单触发</strong>${watchItems
            .slice(0, 5)
            .map((item) => `<span>${escapeHtml(displayStockName(item))} · ${escapeHtml(item.action)} · ${escapeHtml(item.note || "")}</span>`)
            .join("")}</article>`
        : '<article class="nightly-item"><strong>观察单触发</strong><span>本轮没有观察单满足自动模拟或错过归因条件。</span></article>'
    }
  `;
}

async function loadLatestBackgroundResults() {
  const [briefingResult, picksResult, cycleResult, aiMispricingResult, nightlyResult] = await Promise.allSettled([
    apiJson("/api/briefing/latest"),
    apiJson("/api/daily-picks/latest"),
    apiJson("/api/daily-cycle/latest"),
    apiJson("/api/ai-mispricing/latest"),
    apiJson("/api/nightly-deep-dive/latest"),
  ]);
  if (briefingResult.status === "fulfilled") {
    const payload = briefingResult.value;
    if (payload.latest) {
      state.briefing = payload.latest.items || [];
      state.briefingMeta = payload.latest;
      elements.briefingSubtitle.textContent = new Date(payload.latest.generatedAt).toLocaleString();
      renderBriefing();
      syncBriefingWatchOrders();
    }
    if (payload.runningJob) {
      elements.briefingButton.disabled = true;
      elements.briefingButton.textContent = "生成中";
      prependJobNotice(elements.briefingList, "每日简报后台任务仍在运行", payload.runningJob, "保留最近结果，任务完成后自动刷新。");
      pollJob(payload.runningJob, {
        onDone: (result) => {
          state.briefing = result.items || [];
          state.briefingMeta = result;
          elements.briefingSubtitle.textContent = new Date(result.generatedAt).toLocaleString();
          renderBriefing();
          prependJobNotice(elements.briefingList, "每日简报已更新", payload.runningJob);
          loadInvestorQa();
          loadBriefingOutcomes();
          syncBriefingWatchOrders();
        },
        onFail: (message) => {
          prependJobNotice(elements.briefingList, "每日简报后台任务失败", payload.runningJob, message);
        },
        onSettled: () => {
          elements.briefingButton.disabled = false;
          elements.briefingButton.textContent = "生成";
        },
      });
    }
  }
  if (picksResult.status === "fulfilled") {
    const payload = picksResult.value;
    if (payload.latest) {
      state.dailyPicks = payload.latest;
      renderDailyPicks();
    }
    if (payload.runningJob) {
      setButtonBusy(elements.dailyPicksButton, true, "推荐");
      prependJobNotice(elements.dailyPicks, "每日推荐后台任务仍在运行", payload.runningJob, "保留最近结果，任务完成后自动刷新。");
      pollJob(payload.runningJob, {
        onDone: (result) => {
          state.dailyPicks = result;
          renderDailyPicks();
          prependJobNotice(elements.dailyPicks, "每日推荐已更新", payload.runningJob);
        },
        onFail: (message) => {
          prependJobNotice(elements.dailyPicks, "每日推荐后台任务失败", payload.runningJob, message);
        },
        onSettled: () => setButtonBusy(elements.dailyPicksButton, false, "推荐"),
      });
    }
  }
  if (cycleResult.status === "fulfilled") {
    const payload = cycleResult.value;
    if (payload.latest) {
      state.cycle = payload.latest;
      state.dailyPicks = state.cycle.dailyPicks || state.dailyPicks;
      state.paper = state.cycle.paper || state.paper;
      if (state.dailyPicks) renderDailyPicks();
      if (state.paper) renderPaperPortfolio();
      renderDailyCycle();
    }
    if (payload.runningJob) {
      setButtonBusy(elements.cycleButton, true, "闭环");
      prependJobNotice(elements.dailyCycle, "实战闭环后台任务仍在运行", payload.runningJob, "保留最近结果，任务完成后自动刷新。");
      pollJob(payload.runningJob, {
        onDone: (result) => {
          state.cycle = result;
          state.dailyPicks = state.cycle.dailyPicks;
          state.paper = state.cycle.paper;
          renderDailyPicks();
          renderPaperPortfolio();
          renderDailyCycle();
          prependJobNotice(elements.dailyCycle, "实战闭环已更新", payload.runningJob);
        },
        onFail: (message) => {
          prependJobNotice(elements.dailyCycle, "实战闭环后台任务失败", payload.runningJob, message);
        },
        onSettled: () => setButtonBusy(elements.cycleButton, false, "闭环"),
      });
    }
  }
  if (aiMispricingResult.status === "fulfilled") {
    const payload = aiMispricingResult.value;
    if (payload.latest) {
      state.aiMispricing = payload.latest;
      renderAiMispricing();
    }
    if (payload.runningJob) {
      setButtonBusy(elements.aiMispricingButton, true, "AI错价");
      prependJobNotice(elements.aiMispricing, "AI错价扫描后台任务仍在运行", payload.runningJob, "保留最近结果，任务完成后自动刷新。");
      pollJob(payload.runningJob, {
        onDone: (result) => {
          state.aiMispricing = result;
          renderAiMispricing();
          prependJobNotice(elements.aiMispricing, "AI错价扫描已更新", payload.runningJob);
        },
        onFail: (message) => {
          prependJobNotice(elements.aiMispricing, "AI错价扫描后台任务失败", payload.runningJob, message);
        },
        onSettled: () => setButtonBusy(elements.aiMispricingButton, false, "AI错价"),
      });
    }
  }
  if (nightlyResult.status === "fulfilled") {
    const payload = nightlyResult.value;
    if (payload.latest) {
      state.nightly = payload.latest;
      renderNightlyDeepDive();
    }
    if (payload.runningJob) {
      setButtonBusy(elements.nightlyButton, true, "深挖");
      prependJobNotice(elements.nightlyDeepDive, "夜间深挖后台任务仍在运行", payload.runningJob, "保留最近结果，任务完成后自动刷新。");
      pollJob(payload.runningJob, {
        onDone: (result) => {
          state.nightly = result;
          renderNightlyDeepDive();
          prependJobNotice(elements.nightlyDeepDive, "夜间深挖已更新", payload.runningJob);
        },
        onFail: (message) => {
          prependJobNotice(elements.nightlyDeepDive, "夜间深挖后台任务失败", payload.runningJob, message);
        },
        onSettled: () => setButtonBusy(elements.nightlyButton, false, "深挖"),
      });
    }
  }
}

async function runDiagnostics() {
  setButtonBusy(elements.diagnosticsButton, true, "自检");
  elements.systemDiagnostics.innerHTML = '<div class="empty-state">正在自检：数据源、候选扫描、模拟盘、风控和复盘样本...</div>';
  try {
    state.diagnostics = await apiJson("/api/diagnostics?sample=2");
    renderDiagnostics();
  } catch (error) {
    elements.systemDiagnostics.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  } finally {
    setButtonBusy(elements.diagnosticsButton, false, "自检");
  }
}

function diagnosticLevelClass(level) {
  if (level === "bad") return "is-sell";
  if (level === "warn") return "is-watch";
  return "is-buy";
}

function renderDiagnostics() {
  const diagnostics = state.diagnostics || {};
  const metrics = diagnostics.metrics || {};
  elements.systemDiagnostics.innerHTML = `
    <div class="diagnostic-head">
      <strong>${escapeHtml(diagnostics.status || "-")}</strong>
      <span>${escapeHtml(diagnostics.score ?? "-")} 分 · ${escapeHtml(formatDateTime(diagnostics.generatedAt))}</span>
    </div>
    <div class="mini-metrics">
      ${metricBox("自选", metrics.watchlistCount ?? "-")}
      ${metricBox("报告", metrics.reportFiles ?? "-")}
      ${metricBox("候选均分", metrics.avgCandidateScore ?? "-")}
      ${metricBox("强买", metrics.strongBuys ?? "-")}
      ${metricBox("持仓", metrics.openPositions ?? "-")}
      ${metricBox("模拟收益", formatPct(metrics.paperReturnPct))}
    </div>
    <div class="diagnostic-checks">
      ${(diagnostics.checks || [])
        .map(
          (item) => `
            <article class="diagnostic-item">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.detail)}</span>
                ${item.action ? `<small>${escapeHtml(item.action)}</small>` : ""}
              </div>
              <b class="signal-badge ${diagnosticLevelClass(item.level)}">${escapeHtml(item.level === "bad" ? "修" : item.level === "warn" ? "警告" : "通过")}</b>
            </article>
          `,
        )
        .join("")}
    </div>
    <div class="cycle-section">
      <strong>耗时</strong>
      ${(diagnostics.timings || [])
        .map((item) => `<span>${escapeHtml(item.label)} · ${escapeHtml(item.ok ? `${(item.ms / 1000).toFixed(1)}s` : item.error)}</span>`)
        .join("")}
    </div>
    <div class="cycle-section">
      <strong>系统建议的下一步</strong>
      ${(diagnostics.nextUpgrades || []).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
  renderNextUpgrades(
    (diagnostics.nextUpgrades || []).slice(0, 4).map((item, index) => ({
      title: item,
      detail:
        index === 0
          ? "优先解决投入使用前最影响判断质量的问题。"
          : "完成后再进入更严格的模拟盘连续验证。",
      status: index === 0 ? "优先" : "排队",
    })),
  );
}

async function loadInvestorQa() {
  if (!elements.investorQa) return;
  elements.investorQa.innerHTML = '<div class="empty-state">正在质检：简报可信度、推荐纪律、模拟盘和冗余信息...</div>';
  try {
    const payload = await apiJson("/api/investor-qa");
    renderInvestorQa(payload);
  } catch (error) {
    elements.investorQa.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function qaLevelClass(level) {
  if (level === "严重") return "is-sell";
  if (level === "警告") return "is-watch";
  return "is-buy";
}

function renderInvestorQa(payload) {
  const checks = payload.checks || [];
  const metrics = payload.metrics || {};
  elements.investorQa.innerHTML = `
    <div class="mini-metrics">
      ${metricBox("简报", metrics.briefingItems ?? "-")}
      ${metricBox("简报买入", metrics.briefingBuys ?? "-")}
      ${metricBox("推荐强买", metrics.strongBuys ?? "-")}
      ${metricBox("证据缺口", metrics.missingEvidence ?? "-")}
      ${metricBox("观察单", metrics.watchOrders ?? "-")}
      ${metricBox("待复查", metrics.triggeredWatchOrders ?? "-")}
      ${metricBox("观察样本", metrics.briefingSignals ?? "-")}
      ${metricBox("1日成熟", metrics.mature1d ?? "-")}
      ${metricBox("5日成熟", metrics.mature5d ?? "-")}
      ${metricBox("20日成熟", metrics.mature20d ?? "-")}
      ${metricBox("空话命中", metrics.vagueHits ?? "-")}
      ${metricBox("质检", payload.status || "-")}
    </div>
    <div class="diagnostic-checks">
      ${checks
        .map(
          (item) => `
            <article class="diagnostic-item">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.detail)}</span>
                <small>${escapeHtml(item.action)}</small>
              </div>
              <b class="signal-badge ${qaLevelClass(item.level)}">${escapeHtml(item.level)}</b>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
  if (payload.nextUpgrades?.length) {
    renderNextUpgrades(
      payload.nextUpgrades.slice(0, 4).map((item, index) => ({
        title: item,
        detail: index === 0 ? "这是投资者质检识别出的最高优先级问题。" : "完成后继续跑模拟验证。",
        status: index === 0 ? "优先" : "排队",
      })),
    );
  } else {
    renderNextUpgrades([
      {
        title: "错过机会归因",
        detail: "把观望后 5 日涨超 5% 的样本拉出来，反查当时为什么没买，是证据不足还是规则太保守。",
        status: "优先",
      },
      {
        title: "触发后自动模拟成交",
        detail: "观察单满足结构化条件后自动虚拟买入/卖出，并记录触发前后的 1/5/20 日收益。",
        status: "下一步",
      },
      {
        title: "夜间全量深挖",
        detail: "白天快筛 8 只，夜间后台深挖 74 只并缓存，第二天打开直接看完整结果。",
        status: "排队",
      },
    ]);
  }
}

function outcomeActionClass(action) {
  if (action === "买入") return "is-buy";
  if (action === "卖出") return "is-sell";
  return "is-watch";
}

function outcomeDirectionLabel(action, value) {
  if (!Number.isFinite(value)) return "未成熟";
  if (!["买入", "卖出"].includes(action)) return "观察";
  return value > 0 ? "方向对" : "方向错";
}

function outcomeRawLabel(value) {
  if (!Number.isFinite(value)) return "未成熟";
  if (value > 0) return "观察后涨";
  if (value < 0) return "观察后跌";
  return "观察持平";
}

function friendlyOutcomeWhy(value) {
  const text = String(value || "");
  if (text.includes("价格异动本身偏强")) return "当时量价偏强，但缺少公司级硬证据";
  if (text.includes("价格异动本身偏弱")) return "当时量价偏弱，不支持开新仓";
  if (text.includes("新闻密度最高")) return "当时只有主题热度，未确认公司直接受益";
  if (text.includes("成交量放大")) return "当时成交量放大，但需要验证资金是否持续";
  return text || "暂无当时理由";
}

function renderBriefingOutcomes(payload) {
  if (!elements.briefingOutcomes) return;
  const summary = payload.summary || {};
  const rows = payload.rows || [];
  const review = payload.watchReview || {};
  const horizonLabels = { "1d": "1日", "5d": "5日", "20d": "20日" };
  const summaryHtml = Object.entries(horizonLabels)
    .map(([key, label]) => {
      const item = summary[key] || {};
      return `
        <article class="outcome-summary-item">
          <strong>${escapeHtml(label)}</strong>
          <span>可行动 ${escapeHtml(item.actionableSamples ?? 0)} 个 · 买入 ${escapeHtml(item.buySamples ?? 0)} / 卖出 ${escapeHtml(item.sellSamples ?? 0)}</span>
          <b>${escapeHtml(formatPct(item.hitRate))}</b>
          <small>观察 ${escapeHtml(item.watchSamples ?? 0)} 个 · 错过大涨 ${escapeHtml(item.watchMissedUpside ?? 0)} · 避开大跌 ${escapeHtml(item.watchAvoidedDownside ?? 0)}</small>
          <small>平均方向收益 ${escapeHtml(formatPct(item.avgDirectionReturn))} · 观察均值 ${escapeHtml(formatPct(item.watchAvgReturn))}</small>
        </article>
      `;
    })
    .join("");
  const rowsHtml = rows.length
    ? rows
        .slice(0, 10)
        .map((item) => {
          const name = displayStockName(item);
          const actionable = ["买入", "卖出"].includes(item.action);
          const direction5d = actionable ? item.directionReturns?.["5d"] : item.returns?.["5d"];
          return `
            <article class="outcome-row">
              <div class="outcome-main">
                <strong>${escapeHtml(name)}</strong>
                <span>${escapeHtml(formatDateTime(item.generatedAt))} · 入场参考 ${escapeHtml(formatPrice(item.entryPrice))}</span>
                <small>${escapeHtml(shortText(friendlyOutcomeWhy(item.decisionWhy), 74))}</small>
              </div>
              <b class="briefing-action ${outcomeActionClass(item.action)}">${escapeHtml(item.action || "观望")}</b>
              <div class="outcome-return-grid">
                ${Object.entries(horizonLabels)
                  .map(([key, label]) => {
                    const direction = item.directionReturns?.[key];
                    const raw = item.returns?.[key];
                    const displayValue = actionable ? direction : raw;
                    const labelText = actionable ? outcomeDirectionLabel(item.action, direction) : outcomeRawLabel(raw);
                    return `
                      <span>
                        <small>${escapeHtml(label)} ${escapeHtml(labelText)}</small>
                        <b class="${pctClass(displayValue)}">${escapeHtml(formatPct(displayValue))}</b>
                      </span>
                    `;
                  })
                  .join("")}
              </div>
              <span class="outcome-verdict ${pctClass(direction5d)}">${escapeHtml(actionable ? outcomeDirectionLabel(item.action, direction5d) : outcomeRawLabel(direction5d))}</span>
            </article>
          `;
        })
        .join("")
    : '<div class="empty-state">暂无已成熟的简报样本，继续每天生成简报后会自动累积。</div>';
  const reviewGroupHtml = (title, items, emptyText) => `
    <article class="watch-review-group">
      <strong>${escapeHtml(title)}</strong>
      ${
        items?.length
          ? items
              .map(
                (item) => `
                  <div class="watch-review-item">
                    <b>${escapeHtml(displayStockName(item))}</b>
                    <span>${escapeHtml(horizonLabels[item.horizon] || item.horizon)} ${escapeHtml(formatPct(item.returnPct))} · 当时：${escapeHtml(shortText(friendlyOutcomeWhy(item.decisionWhy), 54))}</span>
                    <small>${escapeHtml(item.note)}</small>
                  </div>
                `,
              )
              .join("")
          : `<span class="muted-text">${escapeHtml(emptyText)}</span>`
      }
    </article>
  `;
  const rootCauseHtml = (review.rootCauses || []).length
    ? `<div class="watch-cause-grid">${(review.rootCauses || [])
        .slice(0, 4)
        .map(
          (item) => `
            <article class="watch-root-cause">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.detail)}</span>
              <small>样本 ${escapeHtml(item.count)} 个 · 规则：${escapeHtml(item.rule)}</small>
            </article>
          `,
        )
        .join("")}</div>`
    : '<div class="empty-state">暂时没有成熟的错过/避险归因样本；继续跑简报后会自动累积。</div>';
  const lessonsHtml = (review.lessons || []).length
    ? `<article class="watch-review-group">
        <strong>下次规则怎么改</strong>
        ${(review.lessons || [])
          .slice(0, 4)
          .map((item) => `<div class="watch-review-item"><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.rule)}</span><small>${escapeHtml(item.evidence)}</small></div>`)
          .join("")}
      </article>`
    : "";
  elements.briefingOutcomes.innerHTML = `
    <div class="outcome-head">
      <span>统计最近 ${escapeHtml(payload.totalReviewed ?? 0)} 条进入复盘窗口的简报，其中 ${escapeHtml(payload.actionableReviewed ?? 0)} 条曾给出买入/卖出建议。</span>
      <small>${escapeHtml(formatDateTime(payload.generatedAt))}</small>
    </div>
    <div class="outcome-summary-grid">${summaryHtml}</div>
    <div class="watch-review-grid">
      ${reviewGroupHtml("观望后错过的大涨", review.missedUpside || [], "当前没有 5日/1日 大涨但未买的样本。")}
      ${reviewGroupHtml("观望后成功避开的下跌", review.avoidedDownside || [], "当前没有 5日/1日 大跌且观望的样本。")}
    </div>
    ${rootCauseHtml}
    ${lessonsHtml}
    <div class="outcome-row-list">${rowsHtml}</div>
  `;
}

async function loadBriefingOutcomes() {
  if (!elements.briefingOutcomes) return;
  elements.briefingOutcomes.innerHTML = '<div class="empty-state">正在回看历史简报后续收益...</div>';
  try {
    state.briefingOutcomes = await apiJson("/api/briefing-outcomes?limit=80");
    renderBriefingOutcomes(state.briefingOutcomes);
  } catch (error) {
    elements.briefingOutcomes.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

async function runAutoReview() {
  setButtonBusy(elements.reviewButton, true, "复盘");
  elements.autoReview.innerHTML = '<div class="empty-state">正在复盘历史报告...</div>';
  try {
    state.review = await apiJson(`/api/review?symbol=${encodeURIComponent(currentSymbol())}`);
    renderAutoReview();
  } catch (error) {
    elements.autoReview.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  } finally {
    setButtonBusy(elements.reviewButton, false, "复盘");
  }
}

function renderAutoReview() {
  const reviews = state.review?.reviews || [];
  if (!reviews.length) {
    elements.autoReview.innerHTML = '<div class="empty-state">还没有足够历史报告，先保存几次报告。</div>';
    return;
  }
  elements.autoReview.innerHTML = reviews
    .slice(0, 4)
    .map(
      (item) => `
        <article class="review-item">
          <strong class="${pctClass(item.returnSince)}">${escapeHtml(formatPct(item.returnSince))} · ${escapeHtml(item.verdict)}</strong>
          <span>${escapeHtml(item.lesson)}</span>
        </article>
      `,
    )
    .join("");
}

async function loadDataSources() {
  try {
    state.sources = await apiJson("/api/data-sources");
    renderDataSources();
  } catch (error) {
    elements.dataSourceList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function renderDataSources() {
  const sources = state.sources || {};
  elements.dataSourceList.innerHTML = `
    <h4>当前免费/已配置的数据</h4>
    ${(sources.freeNow || [])
      .map(
        (item) => `
          <div class="source-item">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.use)} · ${escapeHtml(item.limitation)}</span>
          </div>
        `,
      )
      .join("")}
    <h4>需要付费/授权的数据</h4>
    ${(sources.paidRecommended || [])
      .map(
        (item) => `
          <div class="source-item">
            <strong>${escapeHtml(item.name)} · ${escapeHtml(item.priority)}</strong>
            <span>${escapeHtml(item.use)}</span>
          </div>
        `,
      )
      .join("")}
  `;
}

function renderAll() {
  renderOverview();
  renderChart();
  renderMemo();
  renderDrivers();
  renderTopics();
  renderEvidenceReview();
  renderNetwork();
  renderCandidates();
  renderNews();
  renderVerification();
  renderDataNotes();
}

function renderOverview() {
  const data = state.data;
  const chart = data.chart;
  const top = data.candidates?.[0];
  elements.companyName.textContent = data.companyName || chart.name || data.symbol;
  elements.symbolLabel.textContent = `${data.symbol} · ${chart.exchangeName || "unknown exchange"}`;
  elements.lastPrice.textContent = formatPrice(chart.lastClose, chart.currency);
  elements.lastDate.textContent = chart.lastDate || "-";
  elements.dayChange.textContent = formatPct(chart.dayChangePct);
  elements.dayChange.className = pctClass(chart.dayChangePct);
  elements.volumeRatio.textContent = chart.metrics.volumeRatio
    ? `成交量 ${chart.metrics.volumeRatio}x`
    : "成交量暂无";
  elements.topCandidate.textContent = top ? top.symbol : "-";
  elements.topScore.textContent = top ? `${top.name} · ${top.scores.total} 分` : "-";
}

function pointsForRange(points) {
  const map = { "3m": 63, "6m": 126, "1y": 252 };
  const count = map[state.range] || points.length;
  return points.slice(-count);
}

function renderChart() {
  syncChartControls();
  if (state.chartMode === "intraday") {
    renderIntradayChart();
    return;
  }
  renderKlineChart();
}

function chartPeriodLabel() {
  return state.klinePeriod === "week" ? "周K" : state.klinePeriod === "month" ? "月K" : "日K";
}

function aggregatePoints(points, period) {
  if (period === "day") return points;
  const groups = [];
  const keyFor = (date) => {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (period === "month") return date.slice(0, 7);
    const day = parsed.getUTCDay() || 7;
    parsed.setUTCDate(parsed.getUTCDate() - day + 1);
    return parsed.toISOString().slice(0, 10);
  };
  for (const point of points) {
    const key = keyFor(point.date);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, ...point, volume: Number(point.volume) || 0 });
      continue;
    }
    last.date = point.date;
    last.close = point.close;
    last.high = Math.max(Number(last.high) || point.high, Number(point.high) || point.close);
    last.low = Math.min(Number(last.low) || point.low, Number(point.low) || point.close);
    last.volume += Number(point.volume) || 0;
  }
  return groups.map(({ key, ...point }) => point);
}

function sma(values, period) {
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    return mean(values.slice(index + 1 - period, index + 1));
  });
}

function ema(values, period) {
  const k = 2 / (period + 1);
  let current = null;
  return values.map((value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return current;
    current = current === null ? number : number * k + current * (1 - k);
    return current;
  });
}

function withIndicators(points) {
  const closes = points.map((point) => point.close);
  const volumes = points.map((point) => Number(point.volume) || 0);
  const ma5 = sma(closes, 5);
  const ma10 = sma(closes, 10);
  const ma20 = sma(closes, 20);
  const ma30 = sma(closes, 30);
  const vma5 = sma(volumes, 5);
  const vma10 = sma(volumes, 10);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const diffs = closes.map((_, index) =>
    Number.isFinite(ema12[index]) && Number.isFinite(ema26[index]) ? ema12[index] - ema26[index] : null,
  );
  const dea = ema(diffs.map((value) => value ?? 0), 9);
  return points.map((point, index) => ({
    ...point,
    ma5: ma5[index],
    ma10: ma10[index],
    ma20: ma20[index],
    ma30: ma30[index],
    vma5: vma5[index],
    vma10: vma10[index],
    diff: diffs[index],
    dea: dea[index],
    macd: Number.isFinite(diffs[index]) && Number.isFinite(dea[index]) ? (diffs[index] - dea[index]) * 2 : null,
  }));
}

function visibleKlinePoints(points) {
  const base = pointsForRange(points);
  const windowSize = Math.max(24, Math.floor(base.length / state.chartZoom));
  const maxOffset = Math.max(0, base.length - windowSize);
  state.chartOffset = Math.max(0, Math.min(state.chartOffset, maxOffset));
  const end = base.length - state.chartOffset;
  return base.slice(Math.max(0, end - windowSize), end);
}

function drawingKey() {
  return `investgraph-drawings:${state.data?.symbol || "unknown"}:${state.klinePeriod}`;
}

function getDrawings() {
  try {
    return JSON.parse(localStorage.getItem(drawingKey()) || "[]");
  } catch (error) {
    return [];
  }
}

function saveDrawings(drawings) {
  localStorage.setItem(drawingKey(), JSON.stringify(drawings.slice(-30)));
}

function indicatorPath(points, key, xFor, yFor) {
  return points
    .map((point, index) => {
      if (!Number.isFinite(point[key])) return "";
      return `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(2)} ${yFor(point[key]).toFixed(2)}`;
    })
    .filter(Boolean)
    .join(" ");
}

function renderKlineChart() {
  const chart = state.data.chart;
  const periodPoints = withIndicators(aggregatePoints(chart.points, state.klinePeriod));
  const points = visibleKlinePoints(periodPoints);
  elements.chartSubtitle.textContent = `${chartPeriodLabel()} · ${state.range.toUpperCase()} · 缩放 ${chartZoomLabel()}x · ${
    points[0]?.date || "-"
  } 至 ${points[points.length - 1]?.date || "-"}`;
  if (points.length < 2) {
    elements.chart.innerHTML = "<p>图表数据不足。</p>";
    return;
  }

  const latest = points[points.length - 1];
  const width = 1180;
  const height = 760;
  const padding = { top: 32, right: 64, bottom: 30, left: 58 };
  const innerWidth = width - padding.left - padding.right;
  const priceTop = padding.top;
  const priceHeight = 360;
  const volumeTop = priceTop + priceHeight + 38;
  const volumeHeight = 118;
  const macdTop = volumeTop + volumeHeight + 38;
  const macdHeight = 130;
  const priceValues = points.flatMap((point) => [point.high, point.low, point.ma5, point.ma10, point.ma20, point.ma30]).filter(Number.isFinite);
  const min = Math.min(...priceValues);
  const max = Math.max(...priceValues);
  const spread = max - min || 1;
  const yMin = min - spread * 0.08;
  const yMax = max + spread * 0.08;
  const maxVolume = Math.max(...points.map((point) => Number(point.volume) || 0), 1);
  const macdValues = points.flatMap((point) => [point.macd, point.diff, point.dea]).filter(Number.isFinite);
  const macdMax = Math.max(...macdValues.map(Math.abs), 0.01);
  const step = innerWidth / points.length;
  const candleWidth = Math.max(2, Math.min(10, step * 0.58));
  const xFor = (index) => padding.left + (index + 0.5) * step;
  const yFor = (value) => priceTop + ((yMax - value) / (yMax - yMin)) * priceHeight;
  const yVolume = (value) => volumeTop + (1 - ((Number(value) || 0) / maxVolume)) * volumeHeight;
  const yMacd = (value) => macdTop + macdHeight / 2 - (value / macdMax) * (macdHeight / 2 - 8);
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) / 4) * index);
  const xTicks = [0, Math.floor(points.length / 2), points.length - 1];
  const drawings = getDrawings();
  const dateIndex = new Map(points.map((point, index) => [point.date, index]));
  const drawingNodes = drawings
    .map((line, index) => {
      const start = dateIndex.get(line.startDate);
      const end = dateIndex.get(line.endDate);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
      return `<line class="draw-line" data-drawing-index="${index}" x1="${xFor(start).toFixed(2)}" y1="${yFor(line.startPrice).toFixed(
        2,
      )}" x2="${xFor(end).toFixed(2)}" y2="${yFor(line.endPrice).toFixed(2)}"></line>`;
    })
    .join("");
  const candleNodes = points
    .map((point, index) => {
      const open = Number.isFinite(point.open) ? point.open : point.close;
      const close = point.close;
      const high = Number.isFinite(point.high) ? point.high : Math.max(open, close);
      const low = Number.isFinite(point.low) ? point.low : Math.min(open, close);
      const up = close >= open;
      const x = xFor(index);
      const bodyY = Math.min(yFor(open), yFor(close));
      const bodyHeight = Math.max(1.2, Math.abs(yFor(open) - yFor(close)));
      const volumeY = yVolume(point.volume);
      const volumeBarHeight = Math.max(1, volumeTop + volumeHeight - volumeY);
      const macdY = yMacd(point.macd || 0);
      const macdZero = yMacd(0);
      return `
        <g class="terminal-candle ${up ? "terminal-up" : "terminal-down"}" data-candle-index="${index}">
          <line x1="${x.toFixed(2)}" y1="${yFor(high).toFixed(2)}" x2="${x.toFixed(2)}" y2="${yFor(low).toFixed(2)}"></line>
          <rect x="${(x - candleWidth / 2).toFixed(2)}" y="${bodyY.toFixed(2)}" width="${candleWidth.toFixed(2)}" height="${bodyHeight.toFixed(2)}"></rect>
          <rect class="terminal-volume-bar" x="${(x - candleWidth / 2).toFixed(2)}" y="${volumeY.toFixed(2)}" width="${candleWidth.toFixed(
            2,
          )}" height="${volumeBarHeight.toFixed(2)}"></rect>
          <line class="macd-bar" x1="${x.toFixed(2)}" y1="${macdZero.toFixed(2)}" x2="${x.toFixed(2)}" y2="${macdY.toFixed(2)}"></line>
        </g>
        <rect class="chart-hitbox" data-point-index="${index}" x="${(padding.left + index * step).toFixed(2)}" y="${priceTop}" width="${Math.max(
          3,
          step,
        ).toFixed(2)}" height="${(macdTop + macdHeight - priceTop).toFixed(2)}"></rect>
      `;
    })
    .join("");
  const maLegend = `日线 ${formatPrice(latest.close)} M5:${formatPrice(latest.ma5)} M10:${formatPrice(latest.ma10)} M20:${formatPrice(
    latest.ma20,
  )} M30:${formatPrice(latest.ma30)}`;

  elements.chart.innerHTML = `
    <div class="terminal-chart ${state.drawingMode ? "is-drawing" : ""}">
      <div class="terminal-quote">
        <div>
          <strong>${escapeHtml(state.data.companyName)} ${escapeHtml(state.data.symbol)}</strong>
          <span class="${pctClass(state.data.chart.dayChangePct)}">${escapeHtml(formatPrice(chart.lastClose, chart.currency))} · ${escapeHtml(
            formatPct(chart.dayChangePct),
          )}</span>
        </div>
        <div><span>最高</span><strong>${escapeHtml(formatPrice(latest.high, chart.currency))}</strong></div>
        <div><span>最低</span><strong>${escapeHtml(formatPrice(latest.low, chart.currency))}</strong></div>
        <div><span>开盘</span><strong>${escapeHtml(formatPrice(latest.open, chart.currency))}</strong></div>
        <div><span>成交量</span><strong>${escapeHtml(compactVolume(latest.volume))}</strong></div>
      </div>
      <div class="terminal-legend">
        <span>${escapeHtml(maLegend)}</span>
        <span>MACD:${escapeHtml(formatPrice(latest.macd))} DIFF:${escapeHtml(formatPrice(latest.diff))} DEA:${escapeHtml(formatPrice(latest.dea))}</span>
        <span>${state.drawingMode ? "画线中：在K线图上点两次" : "触控板捏合或 +/- 可缩放，横向滑动可平移"}</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chart.symbol)} technical chart">
        ${yTicks
          .map((tick) => {
            const y = yFor(tick);
            return `<line class="terminal-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line><text x="12" y="${y + 4}" class="terminal-axis-text">${escapeHtml(
              tick.toFixed(2),
            )}</text>`;
          })
          .join("")}
        ${xTicks
          .map((index) => {
            const x = xFor(index);
            const label = points[index]?.date || "";
            return `<line class="terminal-grid" x1="${x}" y1="${priceTop}" x2="${x}" y2="${macdTop + macdHeight}"></line><text x="${x}" y="${
              priceTop + priceHeight + 22
            }" class="terminal-axis-text" text-anchor="middle">${escapeHtml(label)}</text>`;
          })
          .join("")}
        <line class="terminal-section" x1="${padding.left}" y1="${priceTop + priceHeight}" x2="${width - padding.right}" y2="${priceTop + priceHeight}"></line>
        <line class="terminal-section" x1="${padding.left}" y1="${volumeTop + volumeHeight}" x2="${width - padding.right}" y2="${volumeTop + volumeHeight}"></line>
        <line class="terminal-section" x1="${padding.left}" y1="${yMacd(0)}" x2="${width - padding.right}" y2="${yMacd(0)}"></line>
        <path class="ma-line ma5" d="${indicatorPath(points, "ma5", xFor, yFor)}"></path>
        <path class="ma-line ma10" d="${indicatorPath(points, "ma10", xFor, yFor)}"></path>
        <path class="ma-line ma20" d="${indicatorPath(points, "ma20", xFor, yFor)}"></path>
        <path class="ma-line ma30" d="${indicatorPath(points, "ma30", xFor, yFor)}"></path>
        <path class="ma-line vma5" d="${indicatorPath(points, "vma5", xFor, yVolume)}"></path>
        <path class="ma-line vma10" d="${indicatorPath(points, "vma10", xFor, yVolume)}"></path>
        <path class="ma-line diff" d="${indicatorPath(points, "diff", xFor, yMacd)}"></path>
        <path class="ma-line dea" d="${indicatorPath(points, "dea", xFor, yMacd)}"></path>
        ${candleNodes}
        ${drawingNodes}
      </svg>
      <div class="daily-detail" id="daily-detail"></div>
      <div class="daily-table-wrap terminal-table-wrap">
        <table class="daily-table terminal-table">
          <thead><tr><th>日期</th><th>开</th><th>高</th><th>低</th><th>收</th><th>涨跌</th><th>成交量</th><th>M5</th><th>M10</th><th>MACD</th></tr></thead>
          <tbody>
            ${points
              .map((point, index) => ({ point, index }))
              .reverse()
              .map(({ point, index }) => renderTerminalDailyRow(point, points[index - 1], index))
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  installTerminalInteractions(points, chart.currency);
}

async function loadIntraday() {
  if (!state.data?.symbol || state.intradayLoading) return;
  state.intradayLoading = true;
  try {
    state.intraday = await apiJson(`/api/intraday?symbol=${encodeURIComponent(state.data.symbol)}`);
  } finally {
    state.intradayLoading = false;
  }
  if (state.chartMode === "intraday") renderIntradayChart();
}

function renderIntradayChart() {
  if (!state.intraday || state.intraday.symbol !== state.data?.symbol) {
    elements.chartSubtitle.textContent = "分时 · 正在拉取免费分钟数据";
    elements.chart.innerHTML = '<div class="empty-state">正在加载分时数据...</div>';
    loadIntraday().catch((error) => {
      elements.chart.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    });
    return;
  }
  const payload = state.intraday;
  const points = payload.points || [];
  elements.chartSubtitle.textContent = `分时 · ${payload.source || "免费源"} · ${points[0]?.time || "-"} 至 ${points[points.length - 1]?.time || "-"}`;
  if (points.length < 2) {
    elements.chart.innerHTML = `<div class="empty-state">${escapeHtml(payload.error || "免费分时数据暂不可用。")}</div>`;
    return;
  }
  const width = 1180;
  const height = 560;
  const padding = { top: 26, right: 58, bottom: 34, left: 58 };
  const innerWidth = width - padding.left - padding.right;
  const priceHeight = 340;
  const volumeTop = padding.top + priceHeight + 36;
  const volumeHeight = 110;
  const values = points.flatMap((point) => [point.close, point.average]).filter(Number.isFinite);
  const min = Math.min(...values, payload.previousClose || values[0]);
  const max = Math.max(...values, payload.previousClose || values[0]);
  const spread = max - min || 1;
  const yMin = min - spread * 0.12;
  const yMax = max + spread * 0.12;
  const maxVolume = Math.max(...points.map((point) => Number(point.volume) || 0), 1);
  const xFor = (index) => padding.left + (index / (points.length - 1)) * innerWidth;
  const yFor = (value) => padding.top + ((yMax - value) / (yMax - yMin)) * priceHeight;
  const yVolume = (value) => volumeTop + (1 - ((Number(value) || 0) / maxVolume)) * volumeHeight;
  const line = (key) =>
    points
      .map((point, index) => (Number.isFinite(point[key]) ? `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(2)} ${yFor(point[key]).toFixed(2)}` : ""))
      .filter(Boolean)
      .join(" ");
  const volumeBars = points
    .map((point, index) => {
      const x = xFor(index);
      const barWidth = Math.max(1.2, innerWidth / points.length * 0.62);
      const y = yVolume(point.volume);
      const previous = points[index - 1]?.close ?? point.open;
      const up = point.close >= previous;
      return `<rect class="${up ? "minute-up" : "minute-down"}" data-minute-index="${index}" x="${(x - barWidth / 2).toFixed(2)}" y="${y.toFixed(
        2,
      )}" width="${barWidth.toFixed(2)}" height="${Math.max(1, volumeTop + volumeHeight - y).toFixed(2)}"></rect>`;
    })
    .join("");
  elements.chart.innerHTML = `
    <div class="terminal-chart">
      <div class="terminal-quote">
        <div><strong>${escapeHtml(payload.companyName)} ${escapeHtml(payload.symbol)}</strong><span>${escapeHtml(payload.source || "分时")}</span></div>
        <div><span>最新</span><strong>${escapeHtml(formatPrice(points[points.length - 1].close, payload.currency))}</strong></div>
        <div><span>均价</span><strong>${escapeHtml(formatPrice(points[points.length - 1].average, payload.currency))}</strong></div>
        <div><span>昨收</span><strong>${escapeHtml(formatPrice(payload.previousClose, payload.currency))}</strong></div>
        <div><span>分钟数</span><strong>${escapeHtml(points.length)}</strong></div>
      </div>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(payload.symbol)} intraday chart">
        ${Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) / 4) * index)
          .map((tick) => `<line class="terminal-grid" x1="${padding.left}" y1="${yFor(tick)}" x2="${width - padding.right}" y2="${yFor(tick)}"></line><text x="12" y="${yFor(tick) + 4}" class="terminal-axis-text">${tick.toFixed(2)}</text>`)
          .join("")}
        ${payload.previousClose ? `<line class="prev-close-line" x1="${padding.left}" y1="${yFor(payload.previousClose)}" x2="${width - padding.right}" y2="${yFor(payload.previousClose)}"></line>` : ""}
        <path class="minute-price-line" d="${line("close")}"></path>
        <path class="minute-average-line" d="${line("average")}"></path>
        <line class="terminal-section" x1="${padding.left}" y1="${padding.top + priceHeight}" x2="${width - padding.right}" y2="${padding.top + priceHeight}"></line>
        ${volumeBars}
        ${points
          .map((_, index) => `<rect class="chart-hitbox" data-minute-index="${index}" x="${(padding.left + (index / points.length) * innerWidth).toFixed(2)}" y="${padding.top}" width="${Math.max(3, innerWidth / points.length).toFixed(2)}" height="${(volumeTop + volumeHeight - padding.top).toFixed(2)}"></rect>`)
          .join("")}
      </svg>
      <div class="daily-detail" id="daily-detail"></div>
      <div class="daily-table-wrap terminal-table-wrap">
        <table class="daily-table terminal-table">
          <thead><tr><th>时间</th><th>开</th><th>高</th><th>低</th><th>价</th><th>均价</th><th>成交量</th><th>成交额</th></tr></thead>
          <tbody>
            ${points
              .map((point, index) => ({ point, index }))
              .reverse()
              .map(({ point, index }) => renderMinuteRow(point, index, payload.currency))
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  installIntradayInteractions(points, payload.currency);
}

function dailyPointStats(point, previous) {
  const open = Number.isFinite(point.open) ? point.open : point.close;
  const high = Number.isFinite(point.high) ? point.high : Math.max(open, point.close);
  const low = Number.isFinite(point.low) ? point.low : Math.min(open, point.close);
  const priorClose = Number.isFinite(previous?.close) ? previous.close : open;
  return {
    open,
    high,
    low,
    close: point.close,
    change: point.close - priorClose,
    changePct: pct(point.close, priorClose),
  };
}

function renderDailyDetail(point, previous, currency) {
  const stats = dailyPointStats(point, previous);
  return `
    <div>
      <span>日期</span>
      <strong>${escapeHtml(point.date || "-")}</strong>
    </div>
    <div>
      <span>开 / 高 / 低 / 收</span>
      <strong>${escapeHtml(formatPrice(stats.open, currency))} / ${escapeHtml(formatPrice(stats.high, currency))} / ${escapeHtml(formatPrice(stats.low, currency))} / ${escapeHtml(formatPrice(stats.close, currency))}</strong>
    </div>
    <div>
      <span>涨跌</span>
      <strong class="${pctClass(stats.changePct)}">${escapeHtml(formatPct(stats.changePct))} · ${escapeHtml(formatPrice(stats.change, currency))}</strong>
    </div>
    <div>
      <span>成交量</span>
      <strong>${escapeHtml(compactVolume(point.volume))}</strong>
    </div>
  `;
}

function renderDailyRow(point, previous, index, currency) {
  const stats = dailyPointStats(point, previous);
  return `
    <tr data-table-point-index="${index}">
      <td>${escapeHtml(point.date || "-")}</td>
      <td>${escapeHtml(formatPrice(stats.open))}</td>
      <td>${escapeHtml(formatPrice(stats.high))}</td>
      <td>${escapeHtml(formatPrice(stats.low))}</td>
      <td>${escapeHtml(formatPrice(stats.close))}</td>
      <td class="${pctClass(stats.changePct)}">${escapeHtml(formatPct(stats.changePct))}</td>
      <td>${escapeHtml(compactVolume(point.volume))}</td>
    </tr>
  `;
}

function installDailyChartInteractions(points, currency) {
  const detail = elements.chart.querySelector("#daily-detail");
  const setActivePoint = (index) => {
    const point = points[index];
    if (!point || !detail) return;
    detail.innerHTML = renderDailyDetail(point, points[index - 1], currency);
    elements.chart.querySelectorAll(".candle.is-active").forEach((item) => item.classList.remove("is-active"));
    elements.chart.querySelector(`[data-candle-index="${index}"]`)?.classList.add("is-active");
    elements.chart.querySelectorAll(".daily-table tr.is-active").forEach((item) => item.classList.remove("is-active"));
    elements.chart.querySelector(`[data-table-point-index="${index}"]`)?.classList.add("is-active");
  };
  elements.chart.querySelectorAll("[data-point-index], [data-table-point-index]").forEach((item) => {
    item.addEventListener("mouseenter", () => setActivePoint(Number(item.dataset.pointIndex ?? item.dataset.tablePointIndex)));
    item.addEventListener("click", () => setActivePoint(Number(item.dataset.pointIndex ?? item.dataset.tablePointIndex)));
  });
  setActivePoint(points.length - 1);
}

function renderTerminalDailyRow(point, previous, index) {
  const stats = dailyPointStats(point, previous);
  return `
    <tr data-table-point-index="${index}">
      <td>${escapeHtml(point.date || "-")}</td>
      <td>${escapeHtml(formatPrice(stats.open))}</td>
      <td>${escapeHtml(formatPrice(stats.high))}</td>
      <td>${escapeHtml(formatPrice(stats.low))}</td>
      <td>${escapeHtml(formatPrice(stats.close))}</td>
      <td class="${pctClass(stats.changePct)}">${escapeHtml(formatPct(stats.changePct))}</td>
      <td>${escapeHtml(compactVolume(point.volume))}</td>
      <td>${escapeHtml(formatPrice(point.ma5))}</td>
      <td>${escapeHtml(formatPrice(point.ma10))}</td>
      <td class="${pctClass(point.macd)}">${escapeHtml(formatPrice(point.macd))}</td>
    </tr>
  `;
}

function installTerminalInteractions(points, currency) {
  const detail = elements.chart.querySelector("#daily-detail");
  const setActivePoint = (index) => {
    const point = points[index];
    if (!point || !detail) return;
    detail.innerHTML = renderDailyDetail(point, points[index - 1], currency);
    elements.chart.querySelectorAll(".terminal-candle.is-active").forEach((item) => item.classList.remove("is-active"));
    elements.chart.querySelector(`[data-candle-index="${index}"]`)?.classList.add("is-active");
    elements.chart.querySelectorAll(".daily-table tr.is-active").forEach((item) => item.classList.remove("is-active"));
    elements.chart.querySelector(`[data-table-point-index="${index}"]`)?.classList.add("is-active");
  };
  elements.chart.querySelectorAll("[data-point-index], [data-table-point-index]").forEach((item) => {
    const indexFor = () => Number(item.dataset.pointIndex ?? item.dataset.tablePointIndex);
    item.addEventListener("mouseenter", () => setActivePoint(indexFor()));
    item.addEventListener("click", () => {
      const index = indexFor();
      const point = points[index];
      setActivePoint(index);
      if (!state.drawingMode || !point) return;
      if (!state.pendingDrawPoint) {
        state.pendingDrawPoint = { date: point.date, price: point.close };
        setStatus(`画线起点：${point.date} ${formatPrice(point.close)}`, "ready");
        return;
      }
      const drawings = getDrawings();
      drawings.push({
        startDate: state.pendingDrawPoint.date,
        startPrice: state.pendingDrawPoint.price,
        endDate: point.date,
        endPrice: point.close,
      });
      state.pendingDrawPoint = null;
      saveDrawings(drawings);
      renderChart();
    });
  });
  const chartSurface = elements.chart.querySelector(".terminal-chart");
  if (chartSurface) {
    chartSurface.addEventListener(
      "wheel",
      (event) => {
        const isPinchGesture = event.ctrlKey || event.metaKey;
        if (isPinchGesture) {
          event.preventDefault();
          const factor = Math.exp(-event.deltaY * 0.01);
          setChartZoom(state.chartZoom * factor);
          return;
        }
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 12) {
          event.preventDefault();
          panChart(event.deltaX > 0 ? -1 : 1);
        }
      },
      { passive: false },
    );
    chartSurface.addEventListener(
      "gesturestart",
      (event) => {
        event.preventDefault();
        state.pinchStartZoom = state.chartZoom;
      },
      { passive: false },
    );
    chartSurface.addEventListener(
      "gesturechange",
      (event) => {
        event.preventDefault();
        setChartZoom((state.pinchStartZoom || state.chartZoom) * event.scale);
      },
      { passive: false },
    );
    chartSurface.addEventListener(
      "gestureend",
      (event) => {
        event.preventDefault();
        state.pinchStartZoom = null;
      },
      { passive: false },
    );
  }
  setActivePoint(points.length - 1);
}

function minuteLabel(value) {
  const text = String(value || "");
  if (text.includes(" ")) return text.split(" ")[1];
  const date = new Date(text);
  if (Number.isFinite(date.getTime())) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return text;
}

function renderMinuteDetail(point, previous, currency) {
  const changePct = pct(point.close, previous?.close ?? point.open);
  return `
    <div><span>时间</span><strong>${escapeHtml(minuteLabel(point.time))}</strong></div>
    <div><span>开 / 高 / 低 / 价</span><strong>${escapeHtml(formatPrice(point.open, currency))} / ${escapeHtml(formatPrice(point.high, currency))} / ${escapeHtml(formatPrice(point.low, currency))} / ${escapeHtml(formatPrice(point.close, currency))}</strong></div>
    <div><span>分钟涨跌</span><strong class="${pctClass(changePct)}">${escapeHtml(formatPct(changePct))}</strong></div>
    <div><span>均价 / 成交</span><strong>${escapeHtml(formatPrice(point.average, currency))} · ${escapeHtml(compactVolume(point.volume))}</strong></div>
  `;
}

function renderMinuteRow(point, index, currency) {
  return `
    <tr data-minute-table-index="${index}">
      <td>${escapeHtml(minuteLabel(point.time))}</td>
      <td>${escapeHtml(formatPrice(point.open))}</td>
      <td>${escapeHtml(formatPrice(point.high))}</td>
      <td>${escapeHtml(formatPrice(point.low))}</td>
      <td>${escapeHtml(formatPrice(point.close))}</td>
      <td>${escapeHtml(formatPrice(point.average))}</td>
      <td>${escapeHtml(compactVolume(point.volume))}</td>
      <td>${escapeHtml(compactNumber(point.amount))}</td>
    </tr>
  `;
}

function installIntradayInteractions(points, currency) {
  const detail = elements.chart.querySelector("#daily-detail");
  const setActivePoint = (index) => {
    const point = points[index];
    if (!point || !detail) return;
    detail.innerHTML = renderMinuteDetail(point, points[index - 1], currency);
    elements.chart.querySelectorAll(".minute-active").forEach((item) => item.classList.remove("minute-active"));
    elements.chart.querySelector(`[data-minute-index="${index}"]`)?.classList.add("minute-active");
    elements.chart.querySelectorAll(".daily-table tr.is-active").forEach((item) => item.classList.remove("is-active"));
    elements.chart.querySelector(`[data-minute-table-index="${index}"]`)?.classList.add("is-active");
  };
  elements.chart.querySelectorAll("[data-minute-index], [data-minute-table-index]").forEach((item) => {
    const indexFor = () => Number(item.dataset.minuteIndex ?? item.dataset.minuteTableIndex);
    item.addEventListener("mouseenter", () => setActivePoint(indexFor()));
    item.addEventListener("click", () => setActivePoint(indexFor()));
  });
  setActivePoint(points.length - 1);
}

function renderMemo() {
  const memo = state.data.memo || {};
  elements.memoStance.textContent = memo.stance || "-";
  elements.bullishList.innerHTML = renderList(memo.bullish);
  elements.bearishList.innerHTML = renderList(memo.bearish);
}

function renderList(items) {
  if (!items?.length) return "<li>暂无强信号。</li>";
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderDrivers() {
  const drivers = state.data.drivers || [];
  elements.driverList.innerHTML = drivers
    .map(
      (driver) => `
        <article class="driver-item">
          <div class="driver-head">
            <strong>${escapeHtml(driver.title)}</strong>
            <span class="confidence">${Math.round(driver.confidence)}%</span>
          </div>
          <p>${escapeHtml(driver.evidence)}</p>
        </article>
      `,
    )
    .join("");
}

function renderTopics() {
  const topics = state.data.newsProfile?.categories || [];
  if (!topics.length) {
    elements.topicList.innerHTML = '<div class="topic-item">暂无明显主题聚类。</div>';
    return;
  }
  const max = Math.max(...topics.map((topic) => topic.score), 1);
  elements.topicList.innerHTML = topics
    .slice(0, 6)
    .map(
      (topic) => `
        <article class="topic-item">
          <div class="topic-head">
            <strong>${escapeHtml(topic.label)}</strong>
            <span>${topic.score}</span>
          </div>
          <div class="topic-bar"><span style="width: ${(topic.score / max) * 100}%"></span></div>
        </article>
      `,
    )
    .join("");
}

function renderEvidenceReview() {
  const review = state.data.evidenceReview || {};
  const items = review.items || [];
  elements.evidenceScore.textContent = Number.isFinite(review.confidence) ? `${review.confidence} 分` : "-";
  elements.evidenceMeta.textContent = `${review.mode || "证据引擎"}${review.model ? ` · ${review.model}` : ""} · 硬事实 ${
    review.hardEvidenceCount || 0
  } 条 · 传闻 ${review.rumorCount || 0} 条`;
  elements.evidenceVerdict.innerHTML = `
    <strong>${escapeHtml(review.verdict || "暂无判断")}</strong>
    <span>${escapeHtml((review.reasonChain || []).slice(0, 2).join(" "))}</span>
  `;
  if (!items.length) {
    elements.evidenceList.innerHTML = '<div class="empty-state">暂无可分级证据。</div>';
  } else {
    elements.evidenceList.innerHTML = items
      .slice(0, 5)
      .map((item) => {
        const date = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : "未知日期";
        return `
          <article class="evidence-item">
            <div class="evidence-item-head">
              <span class="evidence-badge level-${escapeHtml(item.level)}">${escapeHtml(item.level)}证据</span>
              <span>${escapeHtml(item.catalystType)} · ${escapeHtml(item.sourceTier || "-")}</span>
            </div>
            <a href="${escapeHtml(item.url || "#")}" target="_blank" rel="noreferrer">${escapeHtml(item.title || "-")}</a>
            <p>${escapeHtml(item.action || item.reason || "")}</p>
            <div class="news-meta">
              <span>${escapeHtml(item.source || "news")}</span>
              <span>${escapeHtml(date)}</span>
              <span>${escapeHtml(item.confidence ?? "-")} 分</span>
            </div>
          </article>
        `;
      })
      .join("");
  }
  const questions = [...(review.redFlags || []), ...(review.questions || [])].slice(0, 7);
  elements.evidenceQuestionList.innerHTML = renderList(questions);
}

function networkNode({ x, y, width, height, title, subtitle, target = false }) {
  return `
    <g class="network-node ${target ? "target" : ""}" transform="translate(${x}, ${y})">
      <rect width="${width}" height="${height}" rx="8"></rect>
      <text x="12" y="22">${escapeHtml(shortText(title, 22))}</text>
      <text class="node-role" x="12" y="42">${escapeHtml(shortText(subtitle, 30))}</text>
    </g>
  `;
}

function renderNetwork() {
  const data = state.data;
  const chain = data.supplyChain || {};
  const upstream = chain.upstream || [];
  const downstream = chain.downstream || [];
  const competitors = chain.competitors || [];
  const width = 1120;
  const nodeWidth = 190;
  const nodeHeight = 58;
  const rowGap = 72;
  const middleY = Math.max(upstream.length, downstream.length, 3) * 36;
  const height = Math.max(360, middleY + competitors.length * 24 + 160);
  const leftX = 46;
  const targetX = 465;
  const rightX = 884;

  elements.chainSource.textContent = `${chain.confidence || "-"}置信度 · ${chain.source || "-"}`;
  elements.chainThesis.textContent = chain.thesis || "-";

  const nodes = [];
  const links = [];
  const targetY = middleY;
  nodes.push(
    networkNode({
      x: targetX,
      y: targetY,
      width: nodeWidth,
      height: nodeHeight,
      title: `${data.symbol} ${data.companyName}`,
      subtitle: "分析目标",
      target: true,
    }),
  );

  const placeColumn = (items, x, relation, linkDirection) => {
    const totalHeight = (items.length - 1) * rowGap;
    const startY = Math.max(24, targetY - totalHeight / 2);
    items.forEach((item, index) => {
      const y = startY + index * rowGap;
      nodes.push(
        networkNode({
          x,
          y,
          width: nodeWidth,
          height: nodeHeight,
          title: `${item.symbol} ${item.name}`,
          subtitle: `${relation} · ${item.role}`,
        }),
      );
      if (linkDirection === "toTarget") {
        links.push(`<line class="network-link" x1="${x + nodeWidth}" y1="${y + nodeHeight / 2}" x2="${targetX}" y2="${
          targetY + nodeHeight / 2
        }"></line>`);
      } else {
        links.push(`<line class="network-link" x1="${targetX + nodeWidth}" y1="${targetY + nodeHeight / 2}" x2="${x}" y2="${
          y + nodeHeight / 2
        }"></line>`);
      }
    });
  };

  placeColumn(upstream, leftX, "上游", "toTarget");
  placeColumn(downstream, rightX, "下游", "fromTarget");

  const competitorStartX = 220;
  const competitorY = Math.min(height - 86, targetY + 112);
  competitors.slice(0, 4).forEach((item, index) => {
    const x = competitorStartX + index * 210;
    nodes.push(
      networkNode({
        x,
        y: competitorY,
        width: nodeWidth,
        height: nodeHeight,
        title: `${item.symbol} ${item.name}`,
        subtitle: `同行/替代 · ${item.role}`,
      }),
    );
    links.push(`<line class="network-link" x1="${targetX + nodeWidth / 2}" y1="${targetY + nodeHeight}" x2="${
      x + nodeWidth / 2
    }" y2="${competitorY}"></line>`);
  });

  elements.network.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="supply chain network">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L7,3 z" fill="#a7bac8"></path>
        </marker>
      </defs>
      ${links.join("")}
      ${nodes.join("")}
    </svg>
  `;
}

function renderCandidates() {
  const rows = state.data.candidates || [];
  elements.candidateTable.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>
            <strong>${escapeHtml(row.name)}</strong>
            <span class="ticker">${escapeHtml(row.symbol)} · ${escapeHtml(row.market || "")}</span>
          </td>
          <td>${escapeHtml(row.relation)}<span class="ticker">${escapeHtml(row.role || "")}</span></td>
          <td>${escapeHtml(formatPrice(row.price, row.currency))}</td>
          <td class="${pctClass(row.dayChangePct)}">${escapeHtml(formatPct(row.dayChangePct))}</td>
          <td class="${pctClass(row.return1m)}">${escapeHtml(formatPct(row.return1m))}</td>
          <td class="${pctClass(row.return3m)}">${escapeHtml(formatPct(row.return3m))}</td>
          <td class="score-cell">
            <strong>${row.scores.total}</strong>
            <div class="score-bar"><span style="width: ${row.scores.total}%"></span></div>
            <span class="ticker">动量 ${row.scores.momentum} · 风险 ${row.scores.risk}</span>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderNews() {
  const news = state.data.news || [];
  if (!news.length) {
    elements.newsList.innerHTML = '<div class="news-item">暂无新闻数据。可以换一个代码，或后续接入 NewsAPI/付费新闻源。</div>';
    return;
  }
  elements.newsList.innerHTML = news
    .slice(0, 10)
    .map((item) => {
      const date = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : "未知日期";
      return `
        <article class="news-item">
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>
          ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
          <div class="news-meta">
            <span>${escapeHtml(item.source || "news")}</span>
            <span>${escapeHtml(date)}</span>
            ${
              item.evidence
                ? `<span>${escapeHtml(item.evidence.level)}证据 · ${escapeHtml(item.evidence.catalystType)}</span>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function renderVerification() {
  const memo = state.data.memo || {};
  elements.verifyList.innerHTML = renderList(memo.verifyNext);
  const sec = state.data.sec || {};
  const fundamentals = state.data.fundamentals || {};
  const items = [
    ["市值", fundamentals.marketCap ? compactNumber(fundamentals.marketCap) : "-"],
    ["PE(TTM)", fundamentals.trailingPE ? fundamentals.trailingPE.toFixed(1) : fundamentals.forwardPE ? fundamentals.forwardPE.toFixed(1) : "-"],
    ["收入增长", Number.isFinite(sec.revenueGrowth) ? `${sec.revenueGrowth}%` : fractionPct(fundamentals.revenueGrowth)],
    ["净利率", Number.isFinite(sec.netMargin) ? `${sec.netMargin}%` : fractionPct(fundamentals.profitMargins)],
    ["资产负债率", Number.isFinite(sec.debtRatio) ? `${sec.debtRatio}%` : "-"],
    ["经营现金流", Number.isFinite(sec.operatingCashFlow) ? compactNumber(sec.operatingCashFlow) : "-"],
    ["行业", [fundamentals.sector, fundamentals.industry].filter(Boolean).join(" · ") || "-"],
  ];
  elements.fundamentals.innerHTML = items
    .map(
      ([label, value]) => `
        <div class="fundamental-item">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join("");
}

function fractionPct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${(number * 100).toFixed(2)}%`;
}

function renderDataNotes() {
  const notes = state.data.dataNotes || [];
  elements.notes.innerHTML = notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("");
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAnalysis(elements.input.value);
});

elements.watchlistForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addWatchlist(elements.watchlistInput.value).catch((error) => {
    elements.watchlistList.innerHTML = `<span class="muted-text">${escapeHtml(error.message)}</span>`;
  });
});

document.addEventListener("click", (event) => {
  const chartModeButton = event.target.closest("[data-chart-mode]");
  if (chartModeButton) {
    state.chartMode = chartModeButton.dataset.chartMode;
    if (state.chartMode !== "kline") state.drawingMode = false;
    state.pendingDrawPoint = null;
    renderChart();
    return;
  }

  const klinePeriodButton = event.target.closest("[data-kline-period]");
  if (klinePeriodButton) {
    state.klinePeriod = klinePeriodButton.dataset.klinePeriod;
    state.chartOffset = 0;
    state.pendingDrawPoint = null;
    renderChart();
    return;
  }

  const chartToolButton = event.target.closest("[data-chart-tool]");
  if (chartToolButton) {
    const tool = chartToolButton.dataset.chartTool;
    if (tool === "zoom-in") adjustChartZoom(1);
    if (tool === "zoom-out") adjustChartZoom(-1);
    if (tool === "pan-left") panChart(1);
    if (tool === "pan-right") panChart(-1);
    if (tool === "draw-line") {
      state.drawingMode = !state.drawingMode;
      state.pendingDrawPoint = null;
      syncChartControls();
      renderChart();
    }
    if (tool === "clear-lines") {
      saveDrawings([]);
      state.pendingDrawPoint = null;
      renderChart();
    }
    return;
  }

  const loadButton = event.target.closest("[data-load-symbol]");
  if (loadButton) {
    loadAnalysis(loadButton.dataset.loadSymbol);
    return;
  }

  const removeButton = event.target.closest("[data-remove-symbol]");
  if (removeButton) {
    removeWatchlist(removeButton.dataset.removeSymbol).catch((error) => {
      elements.watchlistList.innerHTML = `<span class="muted-text">${escapeHtml(error.message)}</span>`;
    });
  }
});

elements.saveReportButton.addEventListener("click", saveCurrentReport);
elements.briefingButton.addEventListener("click", generateBriefing);
elements.backtestButton.addEventListener("click", runBacktest);
elements.planButton.addEventListener("click", generateTradePlan);
elements.paperButton.addEventListener("click", generatePaperRecommendation);
elements.dailyPicksButton.addEventListener("click", generateDailyPicks);
elements.cycleButton.addEventListener("click", runDailyCycle);
elements.aiMispricingButton.addEventListener("click", runAiMispricingScan);
elements.verdictButton.addEventListener("click", runEvidenceVerdict);
elements.nightlyButton.addEventListener("click", runNightlyDeepDive);
elements.diagnosticsButton.addEventListener("click", runDiagnostics);
elements.reviewButton.addEventListener("click", runAutoReview);

document.querySelectorAll(".quick-button").forEach((button) => {
  button.addEventListener("click", () => loadAnalysis(button.dataset.symbol));
});

document.querySelectorAll(".timeframe-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (!button.dataset.range) return;
    state.range = button.dataset.range;
    state.chartOffset = 0;
    document.querySelectorAll("[data-range]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    if (state.data) renderChart();
  });
});

renderWorkbenchStaticPlaceholders();
loadDeviceAccess();
loadWatchlist();
loadPaperPortfolio();
loadDataSources();
loadLatestBackgroundResults();
loadInvestorQa();
loadBriefingOutcomes();
loadAnalysis("688122");
