const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

async function waitForServer(baseUrl, child) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < 10_000) {
    if (child.exitCode !== null) throw new Error(`server exited early with code ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
      lastError = `health status ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`server did not start: ${lastError}`);
}

async function withServer(t, seed = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "investgraph-test-"));
  if (seed.paper) {
    await fs.writeFile(path.join(dataDir, "paper-portfolio.json"), JSON.stringify(seed.paper, null, 2));
  }
  const port = 43173 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      DATA_DIR: dataDir,
      FINNHUB_API_KEY: "",
      NEWSAPI_KEY: "",
      AI_API_KEY: "",
      APP_PASSWORD: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(baseUrl, child);
  return { baseUrl, dataDir };
}

test("processes triggered watch orders into dry-run paper actions", async (t) => {
  const paper = {
    cash: 100000,
    initialCapital: 100000,
    positions: [],
    trades: [],
    recommendations: [],
    cycles: [],
    watchOrders: [
      {
        id: "watch-buy-1",
        source: "briefing",
        status: "waiting",
        symbol: "NVDA",
        companyName: "英伟达",
        action: "买入",
        referencePrice: 100,
        lastPrice: 105,
        returnPct: 5,
        hardEvidenceCount: 1,
        structuredTrigger: { minReturnPct: 3, minHardEvidenceCount: 1 },
        decisionWhy: "公告确认订单，价格走强",
        triggerText: "价格上涨超过3%，且有订单公告硬证据",
      },
    ],
  };
  const { baseUrl } = await withServer(t, { paper });
  const response = await fetch(`${baseUrl}/api/paper/watch-orders/process?execute=false&capital=100000`, {
    method: "POST",
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.processed, 1);
  assert.equal(payload.executions.length, 1);
  assert.equal(payload.executions[0].side, "buy");
  assert.equal(payload.portfolio.positions.length, 0);
  assert.match(payload.reviewItems[0]?.note || "", /自动模拟买入/);
});

test("briefing outcomes exposes missed-opportunity root causes", async (t) => {
  const { baseUrl } = await withServer(t);
  const response = await fetch(`${baseUrl}/api/briefing-outcomes?limit=10`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.watchReview.rootCauses));
  assert.ok(Array.isArray(payload.watchReview.lessons));
});

test("nightly deep dive latest endpoint is cache friendly", async (t) => {
  const { baseUrl } = await withServer(t);
  const response = await fetch(`${baseUrl}/api/nightly-deep-dive/latest`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(Object.hasOwn(payload, "latest"), true);
  assert.equal(Object.hasOwn(payload, "runningJob"), true);
});
