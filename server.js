const http = require("node:http");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;
loadLocalEnv(path.join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_STORAGE = process.env.DATA_STORAGE || "local-json";
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const WATCHLIST_FILE = path.join(DATA_DIR, "watchlist.json");
const REPORTS_DIR = path.join(DATA_DIR, "reports");
const PAPER_FILE = path.join(DATA_DIR, "paper-portfolio.json");
const BRIEFING_CACHE_FILE = path.join(DATA_DIR, "briefing-latest.json");
const DAILY_PICKS_CACHE_FILE = path.join(DATA_DIR, "daily-picks-latest.json");
const DAILY_CYCLE_CACHE_FILE = path.join(DATA_DIR, "daily-cycle-latest.json");
const NIGHTLY_DEEP_DIVE_CACHE_FILE = path.join(DATA_DIR, "nightly-deep-dive-latest.json");
const APP_USER_AGENT =
  process.env.SEC_USER_AGENT ||
  "CodexInvestResearch/0.1 research@example.com";
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || process.env.OPENAI_MODEL || "";
const AI_API_URL = process.env.AI_API_URL || "https://api.openai.com/v1/responses";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "";
const NEWSAPI_KEY = process.env.NEWSAPI_KEY || "";
const APP_USERNAME = process.env.APP_USERNAME || "investgraph";
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const backgroundJobs = new Map();

function loadLocalEnv(filePath) {
  if (!fsSync.existsSync(filePath)) return;
  const lines = fsSync.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex < 1) continue;
    const key = line.slice(0, equalsIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const defaultWatchlist = [
  "688122.SS",
  "300750.SZ",
  "600519.SS",
  "688981.SS",
  "NVDA",
  "AAPL",
  "MSFT",
  "TSLA",
];

const advancedThemeUniverse = [
  { symbol: "300502.SZ", theme: "AI算力/光模块", thesis: "高速光模块与AI数据中心资本开支相关，弹性高。" },
  { symbol: "300308.SZ", theme: "AI算力/光模块", thesis: "光通信龙头，受益AI集群网络升级。" },
  { symbol: "300394.SZ", theme: "AI算力/光模块", thesis: "高速光器件供应链，关注订单和毛利率。" },
  { symbol: "688256.SS", theme: "AI芯片", thesis: "国产AI芯片代表，弹性大但波动也大。" },
  { symbol: "688041.SS", theme: "AI芯片", thesis: "国产CPU/GPU生态，受益信创与算力国产化。" },
  { symbol: "002230.SZ", theme: "AI应用", thesis: "AI应用与教育/办公场景，关注商业化兑现。" },
  { symbol: "300496.SZ", theme: "智能汽车/操作系统", thesis: "端侧智能与汽车软件，关注订单和估值修复。" },
  { symbol: "002371.SZ", theme: "半导体设备", thesis: "国产半导体设备核心标的，受益设备国产化。" },
  { symbol: "688012.SS", theme: "半导体设备", thesis: "刻蚀设备与先进制程国产替代方向。" },
  { symbol: "688072.SS", theme: "半导体设备", thesis: "薄膜沉积设备，关注订单和先进封装需求。" },
  { symbol: "603986.SS", theme: "存储/芯片设计", thesis: "存储周期与国产芯片设计弹性。" },
  { symbol: "688981.SS", theme: "晶圆制造", thesis: "国产晶圆制造核心资产，关注资本开支与制程进展。" },
  { symbol: "002050.SZ", theme: "机器人/热管理", thesis: "机器人执行器与热管理供应链，关注新订单。" },
  { symbol: "300124.SZ", theme: "机器人/工控", thesis: "工控自动化与机器人零部件方向。" },
  { symbol: "002008.SZ", theme: "先进制造/激光", thesis: "激光装备与先进制造景气度代理。" },
  { symbol: "300274.SZ", theme: "储能/逆变器", thesis: "储能与海外逆变器需求，关注出货和价格压力。" },
  { symbol: "300750.SZ", theme: "固态电池/储能", thesis: "动力电池龙头，关注新技术和海外需求。" },
  { symbol: "002594.SZ", theme: "新能源车", thesis: "整车与电池一体化，关注销量和智能化进展。" },
  { symbol: "688122.SS", theme: "商业航天/新材料", thesis: "高端钛合金/超导材料，关注商业航天和军工需求。" },
  { symbol: "600760.SS", theme: "商业航天/军工", thesis: "航空装备龙头，关注订单和行业周期。" },
  { symbol: "000768.SZ", theme: "大飞机/军工", thesis: "航空制造链核心，关注产能释放。" },
  { symbol: "600893.SS", theme: "航空发动机", thesis: "航空发动机产业链核心，订单能见度较高。" },
  { symbol: "002281.SZ", theme: "光通信", thesis: "通信网络升级与算力基础设施相关。" },
  { symbol: "688525.SS", theme: "存储/先进封装", thesis: "存储模组和先进封装相关，波动大。" },
];

const paperRiskPolicy = {
  maxSinglePositionPct: 12,
  maxThemeExposurePct: 30,
  maxOpenPositions: 8,
  maxPortfolioDrawdownPct: 15,
  maxDailyNewBuys: 3,
  maxConsecutiveLosses: 3,
  minCashPct: 15,
};

const symbolDisplayNames = {
  "688122.SS": "西部超导",
  "300750.SZ": "宁德时代",
  "600519.SS": "贵州茅台",
  "688981.SS": "中芯国际",
  NVDA: "英伟达",
  AAPL: "苹果",
  MSFT: "微软",
  TSLA: "特斯拉",
  "003004.SZ": "声迅股份",
  "300870.SZ": "欧陆通",
  "002851.SZ": "麦格米特",
  "002837.SZ": "英维克",
  "300476.SZ": "胜宏科技",
  "601138.SS": "工业富联",
  "300285.SZ": "国资材料",
  "002859.SZ": "洁美科技",
  "000636.SZ": "风华高科",
  "300408.SZ": "三环集团",
  "600545.SS": "卓郎智能",
  "603256.SS": "宏和科技",
  "002975.SZ": "博杰股份",
  "300548.SZ": "长芯博创",
  "300308.SZ": "中际旭创",
  "603083.SS": "剑桥科技",
  "002384.SZ": "东山精密",
  "301026.SZ": "浩通科技",
  "300502.SZ": "新易盛",
  "601958.SS": "金钼股份",
  "002969.SZ": "嘉美包装",
  "600021.SS": "上海电力",
  "000066.SZ": "中国长城",
  "002371.SZ": "北方华创",
  "688012.SS": "中微公司",
  "300655.SZ": "晶瑞电材",
  "300346.SZ": "南大光电",
  "603650.SS": "彤程新材",
  "600895.SS": "张江高科",
  "601727.SS": "上海电气",
  "688005.SS": "容百科技",
  "688027.SS": "国盾量子",
  "688072.SS": "拓荆科技",
  "603986.SS": "兆易创新",
  "600396.SS": "华电辽能",
  "000021.SZ": "深科技",
  "688087.SS": "英科再生",
  "002297.SZ": "博云新材",
  "600459.SS": "贵研铂业",
  "000725.SZ": "京东方A",
  "300496.SZ": "中科创达",
  "301165.SZ": "锐捷网络",
  "601991.SS": "大唐发电",
  "002149.SZ": "西部材料",
  "603082.SS": "北自科技",
  "688712.SS": "北芯生命",
  "002428.SZ": "云南锗业",
  "300394.SZ": "天孚通信",
  "000936.SZ": "华西股份",
  "002208.SZ": "合肥城建",
  "603156.SS": "养元饮品",
  "600219.SS": "南山铝业",
  "002600.SZ": "领益智造",
  "600601.SS": "方正科技",
  "603007.SS": "顺景科技",
  "002281.SZ": "光迅科技",
  "300058.SZ": "蓝色光标",
  "688525.SS": "佰维存储",
  "300536.SZ": "农尚环境",
  "688160.SS": "步科股份",
  "002271.SZ": "东方雨虹",
  "000938.SZ": "紫光股份",
  "300274.SZ": "阳光电源",
  "002031.SZ": "巨轮智能",
  "002049.SZ": "紫光国微",
  "600105.SS": "永鼎股份",
  "688256.SS": "寒武纪",
  "688041.SS": "海光信息",
  "002230.SZ": "科大讯飞",
  "002050.SZ": "三花智控",
  "300124.SZ": "汇川技术",
  "002008.SZ": "大族激光",
  "002594.SZ": "比亚迪",
  "600760.SS": "中航沈飞",
  "000768.SZ": "中航西飞",
  "600893.SS": "航发动力",
};

const displayNameAliases = Object.fromEntries(
  Object.entries(symbolDisplayNames).map(([symbol, name]) => [name.toUpperCase(), symbol]),
);

const memoryCache = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const supplyChains = {
  NVDA: {
    company: "NVIDIA",
    thesis:
      "GPU, AI accelerator, networking and CUDA software ecosystem drive its position in the AI data-center value chain.",
    upstream: [
      {
        symbol: "2330.TW",
        name: "Taiwan Semiconductor",
        market: "Taiwan",
        role: "advanced wafer foundry",
        weight: 94,
      },
      {
        symbol: "ASML",
        name: "ASML",
        market: "US/NL",
        role: "EUV lithography equipment",
        weight: 80,
      },
      {
        symbol: "AMAT",
        name: "Applied Materials",
        market: "US",
        role: "semiconductor manufacturing tools",
        weight: 67,
      },
      {
        symbol: "000660.KS",
        name: "SK hynix",
        market: "Korea",
        role: "HBM memory",
        weight: 83,
      },
      {
        symbol: "005930.KS",
        name: "Samsung Electronics",
        market: "Korea",
        role: "memory, foundry and components",
        weight: 67,
      },
      {
        symbol: "MU",
        name: "Micron",
        market: "US",
        role: "HBM and DRAM memory",
        weight: 72,
      },
    ],
    downstream: [
      {
        symbol: "MSFT",
        name: "Microsoft",
        market: "US",
        role: "cloud AI infrastructure buyer",
        weight: 88,
      },
      {
        symbol: "GOOGL",
        name: "Alphabet",
        market: "US",
        role: "cloud, search and AI training demand",
        weight: 74,
      },
      {
        symbol: "AMZN",
        name: "Amazon",
        market: "US",
        role: "AWS AI infrastructure buyer",
        weight: 78,
      },
      {
        symbol: "META",
        name: "Meta Platforms",
        market: "US",
        role: "AI model training and recommendation systems",
        weight: 76,
      },
      {
        symbol: "DELL",
        name: "Dell Technologies",
        market: "US",
        role: "AI server systems",
        weight: 58,
      },
      {
        symbol: "SMCI",
        name: "Super Micro Computer",
        market: "US",
        role: "AI server integration",
        weight: 60,
      },
    ],
    competitors: [
      {
        symbol: "AMD",
        name: "Advanced Micro Devices",
        market: "US",
        role: "GPU and accelerator competitor",
        weight: 82,
      },
      {
        symbol: "INTC",
        name: "Intel",
        market: "US",
        role: "CPU, accelerator and foundry competitor",
        weight: 55,
      },
      {
        symbol: "AVGO",
        name: "Broadcom",
        market: "US",
        role: "custom silicon and networking",
        weight: 66,
      },
    ],
  },
  TSLA: {
    company: "Tesla",
    thesis:
      "EV manufacturing, battery supply, autonomy software and energy storage connect Tesla to the battery, lithium, electronics and charging ecosystem.",
    upstream: [
      {
        symbol: "300750.SZ",
        name: "CATL",
        market: "China",
        role: "EV battery supplier",
        weight: 85,
      },
      {
        symbol: "6752.T",
        name: "Panasonic Holdings",
        market: "Japan",
        role: "battery cell partner",
        weight: 72,
      },
      {
        symbol: "373220.KS",
        name: "LG Energy Solution",
        market: "Korea",
        role: "battery cell supplier",
        weight: 62,
      },
      {
        symbol: "ALB",
        name: "Albemarle",
        market: "US",
        role: "lithium producer",
        weight: 52,
      },
      {
        symbol: "LIT",
        name: "Global X Lithium & Battery Tech ETF",
        market: "US",
        role: "battery materials proxy",
        weight: 45,
      },
    ],
    downstream: [
      {
        symbol: "HERT",
        name: "Hertz",
        market: "US",
        role: "fleet customer proxy",
        weight: 30,
      },
      {
        symbol: "UBER",
        name: "Uber",
        market: "US",
        role: "robotaxi and fleet demand proxy",
        weight: 35,
      },
    ],
    competitors: [
      {
        symbol: "002594.SZ",
        name: "BYD",
        market: "China",
        role: "EV and battery competitor",
        weight: 88,
      },
      {
        symbol: "1211.HK",
        name: "BYD Company",
        market: "Hong Kong",
        role: "EV competitor",
        weight: 74,
      },
      {
        symbol: "GM",
        name: "General Motors",
        market: "US",
        role: "auto competitor",
        weight: 55,
      },
      {
        symbol: "F",
        name: "Ford",
        market: "US",
        role: "auto competitor",
        weight: 55,
      },
      {
        symbol: "NIO",
        name: "NIO",
        market: "US/China",
        role: "premium EV competitor",
        weight: 45,
      },
      {
        symbol: "LI",
        name: "Li Auto",
        market: "US/China",
        role: "extended-range EV competitor",
        weight: 45,
      },
    ],
  },
  AAPL: {
    company: "Apple",
    thesis:
      "Consumer hardware, services, silicon design and app ecosystem connect Apple to Asian manufacturing, semiconductors, carriers and retail channels.",
    upstream: [
      {
        symbol: "2330.TW",
        name: "Taiwan Semiconductor",
        market: "Taiwan",
        role: "Apple silicon foundry",
        weight: 92,
      },
      {
        symbol: "2317.TW",
        name: "Hon Hai Precision",
        market: "Taiwan",
        role: "iPhone assembly",
        weight: 86,
      },
      {
        symbol: "QCOM",
        name: "Qualcomm",
        market: "US",
        role: "modems and wireless chips",
        weight: 57,
      },
      {
        symbol: "AVGO",
        name: "Broadcom",
        market: "US",
        role: "wireless and connectivity components",
        weight: 60,
      },
      {
        symbol: "3008.TW",
        name: "Largan Precision",
        market: "Taiwan",
        role: "camera lens modules",
        weight: 58,
      },
    ],
    downstream: [
      {
        symbol: "VZ",
        name: "Verizon",
        market: "US",
        role: "iPhone carrier channel",
        weight: 45,
      },
      {
        symbol: "T",
        name: "AT&T",
        market: "US",
        role: "iPhone carrier channel",
        weight: 43,
      },
      {
        symbol: "TMUS",
        name: "T-Mobile US",
        market: "US",
        role: "iPhone carrier channel",
        weight: 43,
      },
      {
        symbol: "BBY",
        name: "Best Buy",
        market: "US",
        role: "consumer electronics retail",
        weight: 32,
      },
    ],
    competitors: [
      {
        symbol: "MSFT",
        name: "Microsoft",
        market: "US",
        role: "platform and services competitor",
        weight: 50,
      },
      {
        symbol: "GOOGL",
        name: "Alphabet",
        market: "US",
        role: "mobile ecosystem competitor",
        weight: 62,
      },
      {
        symbol: "005930.KS",
        name: "Samsung Electronics",
        market: "Korea",
        role: "smartphone and component competitor",
        weight: 72,
      },
    ],
  },
  MSFT: {
    company: "Microsoft",
    thesis:
      "Cloud, enterprise software, AI copilots and gaming create demand for data-center hardware and developer ecosystems.",
    upstream: [
      {
        symbol: "NVDA",
        name: "NVIDIA",
        market: "US",
        role: "AI accelerators",
        weight: 86,
      },
      {
        symbol: "AMD",
        name: "Advanced Micro Devices",
        market: "US",
        role: "CPU and accelerator chips",
        weight: 55,
      },
      {
        symbol: "ANET",
        name: "Arista Networks",
        market: "US",
        role: "cloud networking",
        weight: 50,
      },
      {
        symbol: "2330.TW",
        name: "Taiwan Semiconductor",
        market: "Taiwan",
        role: "chip manufacturing exposure",
        weight: 45,
      },
    ],
    downstream: [
      {
        symbol: "CRM",
        name: "Salesforce",
        market: "US",
        role: "enterprise software ecosystem",
        weight: 36,
      },
      {
        symbol: "NOW",
        name: "ServiceNow",
        market: "US",
        role: "enterprise AI workflow demand",
        weight: 36,
      },
      {
        symbol: "ADBE",
        name: "Adobe",
        market: "US",
        role: "creative and productivity software ecosystem",
        weight: 32,
      },
    ],
    competitors: [
      {
        symbol: "GOOGL",
        name: "Alphabet",
        market: "US",
        role: "cloud and AI competitor",
        weight: 76,
      },
      {
        symbol: "AMZN",
        name: "Amazon",
        market: "US",
        role: "cloud competitor",
        weight: 74,
      },
      {
        symbol: "ORCL",
        name: "Oracle",
        market: "US",
        role: "cloud and enterprise database competitor",
        weight: 55,
      },
    ],
  },
  "300750.SZ": {
    company: "CATL",
    thesis:
      "Battery cells, energy storage and materials supply expose CATL to EV volume, lithium prices and grid-storage demand.",
    upstream: [
      {
        symbol: "ALB",
        name: "Albemarle",
        market: "US",
        role: "lithium producer",
        weight: 55,
      },
      {
        symbol: "SQM",
        name: "Sociedad Quimica y Minera",
        market: "US/Chile",
        role: "lithium producer",
        weight: 50,
      },
      {
        symbol: "002460.SZ",
        name: "Ganfeng Lithium",
        market: "China",
        role: "lithium compounds",
        weight: 58,
      },
    ],
    downstream: [
      {
        symbol: "TSLA",
        name: "Tesla",
        market: "US",
        role: "EV customer",
        weight: 78,
      },
      {
        symbol: "002594.SZ",
        name: "BYD",
        market: "China",
        role: "EV and battery ecosystem",
        weight: 65,
      },
      {
        symbol: "BMW.DE",
        name: "BMW",
        market: "Germany",
        role: "EV customer proxy",
        weight: 40,
      },
    ],
    competitors: [
      {
        symbol: "373220.KS",
        name: "LG Energy Solution",
        market: "Korea",
        role: "battery competitor",
        weight: 72,
      },
      {
        symbol: "006400.KS",
        name: "Samsung SDI",
        market: "Korea",
        role: "battery competitor",
        weight: 66,
      },
      {
        symbol: "002594.SZ",
        name: "BYD",
        market: "China",
        role: "battery and EV competitor",
        weight: 70,
      },
    ],
  },
  "600519.SS": {
    company: "Kweichow Moutai",
    thesis:
      "Premium baijiu demand, channel inventory, consumer sentiment and China discretionary spending drive the investment debate.",
    upstream: [
      {
        symbol: "000858.SZ",
        name: "Wuliangye Yibin",
        market: "China",
        role: "premium baijiu comparable",
        weight: 62,
      },
      {
        symbol: "000568.SZ",
        name: "Luzhou Laojiao",
        market: "China",
        role: "premium baijiu comparable",
        weight: 58,
      },
    ],
    downstream: [
      {
        symbol: "9988.HK",
        name: "Alibaba",
        market: "Hong Kong",
        role: "consumer commerce channel proxy",
        weight: 28,
      },
      {
        symbol: "JD",
        name: "JD.com",
        market: "US/China",
        role: "consumer commerce channel proxy",
        weight: 28,
      },
    ],
    competitors: [
      {
        symbol: "000858.SZ",
        name: "Wuliangye Yibin",
        market: "China",
        role: "baijiu competitor",
        weight: 80,
      },
      {
        symbol: "000568.SZ",
        name: "Luzhou Laojiao",
        market: "China",
        role: "baijiu competitor",
        weight: 72,
      },
      {
        symbol: "600809.SS",
        name: "Shanxi Xinghuacun Fen Wine",
        market: "China",
        role: "baijiu competitor",
        weight: 62,
      },
    ],
  },
};

const aliasToCanonical = {
  ...displayNameAliases,
  NVIDIA: "NVDA",
  "NVIDIA CORPORATION": "NVDA",
  TESLA: "TSLA",
  APPLE: "AAPL",
  MICROSOFT: "MSFT",
  CATL: "300750.SZ",
  "宁德时代": "300750.SZ",
  "贵州茅台": "600519.SS",
  MOUTAI: "600519.SS",
};

function getFromCache(key) {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCache(key, value, ttlMs) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function withTimeout(promise, timeoutMs, message = "操作超时") {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": APP_USER_AGENT,
        Accept: "application/json,text/plain,*/*",
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options = {}, ttlMs = 60_000) {
  const key = `json:${url}`;
  const cached = getFromCache(key);
  if (cached) return cached;
  const response = await fetchWithTimeout(url, options);
  const json = await response.json();
  setCache(key, json, ttlMs);
  return json;
}

async function fetchText(url, options = {}, ttlMs = 60_000) {
  const key = `text:${url}`;
  const cached = getFromCache(key);
  if (cached) return cached;
  const response = await fetchWithTimeout(url, options);
  const text = await response.text();
  setCache(key, text, ttlMs);
  return text;
}

function normalizeSymbol(rawInput) {
  const raw = String(rawInput || "").trim();
  if (!raw) return "";

  const alias = aliasToCanonical[raw.toUpperCase()] || aliasToCanonical[raw];
  if (alias) return alias;

  let symbol = raw.toUpperCase().replace(/\s+/g, "");

  if (/^\d{6}$/.test(symbol)) {
    if (symbol.startsWith("8") || symbol.startsWith("4") || symbol.startsWith("92")) {
      return `${symbol}.BJ`;
    }
    if (symbol.startsWith("6") || symbol.startsWith("9")) return `${symbol}.SS`;
    return `${symbol}.SZ`;
  }

  symbol = symbol.replace(/\.SH$/, ".SS");
  symbol = symbol.replace(/\.SZSE$/, ".SZ");
  symbol = symbol.replace(/\.SSE$/, ".SS");
  symbol = symbol.replace(/\.BSE$/, ".BJ");
  symbol = symbol.replace(/\.NQ$/, ".BJ");
  symbol = symbol.replace(/\.HKEX$/, ".HK");
  symbol = symbol.replace("BRK.B", "BRK-B");

  if (/^\d{4}$/.test(symbol)) return `${symbol}.HK`;
  if (/^[A-Z]{1,6}\.[A-Z]$/.test(symbol)) return symbol.replace(".", "-");
  return symbol;
}

function isChinaSymbol(symbol) {
  return symbol.endsWith(".SS") || symbol.endsWith(".SZ") || symbol.endsWith(".BJ") || symbol.endsWith(".HK");
}

function isMainlandASymbol(symbol) {
  return symbol.endsWith(".SS") || symbol.endsWith(".SZ") || symbol.endsWith(".BJ");
}

function isLikelyUsCommonStock(symbol) {
  return /^[A-Z][A-Z0-9-]{0,6}$/.test(symbol);
}

function eastmoneyMarketPrefix(symbol) {
  return symbol.endsWith(".SS") ? "1" : "0";
}

function eastmoneyCode(symbol) {
  return symbol.replace(/\.(SS|SZ|BJ)$/i, "");
}

function eastmoneyF10Code(symbol) {
  if (symbol.endsWith(".BJ")) return `BJ${eastmoneyCode(symbol)}`;
  return `${symbol.endsWith(".SS") ? "SH" : "SZ"}${eastmoneyCode(symbol)}`;
}

function eastmoneySecuCode(symbol) {
  if (symbol.endsWith(".BJ")) return `${eastmoneyCode(symbol)}.NQ`;
  return `${eastmoneyCode(symbol)}.${symbol.endsWith(".SS") ? "SH" : "SZ"}`;
}

function ashareMarketInfo(symbol) {
  if (symbol.endsWith(".SS")) {
    return { prefix: "sh", exchangeName: "上海" };
  }
  if (symbol.endsWith(".BJ")) {
    return { prefix: "bj", exchangeName: "北京" };
  }
  return { prefix: "sz", exchangeName: "深圳" };
}

function isAshareTradingMinute(time) {
  const match = String(time || "").match(/(\d{2}):(\d{2})$/);
  if (!match) return true;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return (minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30) || (minutes >= 13 * 60 && minutes <= 15 * 60);
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstFinite(...values) {
  for (const value of values) {
    const number = safeNumber(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function percentToFraction(value) {
  const number = safeNumber(value);
  return Number.isFinite(number) ? number / 100 : null;
}

function ratioMetric(value) {
  const number = safeNumber(value);
  if (!Number.isFinite(number)) return null;
  return number > 20 ? number / 100 : number;
}

function pct(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function standardDeviation(values) {
  const valid = values.filter(Number.isFinite);
  if (valid.length < 2) return null;
  const avg = mean(valid);
  const variance = mean(valid.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function maxDrawdown(points) {
  let peak = -Infinity;
  let worst = 0;
  for (const point of points) {
    if (!Number.isFinite(point.close)) continue;
    peak = Math.max(peak, point.close);
    if (peak > 0) {
      worst = Math.min(worst, (point.close - peak) / peak);
    }
  }
  return worst * 100;
}

function returnFromLookback(points, sessions) {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const earlier = points[Math.max(0, points.length - 1 - sessions)];
  return pct(last.close, earlier.close);
}

function dailyReturns(points) {
  const returns = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1].close;
    const current = points[index].close;
    const value = pct(current, previous);
    if (Number.isFinite(value)) returns.push(value);
  }
  return returns;
}

function buildChartResult({ symbol, name, currency, exchangeName, instrumentType, timezone, points }) {
  if (!points.length) {
    throw new Error("Chart data has no valid close prices");
  }
  const last = points[points.length - 1];
  const previous = points[Math.max(0, points.length - 2)];
  const recentVolumes = points.slice(-21).map((point) => point.volume);
  const priorVolumes = points.slice(-84, -21).map((point) => point.volume);
  const avgRecentVolume = mean(recentVolumes);
  const avgPriorVolume = mean(priorVolumes) || avgRecentVolume;
  const returns = dailyReturns(points);
  const volatility = standardDeviation(returns.slice(-63));

  return {
    symbol,
    currency: currency || "",
    exchangeName: exchangeName || "",
    instrumentType: instrumentType || "",
    name: name || symbol,
    timezone: timezone || "",
    regularMarketPrice: last.close,
    previousClose: previous.close,
    chartPreviousClose: null,
    dayChangePct: round(pct(last.close, previous.close), 2),
    dayChange: round(last.close - previous.close, 3),
    lastClose: round(last.close, 3),
    lastDate: last.date,
    points,
    metrics: {
      return5d: round(returnFromLookback(points, 5), 2),
      return1m: round(returnFromLookback(points, 21), 2),
      return3m: round(returnFromLookback(points, 63), 2),
      return1y: round(returnFromLookback(points, 252), 2),
      volatility63d: round(volatility, 2),
      maxDrawdown1y: round(maxDrawdown(points), 2),
      averageVolume21d: round(avgRecentVolume, 0),
      volumeRatio:
        Number.isFinite(last.volume) && Number.isFinite(avgPriorVolume) && avgPriorVolume > 0
          ? round(last.volume / avgPriorVolume, 2)
          : null,
    },
  };
}

async function fetchEastmoneyChart(symbol) {
  const market = ashareMarketInfo(symbol);
  const code = eastmoneyCode(symbol);
  const tencentCode = `${market.prefix}${code}`;
  const url = `https://web.ifzq.gtimg.cn/appstock/app/newfqkline/get?param=${tencentCode},day,,,321,qfq`;
  const data = await fetchJson(url, {}, 45_000);
  const payload = data?.data?.[tencentCode] || {};
  const quote = payload.qt?.[tencentCode] || null;
  const quoteName = quote?.[1] || payload.qt?.name?.[1] || payload.name || symbol;
  const klines = payload.qfqday || payload.day || [];
  let points = klines
    .map((line) => {
      const [date, open, close, high, low, volume] = line;
      return {
        date,
        open: safeNumber(open),
        high: safeNumber(high),
        low: safeNumber(low),
        close: safeNumber(close),
        volume: safeNumber(volume),
      };
    })
    .filter((point) => Number.isFinite(point.close));

  if (symbol.endsWith(".BJ")) {
    try {
      const sinaChart = await fetchSinaAshareChart(symbol, quoteName);
      if (isPointSetNewer(sinaChart.points, points)) {
        points = sinaChart.points;
      }
    } catch (error) {
      // Keep the Tencent series when the fallback source is unavailable.
    }
  }

  points = mergeTencentQuotePoint(points, quote);

  if (!points.length) return fetchSinaAshareChart(symbol, quoteName);

  const chart = buildChartResult({
    symbol,
    currency: "CNY",
    exchangeName: market.exchangeName,
    instrumentType: "A股",
    name: quoteName,
    timezone: "Asia/Shanghai",
    points,
  });
  return applyTencentQuoteSnapshot(chart, quote);
}

function pointSetLastDate(points) {
  return points?.[points.length - 1]?.date || "";
}

function isPointSetNewer(candidate, current) {
  if (!candidate?.length) return false;
  if (!current?.length) return true;
  return pointSetLastDate(candidate) > pointSetLastDate(current);
}

function parseTencentQuotePoint(quote) {
  if (!Array.isArray(quote)) return null;
  const rawDate = String(quote[30] || "").slice(0, 8);
  const close = safeNumber(quote[3]);
  if (!/^\d{8}$/.test(rawDate) || !Number.isFinite(close) || close <= 0) return null;
  const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
  const open = safeNumber(quote[5]) ?? close;
  const high = safeNumber(quote[33]) ?? Math.max(open, close);
  const low = safeNumber(quote[34]) ?? Math.min(open, close);
  return {
    date,
    open,
    high,
    low,
    close,
    volume: safeNumber(quote[36] || quote[6]),
  };
}

function mergeTencentQuotePoint(points, quote) {
  const quotePoint = parseTencentQuotePoint(quote);
  if (!quotePoint) return points;
  if (!points.length) return [quotePoint];
  const last = points[points.length - 1];
  if (last.date === quotePoint.date) {
    return [...points.slice(0, -1), { ...last, ...quotePoint, volume: quotePoint.volume ?? last.volume }];
  }
  if (last.date < quotePoint.date) return [...points, quotePoint];
  return points;
}

function applyTencentQuoteSnapshot(chart, quote) {
  const quotePoint = parseTencentQuotePoint(quote);
  if (!quotePoint) return chart;
  const dayChange = safeNumber(quote?.[31]);
  const dayChangePct = safeNumber(quote?.[32]);
  const previousClose = safeNumber(quote?.[4]);
  const previousPoint = chart.points?.[chart.points.length - 2] || chart.points?.[chart.points.length - 1];
  const gapDays = daysBetweenDates(previousPoint?.date, quotePoint.date);
  const metrics =
    Number.isFinite(gapDays) && gapDays > 14
      ? { ...chart.metrics, return5d: null, return1m: null, return3m: null, volumeRatio: null }
      : chart.metrics;
  return {
    ...chart,
    regularMarketPrice: quotePoint.close,
    previousClose: previousClose ?? chart.previousClose,
    dayChange: Number.isFinite(dayChange) ? round(dayChange, 3) : chart.dayChange,
    dayChangePct: Number.isFinite(dayChangePct) ? round(dayChangePct, 2) : chart.dayChangePct,
    lastClose: round(quotePoint.close, 3),
    lastDate: quotePoint.date,
    metrics,
  };
}

function daysBetweenDates(start, end) {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  return Math.round((endTime - startTime) / 86_400_000);
}

async function fetchSinaAshareChart(symbol, fallbackName = "") {
  const market = ashareMarketInfo(symbol);
  const code = eastmoneyCode(symbol);
  const sinaCode = `${market.prefix}${code}`;
  const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${sinaCode}&scale=240&ma=no&datalen=321`;
  const klines = await fetchJson(
    url,
    { headers: { Referer: "https://finance.sina.com.cn/", "User-Agent": "Mozilla/5.0" } },
    45_000,
  );
  const points = (Array.isArray(klines) ? klines : [])
    .map((line) => ({
      date: line.day,
      open: safeNumber(line.open),
      high: safeNumber(line.high),
      low: safeNumber(line.low),
      close: safeNumber(line.close),
      volume: safeNumber(line.volume),
    }))
    .filter((point) => Number.isFinite(point.close));

  return buildChartResult({
    symbol,
    currency: "CNY",
    exchangeName: market.exchangeName,
    instrumentType: "A股",
    name: fallbackName || symbol,
    timezone: "Asia/Shanghai",
    points,
  });
}

async function fetchYahooChart(symbol, range = "1y", interval = "1d") {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplits`;
  const data = await fetchJson(url, {}, 45_000);
  const result = data?.chart?.result?.[0];
  if (!result) {
    const message = data?.chart?.error?.description || "No chart data returned";
    throw new Error(message);
  }

  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const adjClose = result.indicators?.adjclose?.[0]?.adjclose || [];

  const points = timestamps
    .map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open: safeNumber(quote.open?.[index]),
      high: safeNumber(quote.high?.[index]),
      low: safeNumber(quote.low?.[index]),
      close: safeNumber(quote.close?.[index] ?? adjClose[index]),
      volume: safeNumber(quote.volume?.[index]),
    }))
    .filter((point) => Number.isFinite(point.close));

  if (!points.length) {
    throw new Error("Chart data has no valid close prices");
  }

  const chart = buildChartResult({
    symbol,
    currency: meta.currency || "",
    exchangeName: meta.exchangeName || meta.fullExchangeName || "",
    instrumentType: meta.instrumentType || "",
    name: meta.longName || meta.shortName || symbol,
    timezone: meta.exchangeTimezoneName || "",
    points,
  });

  return {
    ...chart,
    regularMarketPrice: safeNumber(meta.regularMarketPrice) ?? chart.regularMarketPrice,
    chartPreviousClose: safeNumber(meta.chartPreviousClose),
  };
}

async function fetchChart(symbol, range = "1y", interval = "1d") {
  if (isMainlandASymbol(symbol)) {
    return fetchEastmoneyChart(symbol);
  }

  return fetchYahooChart(symbol, range, interval);
}

async function fetchEastmoneyIntraday(symbol) {
  const normalized = normalizeSymbol(symbol);
  const market = ashareMarketInfo(normalized);
  const tencentCode = `${market.prefix}${eastmoneyCode(normalized)}`;
  const chart = await fetchChart(normalized);
  const data = await fetchJson(
    `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${tencentCode}`,
    {},
    30_000,
  );
  const rows = data?.data?.[tencentCode]?.data?.data || [];
  let previousTotalVolume = 0;
  let previousTotalAmount = 0;
  let previousPrice = chart.previousClose || chart.lastClose;
  const points = rows
    .map((line) => {
      const [rawTime, closeRaw, totalVolumeRaw, totalAmountRaw] = String(line).split(/\s+/);
      const close = safeNumber(closeRaw);
      const totalVolume = safeNumber(totalVolumeRaw) || 0;
      const totalAmount = safeNumber(totalAmountRaw) || 0;
      const volume = Math.max(0, totalVolume - previousTotalVolume);
      const amount = Math.max(0, totalAmount - previousTotalAmount);
      const open = Number.isFinite(previousPrice) ? previousPrice : close;
      previousTotalVolume = totalVolume;
      previousTotalAmount = totalAmount;
      previousPrice = close;
      const time = /^\d{4}$/.test(rawTime)
        ? `${chart.lastDate} ${rawTime.slice(0, 2)}:${rawTime.slice(2, 4)}`
        : rawTime;
      return {
        time,
        open,
        close,
        high: Math.max(open, close),
        low: Math.min(open, close),
        volume,
        amount,
        average: totalVolume > 0 ? totalAmount / totalVolume : close,
      };
    })
    .filter((point) => point.time && Number.isFinite(point.close) && isAshareTradingMinute(point.time));
  return {
    generatedAt: new Date().toISOString(),
    symbol: normalized,
    companyName: chart.name || normalized,
    currency: "CNY",
    previousClose: chart.previousClose,
    source: "腾讯免费分时",
    points,
  };
}

async function fetchYahooIntraday(symbol) {
  const encoded = encodeURIComponent(symbol);
  const data = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=1d&interval=5m&includePrePost=false`,
    {},
    30_000,
  );
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(data?.chart?.error?.description || "No intraday data returned");
  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const points = (result.timestamp || [])
    .map((timestamp, index) => ({
      time: new Date(timestamp * 1000).toISOString(),
      open: safeNumber(quote.open?.[index]),
      close: safeNumber(quote.close?.[index]),
      high: safeNumber(quote.high?.[index]),
      low: safeNumber(quote.low?.[index]),
      volume: safeNumber(quote.volume?.[index]),
      amount: null,
      average: null,
    }))
    .filter((point) => point.time && Number.isFinite(point.close));
  return {
    generatedAt: new Date().toISOString(),
    symbol,
    companyName: meta.longName || meta.shortName || symbol,
    currency: meta.currency || "USD",
    previousClose: safeNumber(meta.chartPreviousClose || meta.previousClose),
    source: "Yahoo Finance 5m free chart",
    points,
  };
}

async function fetchIntraday(inputSymbol) {
  const symbol = normalizeSymbol(inputSymbol);
  if (!symbol) throw new Error("请输入股票代码");
  try {
    return isMainlandASymbol(symbol) ? await fetchEastmoneyIntraday(symbol) : await fetchYahooIntraday(symbol);
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      symbol,
      companyName: symbol,
      currency: isMainlandASymbol(symbol) ? "CNY" : "USD",
      previousClose: null,
      source: "免费分时源暂不可用",
      points: [],
      error: error.message,
    };
  }
}

async function fetchHistoricalChart(symbol, years = 5) {
  const normalized = normalizeSymbol(symbol);
  const range = `${Math.max(1, Math.min(10, Number(years) || 5))}y`;
  if (!normalized.endsWith(".BJ")) {
    try {
      return await fetchYahooChart(normalized, range, "1d");
    } catch (error) {
      if (!isMainlandASymbol(normalized)) throw error;
    }
  }
  const chart = await fetchEastmoneyChart(normalized);
  return {
    ...chart,
    dataWarning:
      normalized.endsWith(".BJ")
        ? "北交所免费历史源覆盖有限，严肃回测需要 Tushare Pro/Choice/Wind。"
        : "A股免费备用源通常只能覆盖约 2-3 年，严肃 5 年回测建议接 Tushare Pro/Choice/Wind。",
  };
}

async function fetchYahooSummary(symbol) {
  const modules = [
    "price",
    "summaryDetail",
    "defaultKeyStatistics",
    "financialData",
    "assetProfile",
  ].join(",");
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol,
  )}?modules=${modules}`;
  try {
    const data = await fetchJson(url, {}, 5 * 60_000);
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;
    return result;
  } catch (error) {
    return null;
  }
}

function unwrapYahooNumber(value) {
  if (value && typeof value === "object" && "raw" in value) return safeNumber(value.raw);
  return safeNumber(value);
}

function extractYahooFundamentals(summary) {
  if (!summary) return null;
  const detail = summary.summaryDetail || {};
  const stats = summary.defaultKeyStatistics || {};
  const financial = summary.financialData || {};
  return {
    marketCap: unwrapYahooNumber(detail.marketCap || summary.price?.marketCap),
    trailingPE: unwrapYahooNumber(detail.trailingPE || stats.trailingPE),
    forwardPE: unwrapYahooNumber(detail.forwardPE || stats.forwardPE),
    priceToBook: unwrapYahooNumber(stats.priceToBook),
    profitMargins: unwrapYahooNumber(financial.profitMargins),
    revenueGrowth: unwrapYahooNumber(financial.revenueGrowth),
    grossMargins: unwrapYahooNumber(financial.grossMargins),
    operatingMargins: unwrapYahooNumber(financial.operatingMargins),
    returnOnEquity: unwrapYahooNumber(financial.returnOnEquity),
    debtToEquity: unwrapYahooNumber(financial.debtToEquity),
    currentRatio: unwrapYahooNumber(financial.currentRatio),
    beta: unwrapYahooNumber(stats.beta),
    sector: summary.assetProfile?.sector || "",
    industry: summary.assetProfile?.industry || "",
    businessSummary: summary.assetProfile?.longBusinessSummary || "",
  };
}

function finnhubUrl(pathname, params = {}) {
  const url = new URL(`https://finnhub.io/api/v1${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  url.searchParams.set("token", FINNHUB_API_KEY);
  return url.toString();
}

async function fetchFinnhubJson(pathname, params = {}, ttlMs = 10 * 60_000) {
  if (!FINNHUB_API_KEY) return null;
  try {
    const data = await fetchJson(finnhubUrl(pathname, params), { headers: { Accept: "application/json" } }, ttlMs);
    if (data?.error) return null;
    return data;
  } catch (error) {
    return null;
  }
}

async function fetchFinnhubFundamentals(symbol) {
  if (!FINNHUB_API_KEY || isMainlandASymbol(symbol) || !isLikelyUsCommonStock(symbol)) return null;
  const [profile, metricsPayload] = await Promise.all([
    fetchFinnhubJson("/stock/profile2", { symbol }, 6 * 60 * 60_000),
    fetchFinnhubJson("/stock/metric", { symbol, metric: "all" }, 6 * 60 * 60_000),
  ]);
  const metric = metricsPayload?.metric || {};
  if (!profile && !Object.keys(metric).length) return null;
  return {
    source: "Finnhub",
    profile: profile || {},
    metric,
    marketCap: Number.isFinite(safeNumber(profile?.marketCapitalization))
      ? safeNumber(profile.marketCapitalization) * 1_000_000
      : firstFinite(metric.marketCapitalization, metric.marketCap),
    trailingPE: firstFinite(metric.peNormalizedAnnual, metric.peBasicExclExtraTTM, metric.peTTM),
    forwardPE: firstFinite(metric.forwardPE, metric.peExclExtraAnnual),
    priceToBook: firstFinite(metric.pbAnnual, metric.pbQuarterly),
    profitMargins: percentToFraction(metric.netProfitMarginTTM),
    revenueGrowth: percentToFraction(metric.revenueGrowthTTMYoy),
    grossMargins: percentToFraction(metric.grossMarginTTM),
    operatingMargins: percentToFraction(metric.operatingMarginTTM),
    returnOnEquity: percentToFraction(metric.roeTTM),
    debtToEquity: ratioMetric(firstFinite(metric.totalDebtToEquityAnnual, metric.totalDebtToEquityQuarterly)),
    currentRatio: firstFinite(metric.currentRatioAnnual, metric.currentRatioQuarterly),
    beta: firstFinite(metric.beta),
    sector: profile?.finnhubIndustry || "",
    industry: profile?.finnhubIndustry || "",
    businessSummary: profile?.weburl ? `Company profile: ${profile.weburl}` : "",
  };
}

let secTickerMapPromise = null;

async function getSecTickerMap() {
  if (!secTickerMapPromise) {
    secTickerMapPromise = fetchJson(
      "https://www.sec.gov/files/company_tickers.json",
      { headers: { Accept: "application/json" } },
      24 * 60 * 60_000,
    ).then((data) => {
      const map = {};
      for (const value of Object.values(data || {})) {
        if (value?.ticker && value?.cik_str) {
          map[value.ticker.toUpperCase()] = {
            cik: String(value.cik_str).padStart(10, "0"),
            title: value.title,
          };
        }
      }
      return map;
    });
  }
  return secTickerMapPromise;
}

function getFactEntries(facts, tags) {
  for (const tag of tags) {
    const fact =
      facts?.facts?.["us-gaap"]?.[tag] ||
      facts?.facts?.dei?.[tag] ||
      Object.values(facts?.facts || {})
        .map((namespace) => namespace?.[tag])
        .find(Boolean);
    const usd = fact?.units?.USD || fact?.units?.shares || fact?.units?.pure;
    if (usd?.length) {
      return usd
        .filter((entry) => Number.isFinite(Number(entry.val)) && entry.filed && entry.end)
        .map((entry) => ({
          tag,
          value: Number(entry.val),
          form: entry.form,
          fy: entry.fy,
          fp: entry.fp,
          filed: entry.filed,
          end: entry.end,
        }))
        .sort((a, b) => String(a.end).localeCompare(String(b.end)));
    }
  }
  return [];
}

function latestAnnual(entries) {
  return entries
    .filter((entry) => entry.form === "10-K" || entry.fp === "FY")
    .sort((a, b) => String(a.end).localeCompare(String(b.end)))
    .slice(-2);
}

async function fetchSecFundamentals(symbol) {
  if (!isLikelyUsCommonStock(symbol)) return null;
  try {
    const tickerMap = await getSecTickerMap();
    const secRecord = tickerMap[symbol.toUpperCase()];
    if (!secRecord) return null;
    const facts = await fetchJson(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${secRecord.cik}.json`,
      { headers: { Accept: "application/json" } },
      6 * 60 * 60_000,
    );
    const revenue = latestAnnual(
      getFactEntries(facts, [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
      ]),
    );
    const netIncome = latestAnnual(getFactEntries(facts, ["NetIncomeLoss"]));
    const assets = getFactEntries(facts, ["Assets"]).slice(-1)[0];
    const liabilities = getFactEntries(facts, ["Liabilities"]).slice(-1)[0];
    const equity = getFactEntries(facts, [
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ]).slice(-1)[0];
    const sharesOutstanding = getFactEntries(facts, [
      "EntityCommonStockSharesOutstanding",
      "CommonStocksIncludingAdditionalPaidInCapital",
      "WeightedAverageNumberOfDilutedSharesOutstanding",
      "WeightedAverageNumberOfSharesOutstandingBasic",
    ])
      .filter((entry) => entry.tag === "EntityCommonStockSharesOutstanding" || entry.value > 0)
      .slice(-1)[0];
    const latestRevenue = revenue[revenue.length - 1];
    const priorRevenue = revenue[revenue.length - 2];
    const latestNetIncome = netIncome[netIncome.length - 1];
    return {
      cik: secRecord.cik,
      secName: secRecord.title,
      fiscalYear: latestRevenue?.fy || latestNetIncome?.fy || null,
      revenue: latestRevenue?.value || null,
      revenueGrowth:
        latestRevenue && priorRevenue ? round(pct(latestRevenue.value, priorRevenue.value), 2) : null,
      netIncome: latestNetIncome?.value || null,
      netMargin:
        latestNetIncome && latestRevenue
          ? round((latestNetIncome.value / latestRevenue.value) * 100, 2)
          : null,
      assets: assets?.value || null,
      liabilities: liabilities?.value || null,
      equity: equity?.value || null,
      debtRatio:
        liabilities?.value && assets?.value ? round((liabilities.value / assets.value) * 100, 2) : null,
      sharesOutstanding: sharesOutstanding?.value || null,
      source: "SEC EDGAR companyfacts",
    };
  } catch (error) {
    return { error: error.message, source: "SEC EDGAR companyfacts" };
  }
}

async function fetchEastmoneyCompanyProfile(symbol) {
  if (!isMainlandASymbol(symbol)) return null;
  try {
    const data = await fetchJson(
      `https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/PageAjax?code=${eastmoneyF10Code(symbol)}`,
      {},
      6 * 60 * 60_000,
    );
    const base = data?.jbzl?.[0] || {};
    const issue = data?.fxxg?.[0] || {};
    if (!base.SECURITY_CODE) return null;
    return {
      code: base.SECURITY_CODE,
      name: base.SECURITY_NAME_ABBR || base.STR_NAMEA || symbol,
      fullName: base.ORG_NAME || "",
      englishName: base.ORG_NAME_EN || "",
      sector: base.EM2016 || "",
      industry: base.INDUSTRYCSRC1 || "",
      market: base.TRADE_MARKET || "",
      securityType: base.SECURITY_TYPE || "",
      province: base.PROVINCE || "",
      website: base.ORG_WEB || "",
      businessSummary: base.ORG_PROFILE || "",
      businessScope: base.BUSINESS_SCOPE || "",
      listingDate: issue.LISTING_DATE || "",
      issuePe: safeNumber(issue.AFTER_ISSUE_PE),
      registeredCapitalWan: safeNumber(base.REG_CAPITAL),
      employees: safeNumber(base.EMP_NUM),
      source: "东方财富 F10 公司概况",
    };
  } catch (error) {
    return { error: error.message, source: "东方财富 F10 公司概况" };
  }
}

async function fetchEastmoneyReport(symbol, reportName, pageSize = 8) {
  const filterExpr = symbol.endsWith(".BJ")
    ? `(SECURITY_CODE="${eastmoneyCode(symbol)}")`
    : `(SECUCODE="${eastmoneySecuCode(symbol)}")`;
  const filter = encodeURIComponent(filterExpr);
  const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=${reportName}&columns=ALL&filter=${filter}&pageNumber=1&pageSize=${pageSize}&sortColumns=REPORT_DATE&sortTypes=-1`;
  const data = await fetchJson(url, {}, 6 * 60 * 60_000);
  return data?.result?.data || [];
}

async function fetchAshareFinancials(symbol, chart = null) {
  if (!isMainlandASymbol(symbol)) return null;
  try {
    const [incomeRows, balanceRows, cashRows] = await Promise.all([
      fetchEastmoneyReport(symbol, "RPT_F10_FINANCE_GINCOMEQC", 8),
      fetchEastmoneyReport(symbol, "RPT_F10_FINANCE_GBALANCE", 4),
      fetchEastmoneyReport(symbol, "RPT_F10_FINANCE_GCASHFLOW", 4),
    ]);
    const latestIncome = incomeRows[0] || {};
    const latestBalance = balanceRows[0] || {};
    const latestCash = cashRows[0] || {};
    const ttmNetProfit = incomeRows
      .slice(0, 4)
      .map((row) => safeNumber(row.PARENT_NETPROFIT ?? row.NETPROFIT))
      .filter(Number.isFinite)
      .reduce((sum, value) => sum + value, 0);
    const revenue = safeNumber(latestIncome.TOTAL_OPERATE_INCOME ?? latestIncome.OPERATE_INCOME);
    const netIncome = safeNumber(latestIncome.PARENT_NETPROFIT ?? latestIncome.NETPROFIT);
    const revenueGrowth = safeNumber(latestIncome.TOTAL_OPERATE_INCOME_YOY ?? latestIncome.OPERATE_INCOME_YOY);
    const assets = safeNumber(latestBalance.TOTAL_ASSETS);
    const liabilities = safeNumber(latestBalance.TOTAL_LIABILITIES);
    const equity = safeNumber(latestBalance.TOTAL_EQUITY ?? latestBalance.TOTAL_PARENT_EQUITY);
    const shares = safeNumber(latestBalance.SHARE_CAPITAL);
    const marketCap =
      chart?.lastClose && Number.isFinite(shares) ? chart.lastClose * shares : null;
    const trailingPE =
      marketCap && Number.isFinite(ttmNetProfit) && ttmNetProfit > 0 ? marketCap / ttmNetProfit : null;
    const netMargin = revenue && netIncome ? (netIncome / revenue) * 100 : null;
    return {
      name: latestIncome.SECURITY_NAME_ABBR || latestBalance.SECURITY_NAME_ABBR || latestCash.SECURITY_NAME_ABBR || null,
      fiscalYear: latestIncome.REPORT_DATE_NAME || latestIncome.REPORT_TYPE || null,
      reportDate: latestIncome.REPORT_DATE || null,
      noticeDate: latestIncome.NOTICE_DATE || null,
      revenue,
      revenueGrowth: Number.isFinite(revenueGrowth) ? round(revenueGrowth, 2) : null,
      netIncome,
      netMargin: Number.isFinite(netMargin) ? round(netMargin, 2) : null,
      assets,
      liabilities,
      equity,
      debtRatio:
        liabilities && assets ? round((liabilities / assets) * 100, 2) : null,
      operatingCashFlow: safeNumber(latestCash.NETCASH_OPERATE),
      operatingCashFlowYoy: safeNumber(latestCash.NETCASH_OPERATE_YOY),
      shares,
      marketCap,
      trailingPE: Number.isFinite(trailingPE) ? round(trailingPE, 2) : null,
      source: symbol.endsWith(".BJ") ? "东方财富财务数据中心" : "东方财富 F10 财务报表",
    };
  } catch (error) {
    return {
      error: error.message,
      source: symbol.endsWith(".BJ") ? "东方财富财务数据中心" : "东方财富 F10 财务报表",
    };
  }
}

function buildAshareFundamentals(profile, financials, chart) {
  const revenueGrowth =
    Number.isFinite(financials?.revenueGrowth) ? financials.revenueGrowth / 100 : null;
  const profitMargins =
    Number.isFinite(financials?.netMargin) ? financials.netMargin / 100 : null;
  return {
    marketCap: financials?.marketCap || null,
    trailingPE: financials?.trailingPE || null,
    forwardPE: null,
    priceToBook:
      financials?.marketCap && financials?.equity ? financials.marketCap / financials.equity : null,
    profitMargins,
    revenueGrowth,
    grossMargins: null,
    operatingMargins: null,
    returnOnEquity:
      financials?.netIncome && financials?.equity ? financials.netIncome / financials.equity : null,
    debtToEquity:
      financials?.liabilities && financials?.equity ? financials.liabilities / financials.equity : null,
    currentRatio: null,
    beta: null,
    sector: profile?.sector || "",
    industry: profile?.industry || "",
    businessSummary: [profile?.businessSummary, profile?.businessScope].filter(Boolean).join("\n"),
    market: profile?.market || chart?.exchangeName || "",
  };
}

function buildUsFundamentals(summary, sec, chart, finnhub) {
  const yahoo = extractYahooFundamentals(summary) || {};
  const computedMarketCap =
    yahoo.marketCap ||
    finnhub?.marketCap ||
    (Number.isFinite(sec?.sharesOutstanding) && Number.isFinite(chart?.lastClose)
      ? sec.sharesOutstanding * chart.lastClose
      : null);
  let marketCap = computedMarketCap;
  let trailingPE =
    yahoo.trailingPE ||
    finnhub?.trailingPE ||
    (marketCap && Number.isFinite(sec?.netIncome) && sec.netIncome > 0 ? marketCap / sec.netIncome : null);
  if (!yahoo.marketCap && Number.isFinite(sec?.netIncome) && marketCap && marketCap < sec.netIncome) {
    marketCap = null;
    trailingPE = null;
  }
  return {
    ...yahoo,
    marketCap,
    trailingPE: Number.isFinite(trailingPE) ? trailingPE : yahoo.trailingPE || finnhub?.trailingPE || null,
    forwardPE: yahoo.forwardPE || finnhub?.forwardPE || null,
    priceToBook: yahoo.priceToBook || finnhub?.priceToBook || null,
    profitMargins:
      yahoo.profitMargins ||
      finnhub?.profitMargins ||
      (Number.isFinite(sec?.netMargin) ? sec.netMargin / 100 : null),
    revenueGrowth:
      yahoo.revenueGrowth ||
      finnhub?.revenueGrowth ||
      (Number.isFinite(sec?.revenueGrowth) ? sec.revenueGrowth / 100 : null),
    grossMargins: yahoo.grossMargins || finnhub?.grossMargins || null,
    operatingMargins: yahoo.operatingMargins || finnhub?.operatingMargins || null,
    returnOnEquity:
      yahoo.returnOnEquity ||
      finnhub?.returnOnEquity ||
      (Number.isFinite(sec?.netIncome) && Number.isFinite(sec?.equity) && sec.equity
        ? sec.netIncome / sec.equity
        : null),
    debtToEquity:
      yahoo.debtToEquity ||
      finnhub?.debtToEquity ||
      (Number.isFinite(sec?.liabilities) && Number.isFinite(sec?.equity) && sec.equity
        ? sec.liabilities / sec.equity
        : null),
    currentRatio: yahoo.currentRatio || finnhub?.currentRatio || null,
    beta: yahoo.beta || finnhub?.beta || null,
    sector: yahoo.sector || finnhub?.sector || "",
    industry: yahoo.industry || finnhub?.industry || "",
    businessSummary: yahoo.businessSummary || finnhub?.businessSummary || "",
    source: finnhub ? "Yahoo Finance / SEC EDGAR / Finnhub" : "Yahoo Finance / SEC EDGAR",
  };
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRss(xml, source) {
  const items = [];
  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRegex) || [];
  for (const item of matches.slice(0, 12)) {
    const title = decodeEntities((item.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]);
    const link = decodeEntities((item.match(/<link>([\s\S]*?)<\/link>/i) || [])[1]);
    const pubDate = decodeEntities((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1]);
    const description = decodeEntities(
      (item.match(/<description>([\s\S]*?)<\/description>/i) || [])[1],
    ).replace(/<[^>]+>/g, "");
    if (title && link) {
      items.push({
        title: title.trim(),
        url: link.trim(),
        publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
        source,
        summary: description.trim().slice(0, 240),
      });
    }
  }
  return items;
}

async function fetchYahooNews(symbol) {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
    symbol,
  )}&region=US&lang=en-US`;
  try {
    const xml = await fetchText(url, { headers: { Accept: "application/rss+xml,text/xml" } }, 10 * 60_000);
    return parseRss(xml, "Yahoo Finance");
  } catch (error) {
    return [];
  }
}

async function fetchFinnhubCompanyNews(symbol) {
  if (!FINNHUB_API_KEY || isMainlandASymbol(symbol) || !isLikelyUsCommonStock(symbol)) return [];
  const to = new Date();
  const from = new Date(to.getTime() - 14 * 86_400_000);
  const formatDate = (date) => date.toISOString().slice(0, 10);
  const data = await fetchFinnhubJson(
    "/company-news",
    { symbol, from: formatDate(from), to: formatDate(to) },
    10 * 60_000,
  );
  if (!Array.isArray(data)) return [];
  return data
    .filter((item) => item?.headline && item?.url)
    .slice(0, 18)
    .map((item) => ({
      title: item.headline,
      url: item.url,
      publishedAt: Number.isFinite(item.datetime) ? new Date(item.datetime * 1000).toISOString() : null,
      source: item.source ? `Finnhub · ${item.source}` : "Finnhub",
      summary: String(item.summary || "").replace(/\s+/g, " ").slice(0, 240),
    }));
}

async function fetchGoogleNews(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    `${query} stock OR shares`,
  )}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const xml = await fetchText(url, { headers: { Accept: "application/rss+xml,text/xml" } }, 10 * 60_000);
    return parseRss(xml, "Google News");
  } catch (error) {
    return [];
  }
}

async function fetchGdeltNews(query) {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
    `${query} stock`,
  )}&mode=artlist&format=json&maxrecords=12&sort=HybridRel`;
  try {
    const data = await fetchJson(url, {}, 10 * 60_000);
    return (data?.articles || []).slice(0, 12).map((article) => ({
      title: article.title,
      url: article.url,
      publishedAt: article.seendate || null,
      source: article.domain || "GDELT",
      summary: article.socialimage ? "Global news article indexed by GDELT." : "",
    }));
  } catch (error) {
    return [];
  }
}

async function fetchNewsApiArticles(query) {
  if (!NEWSAPI_KEY || !query) return [];
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", query.slice(0, 450));
  url.searchParams.set("searchIn", "title,description");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "12");
  url.searchParams.set("apiKey", NEWSAPI_KEY);
  try {
    const data = await fetchJson(url.toString(), { headers: { Accept: "application/json" } }, 10 * 60_000);
    if (data?.status !== "ok" || !Array.isArray(data.articles)) return [];
    return data.articles
      .filter((article) => article?.title && article?.url)
      .map((article) => ({
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt || null,
        source: article.source?.name ? `NewsAPI · ${article.source.name}` : "NewsAPI",
        summary: String(article.description || article.content || "").replace(/\s+/g, " ").slice(0, 240),
      }));
  } catch (error) {
    return [];
  }
}

function parseEastmoneyDate(value) {
  if (Number.isFinite(Number(value))) {
    return new Date(Number(value)).toISOString();
  }
  const text = String(value || "").trim();
  if (!text) return null;
  const normalized = text.replace(/:(\d{3})$/, ".$1").replace(" ", "T");
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function fetchAshareNews(symbol) {
  try {
    const data = await fetchJson(
      `https://emweb.securities.eastmoney.com/PC_HSF10/NewsBulletin/PageAjax?code=${eastmoneyF10Code(symbol)}`,
      {},
      10 * 60_000,
    );
    const stockNews = data?.gszx?.data?.items || [];
    const notices = data?.gsgg || [];
    const articles = [
      ...stockNews.map((item) => ({
        title: item.title,
        url: item.url || item.uniqueUrl,
        publishedAt: parseEastmoneyDate(item.showDateTime || item.publishDate),
        source: "东方财富资讯",
        summary: item.summary || "",
      })),
      ...notices.map((item) => ({
        title: item.title,
        url: `https://data.eastmoney.com/notices/detail/${eastmoneyCode(symbol)}/${item.art_code}.html`,
        publishedAt: parseEastmoneyDate(item.display_time || item.notice_date),
        source: "东方财富公告",
        summary: String(item.content || "").replace(/\s+/g, " ").slice(0, 240),
      })),
    ];
    const seen = new Set();
    return articles
      .filter((item) => item.title && item.url)
      .filter((item) => {
        const key = item.url.replace(/\?.*$/, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 18);
  } catch (error) {
    return [];
  }
}

async function fetchNews(symbol, companyName) {
  if (isMainlandASymbol(symbol)) {
    const ashareNews = await fetchAshareNews(symbol);
    const query = [companyName, eastmoneyCode(symbol), "股票"].filter(Boolean).join(" ");
    const batches = ashareNews.length
      ? [ashareNews, await fetchNewsApiArticles(query)]
      : await Promise.all([fetchNewsApiArticles(query), fetchGoogleNews(query), fetchGdeltNews(query)]);
    const seen = new Set();
    return batches
      .flat()
      .filter((item) => item.title && item.url)
      .filter((item) => {
        const key = item.url.replace(/\?.*$/, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 22);
  }

  const query = companyName && companyName !== symbol ? `${companyName} ${symbol}` : symbol;
  const batches = await Promise.all([
    fetchFinnhubCompanyNews(symbol),
    fetchYahooNews(symbol),
    fetchNewsApiArticles(query),
    fetchGoogleNews(query),
    fetchGdeltNews(query),
  ]);
  const seen = new Set();
  const deduped = batches
    .flat()
    .filter((item) => item.title && item.url)
    .filter((item) => {
      const key = item.url.replace(/\?.*$/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 24);
  const tokens = [
    symbol.replace(/\..*$/, "").toLowerCase(),
    ...String(companyName || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4)
      .filter((token) => !["corporation", "company", "limited", "holdings", "incorporated"].includes(token)),
  ];
  const relevant = deduped.filter((item) => {
    const text = `${item.title} ${item.summary || ""}`.toLowerCase();
    return tokens.some((token) => text.includes(token));
  });
  return (relevant.length >= 3 ? relevant : deduped).slice(0, 18);
}

function categorizeNews(news) {
  const categories = {
    earnings: {
      label: "财报/业绩",
      words: [
        "earnings",
        "revenue",
        "profit",
        "margin",
        "guidance",
        "forecast",
        "quarter",
        "eps",
        "财报",
        "业绩",
        "年报",
        "季报",
        "一季度",
        "净利润",
        "营收",
        "利润",
        "毛利",
      ],
      score: 0,
    },
    ai: {
      label: "AI/算力",
      words: [
        "ai",
        "artificial intelligence",
        "gpu",
        "data center",
        "accelerator",
        "cloud",
        "model",
        "人工智能",
        "算力",
        "数据中心",
        "大模型",
      ],
      score: 0,
    },
    analyst: {
      label: "分析师/评级",
      words: ["analyst", "upgrade", "downgrade", "price target", "rating", "buy rating", "评级", "目标价", "买入", "调研"],
      score: 0,
    },
    policy: {
      label: "政策/地缘",
      words: [
        "china",
        "tariff",
        "export",
        "regulation",
        "sanction",
        "government",
        "policy",
        "政策",
        "国产替代",
        "自主可控",
        "国家项目",
        "科创板",
      ],
      score: 0,
    },
    deal: {
      label: "订单/合作",
      words: ["contract", "order", "deal", "partnership", "supplier", "customer", "launch", "订单", "合同", "合作", "客户", "产能", "产能利用率"],
      score: 0,
    },
    macro: {
      label: "宏观/利率",
      words: ["fed", "rate", "inflation", "cpi", "treasury", "yield", "dollar", "recession"],
      score: 0,
    },
    evBattery: {
      label: "新能源/电池",
      words: ["battery", "ev", "electric vehicle", "lithium", "charging", "energy storage", "电池", "新能源", "锂", "储能", "电动车"],
      score: 0,
    },
    aerospaceMaterials: {
      label: "军工/航天/新材料",
      words: [
        "航空",
        "航天",
        "商业航天",
        "大飞机",
        "发动机",
        "军工",
        "高温合金",
        "钛合金",
        "超导",
        "新材料",
        "量子计算",
        "NbTi",
      ],
      score: 0,
    },
  };

  const positiveWords = [
    "beats",
    "surge",
    "record",
    "growth",
    "strong",
    "raises",
    "upgrade",
    "wins",
    "expands",
    "rally",
  ];
  const negativeWords = [
    "miss",
    "falls",
    "lawsuit",
    "cuts",
    "downgrade",
    "weak",
    "probe",
    "delay",
    "slump",
    "risk",
    "下跌",
    "回落",
    "承压",
    "下降",
    "亏损",
    "风险",
    "竞争加剧",
  ];
  const positiveZh = ["增长", "突破", "领先", "自主可控", "拓展", "良好", "净流入", "站上", "满足客户要求"];

  const hasKeyword = (text, word) => {
    if (/[^\x00-\x7F]/.test(word)) return text.includes(word.toLowerCase());
    if (word.includes(" ")) return text.includes(word);
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  };

  let sentiment = 0;
  for (const article of news) {
    const text = `${article.title} ${article.summary || ""}`.toLowerCase();
    for (const category of Object.values(categories)) {
      for (const word of category.words) {
        if (hasKeyword(text, word)) category.score += 1;
      }
    }
    for (const word of positiveWords) {
      if (hasKeyword(text, word)) sentiment += 1;
    }
    for (const word of positiveZh) {
      if (hasKeyword(text, word)) sentiment += 1;
    }
    for (const word of negativeWords) {
      if (hasKeyword(text, word)) sentiment -= 1;
    }
  }

  return {
    categories: Object.entries(categories)
      .map(([key, category]) => ({ key, label: category.label, score: category.score }))
      .filter((category) => category.score > 0)
      .sort((a, b) => b.score - a.score),
    sentiment: clamp(50 + sentiment * 6, 0, 100),
  };
}

function textHasAny(text, words) {
  return words.some((word) => {
    const normalizedWord = word.toLowerCase();
    if (/[^\x00-\x7F]/.test(normalizedWord) || normalizedWord.includes(" ")) {
      return text.includes(normalizedWord);
    }
    const escaped = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  });
}

function daysSince(value) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.round((Date.now() - time) / 86_400_000));
}

function completedDaysSince(value) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function classifySource(source = "", url = "") {
  const text = `${source} ${url}`.toLowerCase();
  if (
    text.includes("公告") ||
    text.includes("notice") ||
    text.includes("sec.gov") ||
    text.includes("edgar") ||
    text.includes("ir.") ||
    text.includes("investor")
  ) {
    return { tier: "一手/监管", score: 92 };
  }
  if (
    text.includes("yahoo finance") ||
    text.includes("finnhub") ||
    text.includes("newsapi") ||
    text.includes("东方财富资讯") ||
    text.includes("reuters") ||
    text.includes("bloomberg")
  ) {
    return { tier: "主流资讯", score: 74 };
  }
  if (text.includes("google news") || text.includes("gdelt")) {
    return { tier: "聚合索引", score: 56 };
  }
  return { tier: "待识别来源", score: 48 };
}

function evidenceMentionsCompany(article, symbol, companyName) {
  const text = `${article.title || ""} ${article.summary || ""}`.toLowerCase();
  const code = String(symbol || "").replace(/\..*$/, "");
  const name = String(companyName || "").toLowerCase();
  const englishTokens = name
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4)
    .filter((token) => !["corp", "corporation", "company", "limited", "holdings", "inc"].includes(token));
  return Boolean(
    (code && text.includes(code.toLowerCase())) ||
      (name && /[^\x00-\x7F]/.test(name) && text.includes(name)) ||
      englishTokens.some((token) => text.includes(token)),
  );
}

function classifyEvidenceItem(article, index, context = {}) {
  const text = `${article.title || ""} ${article.summary || ""}`.toLowerCase();
  const source = classifySource(article.source, article.url);
  const recencyDays = daysSince(article.publishedAt);
  const recencyScore = recencyDays === null ? 48 : clamp(82 - recencyDays * 3, 36, 84);

  const hardWords = [
    "公告",
    "年报",
    "季报",
    "一季度",
    "业绩",
    "净利润",
    "营收",
    "合同",
    "订单",
    "中标",
    "批复",
    "回购",
    "分红",
    "ipo",
    "上市",
    "发行股票",
    "产能",
    "扩产",
    "earnings",
    "revenue",
    "eps",
    "guidance",
    "contract",
    "order",
    "files",
    "announces",
  ];
  const softWords = [
    "评级",
    "目标价",
    "调研",
    "预计",
    "有望",
    "催化",
    "upgrade",
    "downgrade",
    "price target",
    "analyst",
    "reportedly",
    "expected",
  ];
  const rumorWords = ["传闻", "传言", "据传", "市场消息", "rumor", "speculation", "people familiar", "据媒体"];
  const priceOnlyWords = ["涨", "跌", "异动", "股价", "shares", "stock rises", "stock falls", "rally", "slump"];
  const routineWords = [
    "股东会",
    "股东大会",
    "董事会",
    "监事会",
    "会议决议",
    "独立董事",
    "法律意见书",
    "章程",
    "月报表",
    "员工持股计划管理委员会",
    "证券变动月报表",
  ];
  const meetingWords = ["投资者关系活动", "调研", "业绩说明会", "电话会议", "机构交流"];
  const materialCatalystWords = [
    "业绩预告",
    "业绩快报",
    "年度报告",
    "季度报告",
    "净利润",
    "营收",
    "同比",
    "环比",
    "预增",
    "预减",
    "订单",
    "合同",
    "中标",
    "客户",
    "公开发行股票",
    "公开发行",
    "北交所",
    "ipo",
    "产能",
    "扩产",
    "收购",
    "重组",
    "回购",
  ];
  const positiveWords = ["增长", "上调", "中标", "签订", "突破", "盈利", "扩充", "扩产", "上市", "beats", "raises", "record", "wins", "strong"];
  const negativeWords = ["下滑", "亏损", "终止", "处罚", "调查", "风险", "downgrade", "misses", "probe", "weak", "cuts", "lawsuit"];

  const hasHardKeyword = textHasAny(text, hardWords);
  const hasHard = source.score >= 90 || (hasHardKeyword && source.score >= 70);
  const hasSoft = textHasAny(text, softWords);
  const hasRumor = textHasAny(text, rumorWords);
  const hasPriceOnly = textHasAny(text, priceOnlyWords);
  const hasRoutine = textHasAny(text, routineWords);
  const hasMeeting = textHasAny(text, meetingWords);
  const hasMaterialCatalyst = textHasAny(text, materialCatalystWords);
  const isDirect = evidenceMentionsCompany(article, context.symbol, context.companyName);
  const positive = textHasAny(text, positiveWords);
  const negative = textHasAny(text, negativeWords);
  const polarity = positive && negative ? "mixed" : positive ? "positive" : negative ? "negative" : "neutral";

  let catalystType = "市场解读";
  if (hasRumor) catalystType = "待核实传闻";
  else if (hasRoutine && !hasMaterialCatalyst) catalystType = "例行公告";
  else if (hasMeeting && !hasMaterialCatalyst) catalystType = "调研纪要";
  else if (hasHard) catalystType = "硬事实";
  else if (hasSoft) catalystType = "软催化";
  else if (hasPriceOnly) catalystType = "价格复述";
  if (!isDirect && catalystType === "硬事实") catalystType = "行业催化";

  const typeBonus =
    catalystType === "硬事实"
      ? 14
      : catalystType === "例行公告"
        ? -10
      : catalystType === "调研纪要"
        ? -2
      : catalystType === "行业催化"
        ? -4
      : catalystType === "软催化"
        ? 2
        : catalystType === "待核实传闻"
          ? -18
          : catalystType === "价格复述"
            ? -8
            : -4;
  const summaryBonus = article.summary && article.summary.length > 60 ? 6 : 0;
  const confidence = clamp(source.score * 0.6 + recencyScore * 0.2 + 8 + typeBonus + summaryBonus, 25, 96);
  const level = confidence >= 76 ? "高" : confidence >= 56 ? "中" : "低";
  const action =
    catalystType === "硬事实"
      ? "优先核实原文数值、公告日期和是否一次性影响"
      : catalystType === "例行公告"
        ? "通常不是交易催化，只作为公司治理和日期信息记录"
      : catalystType === "调研纪要"
        ? "提炼管理层关于订单、产能、利润率的表述，并等待公告或财报验证"
      : catalystType === "行业催化"
        ? "只能作为主题热度线索，必须找到公司订单、客户或业绩证据后才可交易"
      : catalystType === "软催化"
        ? "核对是否有公司公告或财报事实支撑"
        : catalystType === "待核实传闻"
          ? "不要直接当成买入依据，等待公告或权威媒体确认"
          : "只作为情绪线索，避免把股价变化反向解释成原因";

  return {
    index,
    title: article.title,
    url: article.url,
    source: article.source,
    summary: String(article.summary || "").replace(/\s+/g, " ").slice(0, 360),
    publishedAt: article.publishedAt,
    sourceTier: source.tier,
    catalystType,
    direct: isDirect,
    polarity,
    level,
    confidence: round(confidence, 1),
    recencyDays,
    action,
    reason: `${source.tier} · ${catalystType} · ${polarity === "neutral" ? "方向未明" : polarity}`,
  };
}

function stripHtmlToText(html) {
  return decodeEntities(
    String(html || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

async function enrichEvidenceExcerpts(items, limit = 4) {
  const selected = items
    .filter((item) => item.url && item.confidence >= 55 && !String(item.source || "").includes("Google News"))
    .slice(0, Math.max(0, limit));
  const enriched = await mapWithConcurrency(selected, 2, async (item) => {
    try {
      const html = await fetchText(item.url, { headers: { Accept: "text/html,*/*" } }, 30 * 60_000);
      const text = stripHtmlToText(html);
      return {
        ...item,
        excerpt: text.slice(0, 700),
        sourceTextAvailable: text.length > 120,
      };
    } catch (error) {
      return { ...item, sourceTextAvailable: false };
    }
  });
  const byIndex = new Map(enriched.map((item) => [item.index, item]));
  return items.map((item) => byIndex.get(item.index) || item);
}

function evidenceSortScore(item) {
  const typeScore =
    item.catalystType === "硬事实"
      ? 18
      : item.catalystType === "调研纪要"
        ? 4
        : item.catalystType === "行业催化"
          ? 2
        : item.catalystType === "软催化"
          ? 1
          : item.catalystType === "例行公告"
            ? -18
            : item.catalystType === "价格复述"
              ? -10
              : -6;
  const polarityScore =
    item.polarity === "positive" ? 8 : item.polarity === "negative" ? 5 : item.polarity === "mixed" ? 2 : 0;
  return (Number(item.confidence) || 0) + typeScore + polarityScore;
}

function buildRuleEvidenceReview({ symbol, companyName, chart, news, newsProfile, sec, fundamentals, relatedCharts }) {
  const baseItems = news.map((article, index) => classifyEvidenceItem(article, index, { symbol, companyName }));
  const sortedItems = [...baseItems].sort((a, b) => evidenceSortScore(b) - evidenceSortScore(a));
  const hardCount = sortedItems.filter((item) => item.catalystType === "硬事实" && item.level !== "低").length;
  const industryCatalystCount = sortedItems.filter((item) => item.catalystType === "行业催化").length;
  const routineCount = sortedItems.filter((item) => item.catalystType === "例行公告").length;
  const meetingCount = sortedItems.filter((item) => item.catalystType === "调研纪要").length;
  const rumorCount = sortedItems.filter((item) => item.catalystType === "待核实传闻").length;
  const positiveCount = sortedItems.filter((item) => item.polarity === "positive").length;
  const negativeCount = sortedItems.filter((item) => item.polarity === "negative").length;
  const dayMove = chart.dayChangePct || 0;
  const relatedAvg = mean(
    relatedCharts
      .filter((item) => Number.isFinite(item.chart?.dayChangePct))
      .map((item) => item.chart.dayChangePct),
  );

  const redFlags = [];
  if (Math.abs(dayMove) >= 3 && hardCount === 0) {
    redFlags.push("价格异动较大，但暂未看到高置信度公告/财报/订单类硬证据。");
  }
  if (hardCount === 0 && routineCount > 0) {
    redFlags.push("当前证据主要是股东会、董事会、月报表等例行公告，不足以解释股价异动。");
  }
  if (hardCount === 0 && industryCatalystCount > 0) {
    redFlags.push("当前主要是行业主题新闻，尚未证明目标公司有直接订单、客户或业绩兑现。");
  }
  if (rumorCount > 0) {
    redFlags.push("新闻流里出现传闻或未确认消息，应等待公告或权威来源确认。");
  }
  if (dayMove > 0 && negativeCount > positiveCount) {
    redFlags.push("股价上涨与新闻情绪并不一致，可能是资金面或预期交易。");
  }
  if (Number.isFinite(fundamentals?.trailingPE) && fundamentals.trailingPE > 60) {
    redFlags.push(`估值较高，PE(TTM) 约 ${round(fundamentals.trailingPE, 1)}，需要更强业绩兑现支撑。`);
  }
  if (Number.isFinite(sec?.debtRatio) && sec.debtRatio > 70) {
    redFlags.push(`资产负债率约 ${sec.debtRatio}%，现金流与利率敏感性需要单独核查。`);
  }
  if (Number.isFinite(relatedAvg) && Math.sign(dayMove) !== 0 && Math.sign(relatedAvg) !== 0 && Math.sign(dayMove) !== Math.sign(relatedAvg)) {
    redFlags.push(`产业链平均变动 ${round(relatedAvg, 2)}%，与目标股方向不一致。`);
  }

  const topTopic = newsProfile.categories?.[0];
  let verdict = "待核实";
  if (hardCount >= 1 && dayMove >= 0) verdict = "有硬证据支撑的正向催化";
  else if (hardCount >= 1 && dayMove < 0) verdict = "有硬证据但市场反应偏负面";
  else if (Math.abs(dayMove) >= 3) verdict = "更像资金/情绪驱动，硬证据不足";
  else if (topTopic) verdict = "主题线索存在，但催化强度一般";
  else verdict = "暂无明确催化";

  const confidence = clamp(
    42 +
      hardCount * 12 +
      Math.min(18, (hardCount + meetingCount) * 3) +
      Math.abs(dayMove) * 3 -
      rumorCount * 8 -
      routineCount * 2 -
      Math.max(0, redFlags.length - 1) * 5,
    25,
    92,
  );

  const reasonChain = [
    `${companyName || symbol} 当日变动 ${round(dayMove, 2)}%，成交量倍数 ${chart.metrics.volumeRatio || "暂无"}。`,
    hardCount
      ? `已识别 ${hardCount} 条硬事实类证据，优先看公告/财报/订单原文。`
      : "暂未识别到足够强的公告、财报或订单类硬证据。",
    topTopic ? `新闻主题集中在 ${topTopic.label}，出现 ${topTopic.score} 次。` : "新闻主题尚未明显聚类。",
    Number.isFinite(relatedAvg)
      ? `上下游/同行平均变动约 ${round(relatedAvg, 2)}%，用于判断产业链扩散。`
      : "产业链同步性样本不足。",
  ];

  const questions = [
    "最高置信度原文里是否出现明确金额、数量、客户名称、同比/环比数据？",
    "这条消息是公司/监管披露，还是媒体、券商或二级市场解读？",
    "消息影响的是一次性利润、长期订单、政策估值重估，还是短期情绪？",
    "上游、下游、同行是否同向反应，还是只有目标股独立异动？",
  ];

  return {
    mode: "本地证据引擎",
    model: null,
    verdict,
    confidence: round(confidence, 1),
    hardEvidenceCount: hardCount,
    industryCatalystCount,
    routineEvidenceCount: routineCount,
    meetingEvidenceCount: meetingCount,
    rumorCount,
    positiveCount,
    negativeCount,
    reasonChain,
    redFlags,
    questions,
    items: sortedItems,
  };
}

function extractAiText(payload) {
  if (payload?.output_text) return payload.output_text;
  const parts = [];
  for (const output of payload?.output || []) {
    for (const content of output.content || []) {
      if (content.text) parts.push(content.text);
    }
  }
  return parts.join("\n");
}

async function callExternalAiReview(context, ruleReview) {
  if (!AI_API_KEY || !AI_MODEL) return null;
  const compact = {
    symbol: context.symbol,
    companyName: context.companyName,
    chart: {
      dayChangePct: context.chart.dayChangePct,
      return5d: context.chart.metrics.return5d,
      return1m: context.chart.metrics.return1m,
      volumeRatio: context.chart.metrics.volumeRatio,
    },
    fundamentals: context.fundamentals,
    evidence: ruleReview.items.slice(0, 8).map((item) => ({
      title: item.title,
      source: item.source,
      sourceTier: item.sourceTier,
      catalystType: item.catalystType,
      level: item.level,
      polarity: item.polarity,
      excerpt: item.excerpt || "",
    })),
    ruleVerdict: ruleReview.verdict,
    redFlags: ruleReview.redFlags,
  };
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      verdict: { type: "string" },
      confidence: { type: "number" },
      reasonChain: { type: "array", items: { type: "string" } },
      redFlags: { type: "array", items: { type: "string" } },
      questions: { type: "array", items: { type: "string" } },
    },
    required: ["verdict", "confidence", "reasonChain", "redFlags", "questions"],
  };
  try {
    const response = await fetchWithTimeout(
      AI_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          input: [
            {
              role: "system",
              content:
                "你是股票研究助理。只基于给定证据判断催化强度，不给买卖建议。输出严格 JSON。",
            },
            {
              role: "user",
              content: JSON.stringify(compact),
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "stock_evidence_review",
              schema,
              strict: true,
            },
          },
        }),
      },
      18_000,
    );
    const payload = await response.json();
    const parsed = JSON.parse(extractAiText(payload));
    return {
      ...ruleReview,
      mode: "大模型增强",
      model: AI_MODEL,
      verdict: parsed.verdict || ruleReview.verdict,
      confidence: Number.isFinite(Number(parsed.confidence)) ? round(Number(parsed.confidence), 1) : ruleReview.confidence,
      reasonChain: parsed.reasonChain?.length ? parsed.reasonChain.slice(0, 5) : ruleReview.reasonChain,
      redFlags: parsed.redFlags || ruleReview.redFlags,
      questions: parsed.questions?.length ? parsed.questions.slice(0, 6) : ruleReview.questions,
    };
  } catch (error) {
    return {
      ...ruleReview,
      aiError: error.message,
    };
  }
}

async function buildEvidenceReview(context, options = {}) {
  const ruleReview = buildRuleEvidenceReview(context);
  const enrichedItems =
    options.fetchSourceText === false
      ? ruleReview.items
      : await enrichEvidenceExcerpts(ruleReview.items, options.sourceTextLimit ?? 4);
  const enrichedRuleReview = { ...ruleReview, items: enrichedItems };
  return (await callExternalAiReview(context, enrichedRuleReview)) || enrichedRuleReview;
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

function getAshareSupplyChain(symbol, companyName, profile = {}) {
  const text = `${profile.sector || ""} ${profile.industry || ""} ${profile.businessSummary || ""} ${
    profile.businessScope || ""
  } ${companyName || ""}`.toLowerCase();

  if (
    includesAny(text, [
      "超导",
      "钛合金",
      "高温合金",
      "航空",
      "航天",
      "大飞机",
      "发动机",
      "军工",
      "新材料",
      "有色金属",
      "金属非金属新材料",
    ])
  ) {
    return {
      company: companyName || symbol,
      confidence: "中",
      source: "A股行业模板 + 东方财富 F10 业务描述",
      thesis:
        "该公司处在高端金属新材料链条，核心受航空航天、军工装备、商业航天、国产替代和原材料价格共同影响。",
      upstream: [
        { symbol: "600456.SS", name: "宝钛股份", market: "A股", role: "钛材/稀有金属材料供应与可比", weight: 66 },
        { symbol: "603993.SS", name: "洛阳钼业", market: "A股", role: "钼钨钴等上游金属资源", weight: 44 },
        { symbol: "600111.SS", name: "北方稀土", market: "A股", role: "稀土/功能材料上游代理", weight: 38 },
      ],
      downstream: [
        { symbol: "600760.SS", name: "中航沈飞", market: "A股", role: "航空装备需求代理", weight: 72 },
        { symbol: "000768.SZ", name: "中航西飞", market: "A股", role: "大飞机/军机需求代理", weight: 66 },
        { symbol: "600893.SS", name: "航发动力", market: "A股", role: "航空发动机需求代理", weight: 64 },
        { symbol: "600118.SS", name: "中国卫星", market: "A股", role: "航天应用需求代理", weight: 45 },
      ],
      competitors: [
        { symbol: "300034.SZ", name: "钢研高纳", market: "A股", role: "高温合金可比公司", weight: 72 },
        { symbol: "300855.SZ", name: "图南股份", market: "A股", role: "高温合金/特种合金可比", weight: 68 },
        { symbol: "600399.SS", name: "抚顺特钢", market: "A股", role: "特钢/高温合金可比", weight: 58 },
      ],
    };
  }

  if (includesAny(text, ["半导体", "集成电路", "芯片", "晶圆", "封装", "光刻", "电子元器件"])) {
    return {
      company: companyName || symbol,
      confidence: "中",
      source: "A股行业模板 + 东方财富 F10 业务描述",
      thesis: "半导体公司通常受国产替代、晶圆制造、设备材料、下游终端需求和行业库存周期共同影响。",
      upstream: [
        { symbol: "002371.SZ", name: "北方华创", market: "A股", role: "半导体设备", weight: 68 },
        { symbol: "688012.SS", name: "中微公司", market: "A股", role: "刻蚀/MOCVD设备", weight: 62 },
        { symbol: "688126.SS", name: "沪硅产业", market: "A股", role: "硅片材料", weight: 54 },
      ],
      downstream: [
        { symbol: "688981.SS", name: "中芯国际", market: "A股", role: "晶圆制造需求代理", weight: 70 },
        { symbol: "603501.SS", name: "韦尔股份", market: "A股", role: "终端芯片需求代理", weight: 52 },
      ],
      competitors: [
        { symbol: "603986.SS", name: "兆易创新", market: "A股", role: "芯片设计可比", weight: 56 },
        { symbol: "688008.SS", name: "澜起科技", market: "A股", role: "芯片设计可比", weight: 54 },
      ],
    };
  }

  if (includesAny(text, ["电池", "锂", "新能源", "储能", "电动车", "正极", "负极"])) {
    return {
      company: companyName || symbol,
      confidence: "中",
      source: "A股行业模板 + 东方财富 F10 业务描述",
      thesis: "新能源链条受电动车销量、储能装机、锂价、材料价格、海外需求和价格竞争共同影响。",
      upstream: [
        { symbol: "002466.SZ", name: "天齐锂业", market: "A股", role: "锂资源", weight: 60 },
        { symbol: "002460.SZ", name: "赣锋锂业", market: "A股", role: "锂盐/锂资源", weight: 60 },
        { symbol: "300919.SZ", name: "中伟股份", market: "A股", role: "三元前驱体", weight: 48 },
      ],
      downstream: [
        { symbol: "002594.SZ", name: "比亚迪", market: "A股", role: "整车/电池需求", weight: 75 },
        { symbol: "601633.SS", name: "长城汽车", market: "A股", role: "整车需求代理", weight: 42 },
      ],
      competitors: [
        { symbol: "300750.SZ", name: "宁德时代", market: "A股", role: "动力电池龙头", weight: 78 },
        { symbol: "300014.SZ", name: "亿纬锂能", market: "A股", role: "动力/储能电池可比", weight: 62 },
      ],
    };
  }

  return {
    company: companyName || symbol,
    confidence: "低",
    source: "A股市场模板",
    thesis:
      "暂未命中已整理产业链。当前先用 A股宽基/成长风格和同市场代理，后续应接入公告抽取和行业数据库来提高关系准确度。",
    upstream: [],
    downstream: [],
    competitors: [
      { symbol: "000300.SS", name: "沪深300", market: "A股", role: "A股大盘基准", weight: 28 },
      { symbol: "000905.SS", name: "中证500", market: "A股", role: "中盘风格基准", weight: 26 },
      { symbol: "399006.SZ", name: "创业板指", market: "A股", role: "成长风格基准", weight: 24 },
    ],
  };
}

function getSupplyChain(symbol, companyName, profile = {}) {
  const direct = supplyChains[symbol] || supplyChains[aliasToCanonical[String(companyName || "").toUpperCase()]];
  if (direct) {
    return {
      confidence: "高",
      source: "curated MVP knowledge base",
      ...direct,
    };
  }

  if (isMainlandASymbol(symbol)) {
    return getAshareSupplyChain(symbol, companyName, profile);
  }

  const sectorText = `${profile.sector || ""} ${profile.industry || ""} ${companyName || ""}`.toLowerCase();

  if (sectorText.includes("semiconductor") || sectorText.includes("chip")) {
    return {
      company: companyName || symbol,
      confidence: "中",
      source: "sector template inference",
      thesis: "半导体公司通常受晶圆制造、设备、EDA、云/终端需求和同行周期共同影响。",
      upstream: [
        { symbol: "2330.TW", name: "Taiwan Semiconductor", market: "Taiwan", role: "foundry", weight: 74 },
        { symbol: "ASML", name: "ASML", market: "US/NL", role: "lithography", weight: 62 },
        { symbol: "AMAT", name: "Applied Materials", market: "US", role: "equipment", weight: 58 },
      ],
      downstream: [
        { symbol: "MSFT", name: "Microsoft", market: "US", role: "cloud demand", weight: 42 },
        { symbol: "AMZN", name: "Amazon", market: "US", role: "cloud demand", weight: 40 },
      ],
      competitors: [
        { symbol: "NVDA", name: "NVIDIA", market: "US", role: "semiconductor comparable", weight: 60 },
        { symbol: "AMD", name: "Advanced Micro Devices", market: "US", role: "semiconductor comparable", weight: 58 },
        { symbol: "AVGO", name: "Broadcom", market: "US", role: "semiconductor comparable", weight: 54 },
      ],
    };
  }

  if (sectorText.includes("auto") || sectorText.includes("vehicle") || sectorText.includes("ev")) {
    return {
      company: companyName || symbol,
      confidence: "中",
      source: "sector template inference",
      thesis: "汽车公司通常受电池、锂材料、整车需求、价格竞争和利率环境共同影响。",
      upstream: [
        { symbol: "300750.SZ", name: "CATL", market: "China", role: "battery supplier", weight: 64 },
        { symbol: "ALB", name: "Albemarle", market: "US", role: "lithium producer", weight: 45 },
      ],
      downstream: [
        { symbol: "UBER", name: "Uber", market: "US", role: "fleet/autonomy proxy", weight: 28 },
      ],
      competitors: [
        { symbol: "TSLA", name: "Tesla", market: "US", role: "EV comparable", weight: 70 },
        { symbol: "002594.SZ", name: "BYD", market: "China", role: "EV comparable", weight: 65 },
        { symbol: "GM", name: "General Motors", market: "US", role: "auto comparable", weight: 50 },
      ],
    };
  }

  return {
    company: companyName || symbol,
    confidence: "低",
    source: "generic fallback inference",
    thesis:
      "暂未命中已整理产业链。当前仅提供市场代理和同类资产，后续应接入 FactSet/企业公告抽取来提高关系准确度。",
    upstream: [
      { symbol: "SPY", name: "S&P 500 ETF", market: "US", role: "broad market proxy", weight: 20 },
      { symbol: "QQQ", name: "Nasdaq 100 ETF", market: "US", role: "growth/technology proxy", weight: 25 },
    ],
    downstream: [],
    competitors: [
      { symbol: "SPY", name: "S&P 500 ETF", market: "US", role: "market comparable", weight: 20 },
    ],
  };
}

function uniqueBySymbol(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.symbol;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = [];
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        results[index] = { error: error.message, input: items[index] };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function scoreCandidate({ chart, relation, newsProfile, sec, fundamentals }) {
  const metrics = chart.metrics || {};
  const momentum = clamp(
    50 +
      (metrics.return1m || 0) * 1.2 +
      (metrics.return3m || 0) * 0.45 +
      (metrics.return5d || 0) * 1.4,
  );
  const risk = clamp(88 - Math.abs(metrics.maxDrawdown1y || 0) * 0.8 - (metrics.volatility63d || 0) * 2.4);
  const catalyst = clamp(
    45 +
      Math.abs(chart.dayChangePct || 0) * 4 +
      ((metrics.volumeRatio || 1) - 1) * 16 +
      ((newsProfile?.sentiment || 50) - 50) * 0.5,
  );
  const relationship = clamp(30 + (relation?.weight || 35) * 0.7);
  const qualityInputs = [];
  if (Number.isFinite(sec?.revenueGrowth)) qualityInputs.push(clamp(50 + sec.revenueGrowth * 1.1));
  if (Number.isFinite(sec?.netMargin)) qualityInputs.push(clamp(45 + sec.netMargin * 1.2));
  if (Number.isFinite(sec?.debtRatio)) qualityInputs.push(clamp(95 - sec.debtRatio * 0.65));
  if (Number.isFinite(fundamentals?.revenueGrowth)) qualityInputs.push(clamp(50 + fundamentals.revenueGrowth * 120));
  if (Number.isFinite(fundamentals?.profitMargins)) qualityInputs.push(clamp(45 + fundamentals.profitMargins * 120));
  const quality = qualityInputs.length ? mean(qualityInputs) : 50;
  const valuation = Number.isFinite(fundamentals?.forwardPE)
    ? clamp(90 - Math.max(0, fundamentals.forwardPE - 10) * 1.6)
    : Number.isFinite(fundamentals?.trailingPE)
      ? clamp(90 - Math.max(0, fundamentals.trailingPE - 10) * 1.3)
      : 50;
  const total =
    momentum * 0.22 +
    catalyst * 0.18 +
    relationship * 0.18 +
    quality * 0.18 +
    valuation * 0.1 +
    risk * 0.14;
  return {
    total: round(total, 1),
    momentum: round(momentum, 1),
    catalyst: round(catalyst, 1),
    relationship: round(relationship, 1),
    quality: round(quality, 1),
    valuation: round(valuation, 1),
    risk: round(risk, 1),
  };
}

function buildDrivers({ chart, newsProfile, benchmarks, relatedCharts }) {
  const drivers = [];
  const dayMove = chart.dayChangePct || 0;
  if (Math.abs(dayMove) >= 1) {
    drivers.push({
      title: dayMove >= 0 ? "价格异动本身偏强" : "价格异动本身偏弱",
      confidence: Math.min(92, 55 + Math.abs(dayMove) * 6),
      evidence: `${chart.symbol} 最新交易日变动 ${round(dayMove, 2)}%，5日 ${chart.metrics.return5d ?? "N/A"}%，1个月 ${
        chart.metrics.return1m ?? "N/A"
      }%。`,
    });
  }
  if (chart.metrics.volumeRatio && chart.metrics.volumeRatio >= 1.3) {
    drivers.push({
      title: "成交量放大，市场正在重新定价",
      confidence: Math.min(88, 50 + (chart.metrics.volumeRatio - 1) * 24),
      evidence: `最新成交量约为前期均量的 ${chart.metrics.volumeRatio} 倍。`,
    });
  }
  if (newsProfile.categories.length) {
    const top = newsProfile.categories[0];
    drivers.push({
      title: `${top.label}新闻密度最高`,
      confidence: clamp(48 + top.score * 10, 45, 88),
      evidence: `近期新闻中 "${top.label}" 主题出现 ${top.score} 次，需结合原文验证是否为真正催化。`,
    });
  }
  const benchmarkEntries = Object.values(benchmarks || {}).filter((item) => Number.isFinite(item?.dayChangePct));
  const benchmarkAvg = mean(benchmarkEntries.map((item) => item.dayChangePct));
  if (Number.isFinite(benchmarkAvg) && Math.abs(benchmarkAvg) >= 0.5) {
    drivers.push({
      title: benchmarkAvg > 0 ? "大盘/行业顺风" : "大盘/行业逆风",
      confidence: clamp(45 + Math.abs(benchmarkAvg) * 18, 45, 76),
      evidence: `参考指数/ETF 当日平均变动约 ${round(benchmarkAvg, 2)}%。`,
    });
  }
  const relatedMoves = relatedCharts
    .filter((item) => item.chart && Number.isFinite(item.chart.dayChangePct))
    .map((item) => item.chart.dayChangePct);
  const relatedAvg = mean(relatedMoves);
  if (Number.isFinite(relatedAvg) && Math.abs(relatedAvg) >= 0.7) {
    drivers.push({
      title: relatedAvg > 0 ? "产业链同步走强" : "产业链同步承压",
      confidence: clamp(50 + Math.abs(relatedAvg) * 14, 45, 82),
      evidence: `已识别上下游/同行平均变动约 ${round(relatedAvg, 2)}%。`,
    });
  }
  if (!drivers.length) {
    drivers.push({
      title: "暂无单一强解释，先按证据清单追踪",
      confidence: 42,
      evidence: "价格、新闻和产业链信号尚未形成一致方向，适合继续观察公告和成交量变化。",
    });
  }
  return drivers.slice(0, 5);
}

function buildResearchMemo({ symbol, chart, supplyChain, newsProfile, candidates, sec, fundamentals, drivers, evidenceReview }) {
  const topCandidate = candidates[0];
  const positive = [];
  const negative = [];
  const checks = [];
  const isAshare = isMainlandASymbol(symbol);

  if ((chart.dayChangePct || 0) > 0) {
    positive.push(`目标股当日上涨 ${chart.dayChangePct}%，短线动量改善。`);
  } else if ((chart.dayChangePct || 0) < 0) {
    negative.push(`目标股当日下跌 ${Math.abs(chart.dayChangePct)}%，说明资金尚未确认正向叙事。`);
  }
  if ((chart.metrics.return1m || 0) > 5) {
    positive.push(`1个月涨幅 ${chart.metrics.return1m}% ，市场已经开始交易相关预期。`);
  }
  if ((chart.metrics.maxDrawdown1y || 0) < -25) {
    negative.push(`过去一年最大回撤 ${chart.metrics.maxDrawdown1y}% ，波动和回撤风险较高。`);
  }
  if (newsProfile.categories[0]) {
    positive.push(`新闻主题集中在 ${newsProfile.categories[0].label}，可作为近期催化线索。`);
  }
  if (evidenceReview?.hardEvidenceCount > 0) {
    positive.push(`证据层识别到 ${evidenceReview.hardEvidenceCount} 条硬事实类线索，优先核实公告/财报/订单原文。`);
  }
  if (evidenceReview?.verdict?.includes("硬证据不足")) {
    negative.push("证据层判断硬证据不足，当前更可能是资金或情绪驱动。");
  }
  if (evidenceReview?.rumorCount > 0) {
    negative.push("新闻流出现待核实传闻，不能直接作为投资假设。");
  }
  if (Number.isFinite(sec?.revenueGrowth) && sec.revenueGrowth > 8) {
    positive.push(`${isAshare ? "最新A股财报" : "SEC 年报"}数据中的收入增长约 ${sec.revenueGrowth}%，基本面有增长支撑。`);
  }
  if (Number.isFinite(sec?.debtRatio) && sec.debtRatio > 70) {
    negative.push(`资产负债率约 ${sec.debtRatio}%，利率或现金流压力需要重点核查。`);
  }
  if (Number.isFinite(fundamentals?.forwardPE) && fundamentals.forwardPE > 45) {
    negative.push(`Forward P/E 约 ${round(fundamentals.forwardPE, 1)}，估值容错率偏低。`);
  }

  checks.push("把最高置信度新闻/公告打开核实原文，确认是订单、业绩、政策事实，还是二级市场解读。");
  for (const question of evidenceReview?.questions?.slice(0, 2) || []) {
    checks.push(question);
  }
  checks.push(isAshare ? "核对最新公告、投资者关系活动记录和下一次定期报告日期。" : "核对下一次财报日期、管理层指引和利润率变化。");
  checks.push("比较目标股与上下游公司最近 1个月和 3个月表现，判断资金是在买龙头还是扩散到产业链。");
  checks.push(
    isAshare
      ? "若产业链置信度为中/低，应补充年报客户/供应商披露、互动易/上证e互动和行业数据库。"
      : "若产业链置信度为中/低，应补充公司公告、10-K 客户/供应商披露或付费供应链数据。",
  );

  return {
    stance:
      `${evidenceReview?.verdict || "证据待核实"}。${
        topCandidate?.symbol === symbol
          ? "目标股在当前样本中排名靠前，但需要用公告和估值继续验证。"
          : `当前样本中 ${topCandidate?.symbol || symbol} 的综合分更靠前，值得和目标股一起研究。`
      }`,
    summary: `${chart.name || symbol} 的核心叙事：${supplyChain.thesis}`,
    bullish: positive.slice(0, 4),
    bearish: negative.slice(0, 4),
    verifyNext: checks,
    topDriver: drivers[0]?.title || "",
  };
}

function summarizeChart(chart) {
  if (!chart) return null;
  const { points, ...rest } = chart;
  return rest;
}

async function ensureDataDirs() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonFile(filePath, payload) {
  await ensureDataDirs();
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function publicJob(job, includeResult = true) {
  if (!job) return null;
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    label: job.label,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    updatedAt: job.updatedAt,
    error: job.error,
    result: includeResult ? job.result : undefined,
  };
}

function getRunningJob(type) {
  return [...backgroundJobs.values()].find((job) => job.type === type && job.status === "running");
}

function pruneBackgroundJobs() {
  const cutoff = Date.now() - 6 * 60 * 60_000;
  for (const [id, job] of backgroundJobs.entries()) {
    const timestamp = Date.parse(job.completedAt || job.startedAt || "");
    if (Number.isFinite(timestamp) && timestamp < cutoff) backgroundJobs.delete(id);
  }
}

function startBackgroundJob({ type, label, cacheFile, task }) {
  pruneBackgroundJobs();
  const running = getRunningJob(type);
  if (running) return running;
  const job = {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type,
    label,
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: null,
    updatedAt: new Date().toISOString(),
    error: null,
    result: null,
  };
  backgroundJobs.set(job.id, job);
  Promise.resolve()
    .then(task)
    .then(async (result) => {
      job.status = "completed";
      job.result = result;
      job.completedAt = new Date().toISOString();
      job.updatedAt = job.completedAt;
      if (cacheFile) await writeJsonFile(cacheFile, result);
    })
    .catch((error) => {
      job.status = "failed";
      job.error = error.message || "后台任务失败";
      job.completedAt = new Date().toISOString();
      job.updatedAt = job.completedAt;
    });
  return job;
}

async function readLatestResult(cacheFile) {
  return readJsonFile(cacheFile, null);
}

function normalizeSymbols(symbols) {
  return uniqueBySymbol(
    symbols
      .map((symbol) => normalizeSymbol(symbol))
      .filter(Boolean)
      .map((symbol) => ({ symbol })),
  ).map((item) => item.symbol);
}

function displayNameForSymbol(symbol) {
  const normalized = normalizeSymbol(symbol);
  if (!isMainlandASymbol(normalized)) return normalized;
  return symbolDisplayNames[normalized] || normalized;
}

function watchlistResponse(symbols, updatedAt) {
  return {
    symbols,
    items: symbols.map((symbol) => ({
      symbol,
      name: displayNameForSymbol(symbol),
    })),
    updatedAt: updatedAt || null,
  };
}

async function getWatchlist() {
  const payload = await readJsonFile(WATCHLIST_FILE, null);
  const symbols = normalizeSymbols(Array.isArray(payload) ? payload : payload?.symbols || defaultWatchlist);
  return watchlistResponse(symbols.length ? symbols : defaultWatchlist, payload?.updatedAt || null);
}

async function saveWatchlist(symbols) {
  const payload = {
    updatedAt: new Date().toISOString(),
    symbols: normalizeSymbols(symbols).slice(0, 200),
  };
  if (!payload.symbols.length) payload.symbols = defaultWatchlist;
  await writeJsonFile(WATCHLIST_FILE, payload);
  return watchlistResponse(payload.symbols, payload.updatedAt);
}

async function addWatchlistSymbol(inputSymbol) {
  const symbol = normalizeSymbol(inputSymbol);
  if (!symbol) throw new Error("请输入股票代码");
  const watchlist = await getWatchlist();
  return saveWatchlist([...watchlist.symbols, symbol]);
}

async function removeWatchlistSymbol(inputSymbol) {
  const symbol = normalizeSymbol(inputSymbol);
  const watchlist = await getWatchlist();
  return saveWatchlist(watchlist.symbols.filter((item) => item !== symbol));
}

function reportFileForSymbol(symbol) {
  const safeSymbol = normalizeSymbol(symbol).replace(/[^A-Z0-9.-]/gi, "_");
  return path.join(REPORTS_DIR, `${safeSymbol}.json`);
}

function stableHash(value) {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function reportDedupeKey(report) {
  return [
    report.symbol,
    String(report.generatedAt || "").slice(0, 10),
    round(report.lastPrice, 3) ?? "",
    round(report.dayChangePct, 2) ?? "",
    stableHash(`${report.topDriver || ""}|${report.evidenceVerdict || ""}`),
  ].join("|");
}

function dedupeReports(reports) {
  const seen = new Set();
  return (Array.isArray(reports) ? reports : []).filter((report) => {
    const key = reportDedupeKey(report);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildBriefingReasons(analysis) {
  const chart = analysis.chart || {};
  const metrics = chart.metrics || {};
  const evidence = analysis.evidenceReview || {};
  const reasons = [];
  const tradableCount = (evidence.items || []).filter(
    (item) => item.catalystType === "硬事实" && item.polarity !== "neutral" && (item.confidence || 0) >= 72,
  ).length;
  if (Number.isFinite(metrics.volumeRatio)) {
    reasons.push(`量价：量比 ${round(metrics.volumeRatio, 2)}x，1月 ${formatSignedPct(metrics.return1m)}，3月 ${formatSignedPct(metrics.return3m)}`);
  } else {
    reasons.push(`趋势：1月 ${formatSignedPct(metrics.return1m)}，3月 ${formatSignedPct(metrics.return3m)}`);
  }
  reasons.push(
    `证据：可交易催化 ${tradableCount} 条，硬事实 ${evidence.hardEvidenceCount || 0} 条，行业催化 ${evidence.industryCatalystCount || 0} 条，例行公告 ${evidence.routineEvidenceCount || 0} 条`,
  );
  const firstEvidence = (evidence.items || [])[0];
  if (firstEvidence?.title) reasons.push(`首要证据：${firstEvidence.title}`);
  if ((evidence.redFlags || [])[0]) reasons.push(`风险：${evidence.redFlags[0]}`);
  return reasons.filter(Boolean).slice(0, 4);
}

function formatSignedPct(value) {
  if (!Number.isFinite(Number(value))) return "-";
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${round(number, 2)}%`;
}

function briefActionForAnalysis(analysis) {
  const move = Number(analysis.chart?.dayChangePct);
  const metrics = analysis.chart?.metrics || {};
  const evidence = analysis.evidenceReview || {};
  const topDriver = analysis.memo?.topDriver || analysis.drivers?.[0]?.title || "";
  const materialPositive = (evidence.items || []).filter(
    (item) => item.catalystType === "硬事实" && item.polarity === "positive" && (item.confidence || 0) >= 72,
  ).length;
  const materialNegative = (evidence.items || []).filter(
    (item) => item.catalystType === "硬事实" && item.polarity === "negative" && (item.confidence || 0) >= 72,
  ).length;
  const hasHardEvidence = materialPositive + materialNegative > 0;
  const confidence = Number(evidence.confidence) || 0;
  const volumeRatio = Number(metrics.volumeRatio);
  if (move <= -4 && (materialNegative > 0 || !hasHardEvidence || topDriver.includes("偏弱"))) return "卖出";
  if (
    move >= 2 &&
    materialPositive > 0 &&
    confidence >= 72 &&
    (metrics.return1m || 0) >= 0 &&
    (!Number.isFinite(volumeRatio) || volumeRatio >= 1)
  ) {
    return "买入";
  }
  if ((metrics.return3m || 0) <= -28 && materialPositive > 0 && confidence >= 78 && move > -2) return "买入";
  return "观望";
}

function compactText(value, maxLength = 110) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

function titleBasedDigest(title) {
  const text = String(title || "").trim();
  if (!text) return "";
  if (/股东会|股东大会/.test(text)) return "公告事项：召开股东会/股东大会，属于治理和日期信息，本身不是业绩、订单或政策催化。";
  if (/业绩|净利润|营收|收入|利润|预增|预减|亏损/.test(text)) return "业绩线索：需要核实营收、净利润、毛利率和同比/环比变化，判断是否超预期。";
  if (/合同|订单|中标|客户|供应商|采购/.test(text)) return "订单线索：需要核实金额、交付周期、客户名称和对收入利润的贡献比例。";
  if (/回购|增持|减持|质押/.test(text)) return "资本动作：需要核实金额、主体和时间窗口，判断是信心信号还是流动性压力。";
  if (/并购|重组|收购|定增|募资/.test(text)) return "资本运作：需要核实交易对价、资产质量、审批进度和摊薄影响。";
  if (/评级|目标价|研报|调研/.test(text)) return "机构观点：只能作为预期线索，必须回到财报、订单或公告验证。";
  if (/涨停|连板|大涨|大跌|异动/.test(text)) return "价格复述：它说明市场正在交易，但不能单独解释上涨或下跌原因。";
  return "";
}

function isUsefulSourceExcerpt(text, title = "") {
  const value = String(text || "");
  if (value.length < 80) return false;
  if (value.includes("东方财富网 财经") || value.includes("行情中心 指数") || value.includes("财富号 搜索")) {
    return false;
  }
  const boilerplateHits = [
    "财经 焦点 股票 新股",
    "全球财经快讯 行情中心",
    "Choice数据 妙想大模型",
    "数据中心 _ 东方财富网",
    "基金吧 博客 搜索",
  ].filter((item) => value.includes(item)).length;
  if (boilerplateHits >= 2) return false;
  const titleText = String(title || "").slice(0, 12);
  const hasSentencePunctuation = /[。；;.!?！？]/.test(value);
  return hasSentencePunctuation || (titleText && value.includes(titleText));
}

function articleForEvidence(analysis, evidenceItem) {
  return (analysis.news || []).find((article, index) => index === evidenceItem?.index) || null;
}

function evidenceContentForBriefing(analysis, evidenceItem) {
  const article = articleForEvidence(analysis, evidenceItem) || {};
  const sourceText = compactText(evidenceItem?.excerpt, 140);
  const summary = compactText(evidenceItem?.summary || article.summary, 120);
  const title = compactText(evidenceItem?.title || article.title, 92);
  if (sourceText && isUsefulSourceExcerpt(sourceText, title)) return `原文片段：${sourceText}`;
  if (summary) return `摘要：${summary}`;
  const digest = titleBasedDigest(title);
  if (digest) return digest;
  return `仅抓到标题：${title || "暂无正文"}，需要点开原文核实。`;
}

function buildBriefingDecision(analysis) {
  const chart = analysis.chart || {};
  const metrics = chart.metrics || {};
  const evidence = analysis.evidenceReview || {};
  const action = briefActionForAnalysis(analysis);
  const move = Number(chart.dayChangePct);
  const volumeRatio = Number(metrics.volumeRatio);
  const hardCount = evidence.hardEvidenceCount || 0;
  const routineCount = evidence.routineEvidenceCount || 0;
  const meetingCount = evidence.meetingEvidenceCount || 0;
  const industryCount = evidence.industryCatalystCount || 0;
  const tradableItems = (evidence.items || []).filter(
    (item) => item.catalystType === "硬事实" && item.polarity !== "neutral" && (item.confidence || 0) >= 72,
  );
  const tradableCount = tradableItems.length;
  const confidence = Number(evidence.confidence) || 0;
  const topEvidence = tradableItems[0] || (evidence.items || [])[0];
  const topic = analysis.newsProfile?.categories?.[0];
  const moveText = Number.isFinite(move) ? `当日${formatSignedPct(move)}` : "当日涨跌未知";
  const volumeText = Number.isFinite(volumeRatio) ? `量比${round(volumeRatio, 2)}x` : "量能未知";
  const trendText = `1月${formatSignedPct(metrics.return1m)}，3月${formatSignedPct(metrics.return3m)}`;
  const evidenceText = hardCount
    ? `${tradableCount}条可交易催化，最高证据为「${compactText(topEvidence?.title, 34)}」`
    : `可交易硬催化不足，最高证据为「${compactText(topEvidence?.title, 34) || "暂无"}」`;

  let decisionWhy = "";
  if (action === "买入") {
    decisionWhy = `买入逻辑：${moveText}、${volumeText}，${trendText}；${evidenceText}。只有在回撤/止损可控时才适合小仓试错。`;
  } else if (action === "卖出") {
    decisionWhy =
      tradableCount > 0
        ? `卖出/回避逻辑：虽然有${tradableCount}条催化，但${moveText}、${volumeText}，${trendText}，说明市场暂时不买账或利好已被提前交易。`
        : `卖出/回避逻辑：${moveText}、${volumeText}，${trendText}，且缺少可交易硬催化，目前看不到反转依据。`;
  } else if (tradableCount > 0) {
    decisionWhy = `观望逻辑：有${tradableCount}条可交易催化，但${moveText}、${volumeText}，${trendText}，量价或趋势还没确认，先不追。`;
  } else {
    decisionWhy = `观望逻辑：${moveText}、${volumeText}，${trendText}；缺少可交易硬催化，还不能把涨跌归因到可执行事件。`;
  }

  const nextAction =
    action === "买入"
      ? "执行：只适合小仓试错，等待放量延续或回踩不破；若后续公告无法证明订单/业绩兑现，撤回买入假设。"
      : action === "卖出"
        ? "执行：已有仓位先降风险或严格止损；无仓不逆势抄底，等负面证据消化后再重评。"
        : "执行：先不下单；只有出现订单/业绩/政策原文，并且量价转强，才升级为可买候选。";

  const evidenceItems = (evidence.items || []).slice(0, 3).map((item) => ({
    title: item.title || "",
    source: item.source || "",
    publishedAt: item.publishedAt || null,
    sourceTier: item.sourceTier || "",
    catalystType: item.catalystType || "",
    polarity: item.polarity || "",
    confidence: item.confidence ?? null,
    url: item.url || "",
    content: evidenceContentForBriefing(analysis, item),
    action: item.action || "",
  }));

  const evidenceNewsDigests = evidenceItems.map((item) => ({
    title: item.title,
    source: item.source,
    publishedAt: item.publishedAt,
    url: item.url,
    digest: item.content,
  }));
  const rawNewsDigests = (analysis.news || []).map((article) => {
      const summary = compactText(article.summary, 120);
      const digest = titleBasedDigest(article.title);
      return {
        title: article.title || "",
        source: article.source || "",
        publishedAt: article.publishedAt || null,
        url: article.url || "",
        digest: summary || digest || `仅抓到标题：${compactText(article.title, 96)}，需要打开原文确认内容。`,
      };
    });
  const seenNews = new Set();
  const newsDigests = [...evidenceNewsDigests, ...rawNewsDigests]
    .filter((item) => {
      const key = item.url || item.title;
      if (!key || seenNews.has(key)) return false;
      seenNews.add(key);
      return true;
    })
    .slice(0, 3);

  const signalBullets = [
    `走势：${moveText}，${trendText}`,
    `量能：${volumeText}${Number.isFinite(volumeRatio) ? (volumeRatio >= 1.5 ? "，资金参与度偏高" : "，放量不算强") : ""}`,
    `证据：可交易催化 ${tradableCount} 条，硬事实 ${hardCount} 条，置信度 ${round(confidence, 1) ?? "-"}%`,
    topic ? `主题：${topic.label} 出现 ${topic.score} 次，需确认是否与公司直接相关` : "主题：新闻未形成清晰聚类",
  ];

  const riskBullets = [
    ...(evidence.redFlags || []).slice(0, 2),
    ...(action === "买入" && hardCount === 0 ? ["没有硬事实支撑时，不应把上涨本身当成买入理由。"] : []),
    ...(action === "卖出" && hardCount > 0 ? ["有硬证据但股价仍弱，需核实是否利好低于预期或被提前交易。"] : []),
  ].slice(0, 3);

  return {
    action,
    decisionWhy,
    nextAction,
    trustLabel: `催化 ${tradableCount} · 可信 ${round(confidence, 1) ?? "-"}%`,
    evidenceMix: `硬事实 ${hardCount} · 行业 ${industryCount} · 例行 ${routineCount} · 调研 ${meetingCount}`,
    signalBullets,
    evidenceItems,
    newsDigests,
    riskBullets,
  };
}

function buildReportSummary(analysis, reason = "manual") {
  const top = analysis.candidates?.[0] || {};
  const decision = buildBriefingDecision(analysis);
  const dayKey = String(analysis.generatedAt || new Date().toISOString()).slice(0, 10);
  const signature = [
    analysis.symbol,
    dayKey,
    reason,
    round(analysis.chart?.lastClose, 3) ?? "",
    round(analysis.chart?.dayChangePct, 2) ?? "",
    analysis.memo?.topDriver || analysis.drivers?.[0]?.title || "",
    analysis.evidenceReview?.verdict || "",
  ].join("|");
  return {
    id: `${analysis.symbol}-${dayKey}-${reason}-${stableHash(signature)}`,
    reason,
    generatedAt: analysis.generatedAt,
    symbol: analysis.symbol,
    companyName: analysis.companyName,
    lastPrice: analysis.chart?.lastClose ?? null,
    currency: analysis.chart?.currency || "",
    dayChangePct: analysis.chart?.dayChangePct ?? null,
    return1m: analysis.chart?.metrics?.return1m ?? null,
    return3m: analysis.chart?.metrics?.return3m ?? null,
    topCandidate: top.symbol || "",
    topCandidateName: top.name || "",
    topScore: top.scores?.total ?? null,
    topDriver: analysis.memo?.topDriver || analysis.drivers?.[0]?.title || "",
    stance: analysis.memo?.stance || "",
    marketCap: analysis.fundamentals?.marketCap ?? null,
    trailingPE: analysis.fundamentals?.trailingPE ?? null,
    evidenceVerdict: analysis.evidenceReview?.verdict || "",
    evidenceConfidence: analysis.evidenceReview?.confidence ?? null,
    hardEvidenceCount: analysis.evidenceReview?.hardEvidenceCount ?? 0,
    volumeRatio: analysis.chart?.metrics?.volumeRatio ?? null,
    briefAction: decision.action,
    decisionWhy: decision.decisionWhy,
    nextAction: decision.nextAction,
    trustLabel: decision.trustLabel,
    evidenceMix: decision.evidenceMix,
    signalBullets: decision.signalBullets,
    evidenceItems: decision.evidenceItems,
    newsDigests: decision.newsDigests,
    riskBullets: decision.riskBullets,
    reasons: buildBriefingReasons(analysis),
    drivers: (analysis.drivers || []).slice(0, 3).map((item) => ({
      title: item.title,
      explanation: item.explanation,
      confidence: item.confidence,
    })),
    topics: (analysis.newsProfile?.categories || []).slice(0, 3),
    headlines: (analysis.news || []).slice(0, 3).map((item) => ({
      title: item.title,
      source: item.source,
      publishedAt: item.publishedAt,
      url: item.url,
    })),
  };
}

async function getReportHistory(inputSymbol) {
  const symbol = normalizeSymbol(inputSymbol);
  if (!symbol) return { symbol: "", reports: [] };
  const reports = await readJsonFile(reportFileForSymbol(symbol), []);
  return { symbol, reports: dedupeReports(reports) };
}

async function appendReport(analysis, reason = "manual") {
  const report = buildReportSummary(analysis, reason);
  const history = await getReportHistory(analysis.symbol);
  const reports = [
    report,
    ...history.reports.filter((item) => item.id !== report.id && reportDedupeKey(item) !== reportDedupeKey(report)),
  ].slice(0, 50);
  await writeJsonFile(reportFileForSymbol(analysis.symbol), reports);
  return { report, reports };
}

async function applyBriefingEvidenceFallback(symbol, report) {
  if ((report.evidenceItems || []).length || (report.newsDigests || []).length) return report;
  const history = await getReportHistory(symbol);
  const fallback = (history.reports || []).find(
    (item) => (item.evidenceItems || []).length || (item.newsDigests || []).length || (item.headlines || []).length,
  );
  if (!fallback) return report;
  const fallbackNews =
    fallback.newsDigests ||
    (fallback.headlines || []).map((item) => ({
      title: item.title,
      source: item.source,
      publishedAt: item.publishedAt,
      url: item.url,
      digest: `缓存标题：${item.title}`,
    }));
  return {
    ...report,
    evidenceItems: fallback.evidenceItems || [],
    newsDigests: fallbackNews || [],
    riskBullets: [
      "本次免费源未返回新闻/公告，以下证据来自最近缓存；下单前必须重新打开原文核实。",
      ...(report.riskBullets || []),
    ].slice(0, 3),
  };
}

async function buildBriefingFailureFallback(symbol, error) {
  const history = await getReportHistory(symbol);
  const fallback = (history.reports || []).find((item) => (item.evidenceItems || []).length || (item.newsDigests || []).length);
  if (!fallback) return { symbol, error: error.message || "分析失败" };
  return {
    ...fallback,
    generatedAt: new Date().toISOString(),
    stale: true,
    briefAction: "观望",
    decisionWhy: `本次免费源请求超时，暂用最近缓存研究；不能据此新开仓。`,
    nextAction: "执行：等待下一轮数据源恢复后重新生成，或点开原文手动核实。",
    trustLabel: `缓存 · ${fallback.trustLabel || "待核实"}`,
    riskBullets: ["本条来自缓存，不代表最新信息；禁止直接作为买入依据。", ...(fallback.riskBullets || [])].slice(0, 3),
  };
}

async function selectBriefingSymbols(symbols, options = {}) {
  const poolLimit = Number(options.limit) > 0 ? Math.min(symbols.length, Number(options.limit)) : symbols.length;
  const pool = symbols.slice(0, Math.max(1, poolLimit));
  const focusLimit = Math.max(4, Math.min(36, Number(options.focusLimit) || 8));
  if (options.fast === false || pool.length <= focusLimit) {
    return { symbols: pool, screenedSymbols: pool.length, selectionMode: "full" };
  }
  const snapshots = await mapWithConcurrency(pool, 8, async (symbol) => {
    try {
      const chart = await fetchChart(symbol);
      const change = Math.abs(Number(chart.dayChangePct) || 0);
      const volumeRatio = Number(chart.metrics?.volumeRatio) || 0;
      const trend = Math.abs(Number(chart.metrics?.return1m) || 0) * 0.08;
      return {
        symbol,
        score: change * 2 + Math.min(4, volumeRatio) + trend + (isMainlandASymbol(symbol) ? 0.4 : 0),
        dayChangePct: chart.dayChangePct,
        volumeRatio,
      };
    } catch (error) {
      return { symbol, score: -1, error: error.message };
    }
  });
  const selected = snapshots
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, focusLimit)
    .map((item) => item.symbol);
  return {
    symbols: selected.length ? selected : pool.slice(0, focusLimit),
    screenedSymbols: pool.length,
    selectionMode: "fast-focus",
  };
}

async function buildBriefing(options = {}) {
  const watchlist = await getWatchlist();
  const selection = await selectBriefingSymbols(watchlist.symbols, options);
  const symbols = selection.symbols;
  const analyses = await mapWithConcurrency(symbols, 4, async (symbol) => {
    try {
      const analysis = await withTimeout(
        analyzeSymbol(symbol, {
          fetchEvidenceSourceText: options.fetchEvidenceSourceText !== false,
          evidenceSourceTextLimit: Number.isFinite(Number(options.evidenceSourceTextLimit))
            ? Number(options.evidenceSourceTextLimit)
            : 1,
        }),
        Number(options.symbolTimeoutMs) || 18_000,
        `${symbol} 单票深挖超时`,
      );
      await appendReport(analysis, "briefing");
      const report = buildReportSummary(analysis, "briefing");
      return applyBriefingEvidenceFallback(symbol, report);
    } catch (error) {
      return buildBriefingFailureFallback(symbol, error);
    }
  });
  const items = analyses
    .map((item, index) =>
      item?.error
        ? { symbol: symbols[index], error: item.error }
        : item,
    )
    .sort((a, b) => Math.abs(b.dayChangePct || 0) - Math.abs(a.dayChangePct || 0));
  return {
    generatedAt: new Date().toISOString(),
    symbols,
    totalSymbols: watchlist.symbols.length,
    screenedSymbols: selection.screenedSymbols,
    scannedSymbols: symbols.length,
    selectionMode: selection.selectionMode,
    notes:
      selection.selectionMode === "fast-focus"
        ? [`已先快速筛选 ${selection.screenedSymbols} 只自选股，再深挖异动/放量靠前的 ${symbols.length} 只。`]
        : [],
    items,
  };
}

function chooseDailyStrategy(backtest) {
  const strategies = Object.values(backtest?.strategies || {});
  const ranked = strategies
    .map((strategy) => {
      const summary = strategy.summary || {};
      const trades = summary.trades || 0;
      const score =
        (trades >= 8 ? 12 : -14) +
        (summary.winRate || 0) * 0.45 +
        (summary.avgReturn || 0) * 3 +
        (summary.avgForward20d || 0) * 1.4 +
        (summary.maxDrawdown || 0) * 0.25 +
        (summary.profitFactor || 0) * 4;
      return { strategy, score };
    })
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.strategy || backtest?.selected || null;
}

function scoreDailyPick({ analysis, backtest, plan }) {
  const metrics = analysis.chart?.metrics || {};
  const fundamentals = analysis.fundamentals || {};
  const evidence = analysis.evidenceReview || {};
  const selected = backtest?.selected || {};
  const summary = selected.summary || {};
  const revenueGrowthPct = Number.isFinite(fundamentals.revenueGrowth)
    ? fundamentals.revenueGrowth * 100
    : null;
  const marginPct = Number.isFinite(fundamentals.profitMargins)
    ? fundamentals.profitMargins * 100
    : null;
  const debtToEquity = Number.isFinite(fundamentals.debtToEquity)
    ? fundamentals.debtToEquity
    : null;

  const technicalScore = clamp(
    48 +
      (metrics.return1m || 0) * 0.75 +
      (metrics.return3m || 0) * 0.25 +
      (analysis.chart?.dayChangePct || 0) * 0.5 +
      Math.max(0, (metrics.volumeRatio || 1) - 1) * 16 -
      Math.max(0, Math.abs(metrics.maxDrawdown1y || 0) - 28) * 0.5,
    10,
    95,
  );
  const evidenceScore = clamp(
    (evidence.confidence || 42) * 0.72 +
      Math.min(18, (evidence.hardEvidenceCount || 0) * 6) +
      Math.min(10, (evidence.items || []).length * 1.5),
    15,
    96,
  );
  const qualityScore = clamp(
    50 +
      (Number.isFinite(revenueGrowthPct) ? revenueGrowthPct * 0.45 : 0) +
      (Number.isFinite(marginPct) ? marginPct * 0.35 : 0) -
      (Number.isFinite(debtToEquity) ? Math.max(0, debtToEquity - 1.5) * 10 : 0) -
      (!Number.isFinite(fundamentals.marketCap) ? 5 : 0),
    15,
    92,
  );
  const backtestScore = clamp(
    40 +
      ((summary.winRate || 0) - 50) * 0.7 +
      (summary.avgReturn || 0) * 2.5 +
      (summary.avgForward20d || 0) * 1.6 +
      (summary.trades >= 8 ? 10 : -16) +
      (summary.maxDrawdown || 0) * 0.25,
    5,
    95,
  );
  const riskPenalty =
    Math.max(0, Math.abs(metrics.maxDrawdown1y || 0) - 35) * 0.35 +
    ((evidence.hardEvidenceCount || 0) === 0 ? 5 : 0) +
    (summary.trades < 8 ? 8 : 0);
  const score = clamp(
    technicalScore * 0.32 +
      evidenceScore * 0.26 +
      qualityScore * 0.18 +
      backtestScore * 0.24 -
      riskPenalty,
    0,
    100,
  );
  const action =
    score >= 76 && plan.action === "可小仓位试单"
      ? "模拟买入候选"
      : score >= 64
        ? "观察"
        : "回避";
  const reasons = [
    `技术 ${round(technicalScore, 1)}：1月 ${round(metrics.return1m, 2) ?? "-"}%，3月 ${round(metrics.return3m, 2) ?? "-"}%，量比 ${round(metrics.volumeRatio, 2) ?? "-"}`,
    `证据 ${round(evidenceScore, 1)}：${evidence.verdict || "免费源证据不足"}，硬事实 ${evidence.hardEvidenceCount || 0} 条`,
    `回测 ${round(backtestScore, 1)}：${selected.name || "-"} 胜率 ${round(summary.winRate, 1) ?? "-"}%，20日均值 ${round(summary.avgForward20d, 2) ?? "-"}%`,
  ];
  const caveats = [
    isMainlandASymbol(analysis.symbol)
      ? "A股当前使用免费行情/东方财富资讯公告，适合研究验证，不等于授权实盘数据。"
      : "美股当前使用 Yahoo/SEC/新闻聚合，适合研究验证，不等于券商实时撮合数据。",
  ];
  if (backtest?.warnings?.length) caveats.push(...backtest.warnings.slice(0, 2));
  return {
    score: round(score, 1),
    action,
    componentScores: {
      technical: round(technicalScore, 1),
      evidence: round(evidenceScore, 1),
      quality: round(qualityScore, 1),
      backtest: round(backtestScore, 1),
      riskPenalty: round(riskPenalty, 1),
    },
    reasons,
    caveats,
  };
}

function relatedAverageDayChange(analysis) {
  const values = (analysis.related || [])
    .map((item) => Number(item.chart?.dayChangePct))
    .filter(Number.isFinite);
  return mean(values);
}

function buildSignalFilter({ analysis, backtest, plan, score }) {
  const metrics = analysis.chart?.metrics || {};
  const evidence = analysis.evidenceReview || {};
  const selected = backtest?.selected || {};
  const summary = selected.summary || {};
  const relatedAvg = relatedAverageDayChange(analysis);
  const maxDrawdown = Number(summary.maxDrawdown);
  const checks = [
    {
      name: "新闻/公告证据",
      passed: (evidence.hardEvidenceCount || 0) >= 1 && (evidence.confidence || 0) >= 70,
      value: `硬证据 ${evidence.hardEvidenceCount || 0} 条，置信度 ${round(evidence.confidence, 1) ?? "-"}%`,
    },
    {
      name: "放量",
      passed: Number(metrics.volumeRatio) >= 1.05 || Number(analysis.chart?.dayChangePct) >= 3,
      value: `量比 ${round(metrics.volumeRatio, 2) ?? "-"}，当日 ${round(analysis.chart?.dayChangePct, 2) ?? "-"}%`,
    },
    {
      name: "趋势",
      passed: Number(metrics.return1m) >= -8 && Number(metrics.return3m) >= -35,
      value: `1月 ${round(metrics.return1m, 2) ?? "-"}%，3月 ${round(metrics.return3m, 2) ?? "-"}%`,
    },
    {
      name: "回测胜率",
      passed:
        (summary.trades || 0) >= 8 &&
        (summary.winRate || 0) >= 50 &&
        (summary.avgForward20d || 0) > 0 &&
        Number.isFinite(maxDrawdown) &&
        maxDrawdown > -38,
      value: `${selected.name || "-"}：${summary.trades || 0} 次，胜率 ${round(summary.winRate, 1) ?? "-"}%，20日 ${round(
        summary.avgForward20d,
        2,
      ) ?? "-"}%，回撤 ${round(summary.maxDrawdown, 1) ?? "-"}%`,
    },
    {
      name: "风险回撤",
      passed: (plan.positionPct || 0) > 0 && (plan.positionPct || 0) <= 12 && (plan.stopLossPct || 0) <= 10,
      value: `仓位 ${round(plan.positionPct, 2) ?? "-"}%，止损 ${round(plan.stopLossPct, 1) ?? "-"}%`,
    },
    {
      name: "行业强度",
      passed: !Number.isFinite(relatedAvg) || relatedAvg >= -2,
      value: Number.isFinite(relatedAvg) ? `上下游/同行均值 ${round(relatedAvg, 2)}%` : "样本不足，降权观察",
    },
  ];
  const failed = checks.filter((item) => !item.passed);
  const hardRisk =
    (evidence.hardEvidenceCount || 0) === 0 ||
    Number(analysis.chart?.dayChangePct) <= -7 ||
    (Number.isFinite(maxDrawdown) && maxDrawdown <= -45);
  const passed = failed.length === 0 && !hardRisk && (score.score || 0) >= 76;
  const grade = passed ? "强买" : hardRisk || (score.score || 0) < 48 ? "不碰" : "观察";
  const filterReasons = failed.slice(0, 3).map((item) => `${item.name}未通过：${item.value}`);
  const riskFlags = [];
  if ((evidence.hardEvidenceCount || 0) === 0) riskFlags.push("缺少公告/财报/订单类硬证据。");
  if (Number(analysis.chart?.dayChangePct) <= -7) riskFlags.push("当日跌幅过大，先等待止跌确认。");
  if (Number.isFinite(maxDrawdown) && maxDrawdown <= -45) riskFlags.push(`策略历史最大回撤 ${round(maxDrawdown, 1)}%，风险过高。`);
  return {
    passed,
    grade,
    checks,
    failed,
    filterReasons,
    riskFlags,
    relatedAvg: round(relatedAvg, 2),
  };
}

function buildRecommendationUniverse(watchlist, limit) {
  const watchItems = (watchlist.symbols || []).map((symbol) => ({
    symbol,
    source: "自选股",
    theme: "自选跟踪",
    thesis: "你主动加入的重点观察标的。",
  }));
  const themeItems = advancedThemeUniverse.map((item) => ({
    symbol: normalizeSymbol(item.symbol),
    source: "前沿主题池",
    theme: item.theme,
    thesis: item.thesis,
  }));
  const unique = uniqueBySymbol([...watchItems, ...themeItems]);
  return unique.slice(0, limit);
}

async function buildDailyPicks(options = {}) {
  const limit = Math.max(1, Math.min(120, Number(options.limit) || 80));
  const capital = Math.max(10_000, Number(options.capital) || 100_000);
  const watchlist = await getWatchlist();
  const universe = buildRecommendationUniverse(watchlist, limit);
  const results = await mapWithConcurrency(universe, 3, async (universeItem) => {
    const analysis = await analyzeSymbol(universeItem.symbol, { fetchEvidenceSourceText: false });
    if (options.recordReports !== false) await appendReport(analysis, "daily-picks");
    const backtest = await buildBacktest(analysis.symbol, "volume_breakout", 5);
    const bestStrategy = chooseDailyStrategy(backtest);
    if (bestStrategy) {
      backtest.selected = bestStrategy;
      backtest.selectedStrategy = bestStrategy.key;
    }
    const plan = buildTradePlan(analysis, backtest, capital);
    const score = scoreDailyPick({ analysis, backtest, plan });
    const filter = buildSignalFilter({ analysis, backtest, plan, score });
    return {
      generatedAt: new Date().toISOString(),
      symbol: analysis.symbol,
      companyName: analysis.companyName,
      market: isMainlandASymbol(analysis.symbol) ? "A股" : "美股",
      universeSource: universeItem.source,
      theme: universeItem.theme,
      thesis: universeItem.thesis,
      price: analysis.chart?.lastClose ?? null,
      currency: analysis.chart?.currency || "",
      dayChangePct: analysis.chart?.dayChangePct ?? null,
      return1m: analysis.chart?.metrics?.return1m ?? null,
      return3m: analysis.chart?.metrics?.return3m ?? null,
      evidenceVerdict: analysis.evidenceReview?.verdict || "",
      evidenceConfidence: analysis.evidenceReview?.confidence ?? null,
      hardEvidenceCount: analysis.evidenceReview?.hardEvidenceCount || 0,
      topDriver: analysis.memo?.topDriver || analysis.drivers?.[0]?.title || "",
      topHeadlines: (analysis.news || []).slice(0, 2).map((item) => ({
        title: item.title,
        source: item.source,
        publishedAt: item.publishedAt,
        url: item.url,
      })),
      plan,
      backtest: {
        strategy: bestStrategy?.name || "",
        winRate: bestStrategy?.summary?.winRate ?? null,
        avgReturn: bestStrategy?.summary?.avgReturn ?? null,
        avgForward20d: bestStrategy?.summary?.avgForward20d ?? null,
        maxDrawdown: bestStrategy?.summary?.maxDrawdown ?? null,
        trades: bestStrategy?.summary?.trades ?? 0,
      },
      score: score.score,
      action: filter.grade,
      signalGrade: filter.grade,
      filterPassed: filter.passed,
      filterChecks: filter.checks,
      filterReasons: filter.filterReasons,
      riskFlags: filter.riskFlags,
      relatedAvg: filter.relatedAvg,
      componentScores: score.componentScores,
      reasons: [
        filter.passed ? "信号过滤器全部通过，可进入模拟盘小仓位验证。" : filter.filterReasons[0] || score.reasons[0],
        ...score.reasons,
      ].filter(Boolean),
      caveats: [...(score.caveats || []), ...(filter.riskFlags || [])],
    };
  });
  const items = results
    .map((item, index) => (item?.error ? { symbol: universe[index]?.symbol, source: universe[index]?.source, error: item.error } : item))
    .sort((a, b) => (b.score || -1) - (a.score || -1));
  return {
    generatedAt: new Date().toISOString(),
    mode: "free-data",
    universe: "watchlist + advanced themes",
    symbols: universe.map((item) => item.symbol),
    universeBreakdown: {
      watchlist: watchlist.symbols.length,
      advancedThemes: advancedThemeUniverse.length,
      scanned: universe.length,
    },
    items,
    notes: [
      "扫描范围：自选股 + AI算力/半导体/机器人/低空经济/固态电池/商业航天/先进制造/储能等前沿主题池。",
      "每日推荐只进入研究和模拟观察，不自动真实下单。",
      "免费源可能延迟、断流或缺少历史公告/复权细节，严肃实盘前必须继续回测和模拟复盘。",
    ],
  };
}

const strategyTemplates = {
  volume_breakout: {
    name: "放量突破",
    horizon: 20,
    stopLossPct: 8,
    takeProfitPct: 18,
    description: "价格站上20日均线，单日上涨且成交量显著放大。",
  },
  trend_following: {
    name: "趋势跟随",
    horizon: 30,
    stopLossPct: 10,
    takeProfitPct: 24,
    description: "50日均线高于200日均线，价格保持在50日均线之上。",
  },
  pullback_momentum: {
    name: "强势回踩",
    horizon: 15,
    stopLossPct: 7,
    takeProfitPct: 14,
    description: "中期动量为正，短线回踩后重新企稳。",
  },
  reversal_repair: {
    name: "超跌修复",
    horizon: 20,
    stopLossPct: 9,
    takeProfitPct: 16,
    description: "60日回撤较深后出现短线反弹和放量迹象。",
  },
};

function averageAt(points, index, period, field = "close") {
  if (index + 1 < period) return null;
  const values = points.slice(index + 1 - period, index + 1).map((point) => safeNumber(point[field]));
  return mean(values);
}

function rollingReturnAt(points, index, period) {
  if (index < period) return null;
  return pct(points[index].close, points[index - period].close);
}

function rollingDrawdownAt(points, index, period) {
  const start = Math.max(0, index + 1 - period);
  return maxDrawdown(points.slice(start, index + 1));
}

function marketRegimeAt(points, index) {
  const ret120 = rollingReturnAt(points, index, 120);
  if (!Number.isFinite(ret120)) return "样本初期";
  if (ret120 >= 15) return "牛市/上升段";
  if (ret120 <= -15) return "熊市/下跌段";
  return "震荡市";
}

function signalContext(points, index) {
  const point = points[index];
  const previous = points[index - 1] || point;
  const sma20 = averageAt(points, index, 20);
  const sma50 = averageAt(points, index, 50);
  const sma200 = averageAt(points, index, 200);
  const avgVolume20 = averageAt(points, index - 1, 20, "volume");
  const volumeRatio =
    Number.isFinite(point.volume) && Number.isFinite(avgVolume20) && avgVolume20 > 0
      ? point.volume / avgVolume20
      : null;
  return {
    date: point.date,
    close: point.close,
    dayChangePct: pct(point.close, previous.close),
    return5d: rollingReturnAt(points, index, 5),
    return20d: rollingReturnAt(points, index, 20),
    return60d: rollingReturnAt(points, index, 60),
    drawdown60d: rollingDrawdownAt(points, index, 60),
    sma20,
    sma50,
    sma200,
    volumeRatio,
    regime: marketRegimeAt(points, index),
  };
}

function strategySignal(strategyKey, context) {
  if (strategyKey === "volume_breakout") {
    return (
      Number.isFinite(context.dayChangePct) &&
      Number.isFinite(context.volumeRatio) &&
      Number.isFinite(context.sma20) &&
      context.dayChangePct >= 1.2 &&
      context.volumeRatio >= 1.35 &&
      context.close >= context.sma20
    );
  }
  if (strategyKey === "trend_following") {
    return (
      Number.isFinite(context.sma50) &&
      Number.isFinite(context.sma200) &&
      Number.isFinite(context.return20d) &&
      context.close > context.sma50 &&
      context.sma50 > context.sma200 &&
      context.return20d > 2
    );
  }
  if (strategyKey === "pullback_momentum") {
    return (
      Number.isFinite(context.return60d) &&
      Number.isFinite(context.return5d) &&
      Number.isFinite(context.sma50) &&
      context.return60d > 10 &&
      context.return5d > -6 &&
      context.return5d < 2 &&
      context.close > context.sma50
    );
  }
  if (strategyKey === "reversal_repair") {
    return (
      Number.isFinite(context.drawdown60d) &&
      Number.isFinite(context.return5d) &&
      Number.isFinite(context.volumeRatio) &&
      context.drawdown60d <= -18 &&
      context.return5d >= 2 &&
      context.volumeRatio >= 1.1
    );
  }
  return false;
}

function futureReturn(points, entryIndex, horizon) {
  const entry = points[entryIndex];
  const exit = points[Math.min(points.length - 1, entryIndex + horizon)];
  return entry && exit ? pct(exit.close, entry.open || entry.close) : null;
}

function summarizeTradeSet(trades) {
  const returns = trades.map((trade) => trade.returnPct).filter(Number.isFinite);
  const wins = returns.filter((value) => value > 0);
  const losses = returns.filter((value) => value <= 0);
  return {
    trades: trades.length,
    winRate: returns.length ? round((wins.length / returns.length) * 100, 1) : null,
    avgReturn: round(mean(returns), 2),
    avgWin: round(mean(wins), 2),
    avgLoss: round(mean(losses), 2),
  };
}

function maxDrawdownFromEquity(equityCurve) {
  let peak = -Infinity;
  let worst = 0;
  for (const item of equityCurve) {
    peak = Math.max(peak, item.equity);
    if (peak > 0) worst = Math.min(worst, (item.equity - peak) / peak);
  }
  return worst * 100;
}

function runStrategyBacktest(points, strategyKey) {
  const strategy = strategyTemplates[strategyKey] || strategyTemplates.volume_breakout;
  const trades = [];
  const signals = [];
  const equityCurve = [{ date: points[0]?.date || "", equity: 1 }];
  let equity = 1;
  let index = 220;
  while (index < points.length - strategy.horizon - 1) {
    const context = signalContext(points, index);
    if (!strategySignal(strategyKey, context)) {
      index += 1;
      continue;
    }
    const entryIndex = index + 1;
    const entry = points[entryIndex];
    const entryPrice = entry.open || entry.close;
    const stopPrice = entryPrice * (1 - strategy.stopLossPct / 100);
    const takePrice = entryPrice * (1 + strategy.takeProfitPct / 100);
    let exitIndex = Math.min(points.length - 1, entryIndex + strategy.horizon);
    let exitReason = "到期";
    for (let cursor = entryIndex; cursor <= Math.min(points.length - 1, entryIndex + strategy.horizon); cursor += 1) {
      const point = points[cursor];
      if (Number.isFinite(point.low) && point.low <= stopPrice) {
        exitIndex = cursor;
        exitReason = "止损";
        break;
      }
      if (Number.isFinite(point.high) && point.high >= takePrice) {
        exitIndex = cursor;
        exitReason = "止盈";
        break;
      }
    }
    const exit = points[exitIndex];
    const exitPrice = exitReason === "止损" ? stopPrice : exitReason === "止盈" ? takePrice : exit.close;
    const returnPct = pct(exitPrice, entryPrice);
    const trade = {
      signalDate: points[index].date,
      entryDate: entry.date,
      exitDate: exit.date,
      entryPrice: round(entryPrice, 3),
      exitPrice: round(exitPrice, 3),
      returnPct: round(returnPct, 2),
      exitReason,
      regime: context.regime,
      context: {
        dayChangePct: round(context.dayChangePct, 2),
        return20d: round(context.return20d, 2),
        return60d: round(context.return60d, 2),
        volumeRatio: round(context.volumeRatio, 2),
      },
      forwardReturns: {
        "1d": round(futureReturn(points, entryIndex, 1), 2),
        "5d": round(futureReturn(points, entryIndex, 5), 2),
        "20d": round(futureReturn(points, entryIndex, 20), 2),
      },
    };
    trades.push(trade);
    signals.push(trade);
    equity *= 1 + (returnPct || 0) / 100;
    equityCurve.push({ date: exit.date, equity: round(equity, 4) });
    index = exitIndex + 1;
  }

  const byRegime = {};
  for (const trade of trades) {
    byRegime[trade.regime] ||= [];
    byRegime[trade.regime].push(trade);
  }
  const returns = trades.map((trade) => trade.returnPct).filter(Number.isFinite);
  const avg = mean(returns);
  const sd = standardDeviation(returns);
  return {
    key: strategyKey,
    name: strategy.name,
    description: strategy.description,
    horizon: strategy.horizon,
    stopLossPct: strategy.stopLossPct,
    takeProfitPct: strategy.takeProfitPct,
    summary: {
      ...summarizeTradeSet(trades),
      totalReturn: round((equity - 1) * 100, 2),
      maxDrawdown: round(maxDrawdownFromEquity(equityCurve), 2),
      profitFactor: round(
        Math.abs(
          trades.filter((trade) => trade.returnPct > 0).reduce((sum, trade) => sum + trade.returnPct, 0) /
            (trades.filter((trade) => trade.returnPct < 0).reduce((sum, trade) => sum + trade.returnPct, 0) || -1),
        ),
        2,
      ),
      expectancy: round(avg, 2),
      sharpeLike: Number.isFinite(avg) && Number.isFinite(sd) && sd > 0 ? round(avg / sd, 2) : null,
      avgForward1d: round(mean(trades.map((trade) => trade.forwardReturns["1d"])), 2),
      avgForward5d: round(mean(trades.map((trade) => trade.forwardReturns["5d"])), 2),
      avgForward20d: round(mean(trades.map((trade) => trade.forwardReturns["20d"])), 2),
    },
    byRegime: Object.fromEntries(
      Object.entries(byRegime).map(([regime, regimeTrades]) => [regime, summarizeTradeSet(regimeTrades)]),
    ),
    trades: trades.slice(-18).reverse(),
    equityCurve,
  };
}

function buildSignalStats(backtests) {
  return Object.values(backtests).map((item) => ({
    key: item.key,
    name: item.name,
    trades: item.summary.trades,
    winRate: item.summary.winRate,
    avgReturn: item.summary.avgReturn,
    avgForward1d: item.summary.avgForward1d,
    avgForward5d: item.summary.avgForward5d,
    avgForward20d: item.summary.avgForward20d,
    maxDrawdown: item.summary.maxDrawdown,
  }));
}

async function buildBacktest(inputSymbol, selectedStrategy = "volume_breakout", years = 5) {
  const symbol = normalizeSymbol(inputSymbol);
  const chart = await fetchHistoricalChart(symbol, years);
  const strategies = Object.fromEntries(
    Object.keys(strategyTemplates).map((strategyKey) => [strategyKey, runStrategyBacktest(chart.points, strategyKey)]),
  );
  const selected = strategies[selectedStrategy] || strategies.volume_breakout;
  const coverageYears = chart.points.length >= 2 ? round(chart.points.length / 252, 1) : 0;
  const warnings = [];
  if (coverageYears < Number(years) * 0.75) {
    warnings.push(`当前免费历史样本约 ${coverageYears} 年，不足 ${years} 年；严肃回测需要授权数据源。`);
  }
  if (chart.dataWarning) warnings.push(chart.dataWarning);
  warnings.push("当前回测仅使用价格/成交量信号；历史公告、研报、一致预期和盘中成交需要付费源才能严肃验证。");
  return {
    generatedAt: new Date().toISOString(),
    symbol,
    companyName: chart.name,
    requestedYears: Number(years),
    coverage: {
      points: chart.points.length,
      years: coverageYears,
      firstDate: chart.points[0]?.date || null,
      lastDate: chart.points[chart.points.length - 1]?.date || null,
    },
    selectedStrategy: selected.key,
    selected,
    strategies,
    signalStats: buildSignalStats(strategies),
    warnings,
  };
}

function buildTradePlan(analysis, backtest, capital = 100_000) {
  const selected = backtest?.selected;
  const price = analysis.chart?.lastClose;
  const isAshare = isMainlandASymbol(analysis.symbol);
  const stopLossPct = selected?.stopLossPct || 8;
  const targetPct = Math.max(selected?.takeProfitPct || 14, (selected?.summary?.avgWin || 8) * 1.5);
  const riskBudgetPct =
    (analysis.evidenceReview?.confidence || 0) >= 75 && (selected?.summary?.winRate || 0) >= 50
      ? 1.2
      : 0.6;
  const riskCash = capital * (riskBudgetPct / 100);
  const stopPrice = price * (1 - stopLossPct / 100);
  const targetPrice = price * (1 + targetPct / 100);
  const rawShares = riskCash / Math.max(0.01, price - stopPrice);
  const lotSize = isAshare ? 100 : 1;
  const shares = Math.max(0, Math.floor(rawShares / lotSize) * lotSize);
  const positionValue = shares * price;
  const positionPct = capital ? (positionValue / capital) * 100 : 0;
  let action =
    (selected?.summary?.trades || 0) < 8
      ? "只观察"
      : (selected?.summary?.winRate || 0) >= 52 && (selected?.summary?.avgReturn || 0) > 0
        ? "可小仓位试单"
        : "不建议开新仓";
  const risks = [];
  if (shares === 0) {
    action = "只观察";
    risks.push("当前风险预算不足以买入一手/一股，需降低价格标的、提高本金或放宽单笔风险。");
  }
  if ((selected?.summary?.trades || 0) < 8) risks.push("回测交易次数不足，不能证明信号稳定。");
  if ((selected?.summary?.maxDrawdown || 0) < -20) risks.push(`策略历史最大回撤约 ${selected.summary.maxDrawdown}%。`);
  if ((analysis.evidenceReview?.hardEvidenceCount || 0) === 0) risks.push("当前缺少硬事实证据，避免重仓。");
  if (positionPct > 20) risks.push("仓位超过 20%，需要组合层面限制。");
  return {
    generatedAt: new Date().toISOString(),
    symbol: analysis.symbol,
    companyName: analysis.companyName,
    strategy: selected?.name || "",
    action,
    capital,
    entryPrice: round(price, 3),
    buyZone: [round(price * 0.985, 3), round(price * 1.015, 3)],
    stopPrice: round(stopPrice, 3),
    targetPrice: round(targetPrice, 3),
    stopLossPct,
    targetPct: round(targetPct, 1),
    riskBudgetPct,
    shares,
    positionValue: round(positionValue, 2),
    positionPct: round(positionPct, 2),
    maxSingleNamePct: 20,
    maxIndustryPct: 35,
    evidenceVerdict: analysis.evidenceReview?.verdict || "",
    backtestWinRate: selected?.summary?.winRate ?? null,
    expectedReturn: selected?.summary?.avgReturn ?? null,
    risks,
  };
}

async function getPaperPortfolio(markToMarket = true) {
  const portfolio = await readJsonFile(PAPER_FILE, null);
  const base =
    portfolio || {
      cash: 100_000,
      initialCapital: 100_000,
      positions: [],
      trades: [],
      recommendations: [],
      watchOrders: [],
      updatedAt: null,
    };
  if (!markToMarket) return base;
  const positions = await mapWithConcurrency(base.positions || [], 4, async (position) => {
    const chart = await fetchChart(position.symbol);
    const marketValue = chart.lastClose * position.shares;
    return {
      ...position,
      lastPrice: chart.lastClose,
      marketValue: round(marketValue, 2),
      unrealizedPnl: round(marketValue - position.avgCost * position.shares, 2),
      unrealizedPnlPct: round(pct(chart.lastClose, position.avgCost), 2),
    };
  });
  const watchOrders = await mapWithConcurrency(base.watchOrders || [], 4, async (order) => {
    try {
      const chart = await fetchChart(order.symbol);
      const returnPct = pct(chart.lastClose, Number(order.referencePrice));
      return {
        ...order,
        lastPrice: chart.lastClose,
        returnPct: round(returnPct, 2),
        triggerState: buildWatchOrderState(order, chart.lastClose, returnPct),
      };
    } catch (error) {
      return { ...order, triggerState: "行情暂未更新" };
    }
  });
  const equity = base.cash + positions.reduce((sum, position) => sum + (position.marketValue || 0), 0);
  const marked = {
    ...base,
    positions,
    watchOrders,
    equity: round(equity, 2),
    totalReturnPct: round(pct(equity, base.initialCapital), 2),
  };
  return {
    ...marked,
    risk: buildPaperRiskSnapshot(marked),
  };
}

async function savePaperPortfolio(portfolio) {
  const payload = { ...portfolio, updatedAt: new Date().toISOString() };
  await writeJsonFile(PAPER_FILE, payload);
  return payload;
}

function normalizePaperPortfolio(portfolio) {
  const initialCapital = finiteNumber(portfolio?.initialCapital, 100_000);
  return {
    cash: finiteNumber(portfolio?.cash, 100_000),
    initialCapital,
    equityHighWatermark: finiteNumber(portfolio?.equityHighWatermark, initialCapital),
    positions: Array.isArray(portfolio?.positions) ? portfolio.positions : [],
    trades: Array.isArray(portfolio?.trades) ? portfolio.trades : [],
    recommendations: Array.isArray(portfolio?.recommendations) ? portfolio.recommendations : [],
    watchOrders: Array.isArray(portfolio?.watchOrders) ? portfolio.watchOrders : [],
    cycles: Array.isArray(portfolio?.cycles) ? portfolio.cycles : [],
    updatedAt: portfolio?.updatedAt || null,
  };
}

function consecutiveLosses(trades = []) {
  let count = 0;
  for (const trade of trades) {
    if (trade.side !== "sell") continue;
    if ((trade.realizedPnl || 0) < 0) count += 1;
    else break;
  }
  return count;
}

function buildPaperRiskSnapshot(portfolio, policy = paperRiskPolicy) {
  const equity = Number(portfolio.equity) || Number(portfolio.initialCapital) || 0;
  const highWatermark = Math.max(Number(portfolio.equityHighWatermark) || 0, Number(portfolio.initialCapital) || 0, equity);
  const cashPct = equity ? (Number(portfolio.cash || 0) / equity) * 100 : 0;
  const drawdownPct = highWatermark ? pct(equity, highWatermark) : 0;
  const lossStreak = consecutiveLosses(portfolio.trades || []);
  const positions = portfolio.positions || [];
  const themeExposure = {};
  for (const position of positions) {
    const theme = position.theme || "未分类";
    themeExposure[theme] = (themeExposure[theme] || 0) + (Number(position.marketValue) || 0);
  }
  const exposurePct = Object.fromEntries(
    Object.entries(themeExposure).map(([theme, value]) => [theme, round(equity ? (value / equity) * 100 : 0, 2)]),
  );
  const violations = [];
  if (drawdownPct <= -policy.maxPortfolioDrawdownPct) violations.push(`组合回撤 ${round(drawdownPct, 2)}%，暂停新开仓。`);
  if (lossStreak >= policy.maxConsecutiveLosses) violations.push(`连续亏损 ${lossStreak} 笔，暂停新开仓。`);
  if (positions.length >= policy.maxOpenPositions) violations.push(`持仓数 ${positions.length} 已达到上限。`);
  if (cashPct < policy.minCashPct) violations.push(`现金占比 ${round(cashPct, 2)}%，低于 ${policy.minCashPct}%。`);
  return {
    policy,
    equity: round(equity, 2),
    highWatermark: round(highWatermark, 2),
    cashPct: round(cashPct, 2),
    drawdownPct: round(drawdownPct, 2),
    lossStreak,
    openPositions: positions.length,
    themeExposurePct: exposurePct,
    canOpenNewPositions: violations.length === 0,
    violations,
  };
}

function buildWatchOrderState(order, lastPrice, returnPctValue) {
  if (order.status === "done") return "已处理";
  if (!Number.isFinite(Number(lastPrice)) || !Number.isFinite(Number(order.referencePrice))) return "等待行情";
  const move = Number.isFinite(returnPctValue) ? returnPctValue : pct(lastPrice, Number(order.referencePrice));
  const trigger = order.structuredTrigger || {};
  const minReturn = Number.isFinite(Number(trigger.minReturnPct)) ? Number(trigger.minReturnPct) : 3;
  const stopReturn = Number.isFinite(Number(trigger.stopReturnPct)) ? Number(trigger.stopReturnPct) : -3;
  const minHardEvidence = Number.isFinite(Number(trigger.minHardEvidenceCount)) ? Number(trigger.minHardEvidenceCount) : 1;
  if (order.action === "买入" && move >= minReturn && Number(order.hardEvidenceCount || 0) >= minHardEvidence) {
    return "待人工确认：价格走强且有硬证据";
  }
  if (order.action === "买入" && move >= minReturn) {
    return "价格走强，但仍缺硬证据";
  }
  if (order.action === "卖出" && move <= stopReturn) {
    return "风险触发：继续下跌";
  }
  if (order.action === "观望" && Math.abs(move || 0) >= 5) {
    return move > 0 ? "观望后大涨：复查是否错过" : "观望后大跌：过滤有效";
  }
  return "观察中";
}

function localPaperSnapshot(portfolio) {
  const base = normalizePaperPortfolio(portfolio);
  const positions = (base.positions || []).map((position) => {
    const lastPrice = Number.isFinite(Number(position.lastPrice)) ? Number(position.lastPrice) : Number(position.avgCost);
    const marketValue = lastPrice * Number(position.shares || 0);
    return {
      ...position,
      lastPrice: round(lastPrice, 3),
      marketValue: round(marketValue, 2),
      unrealizedPnl: round(marketValue - Number(position.avgCost || 0) * Number(position.shares || 0), 2),
      unrealizedPnlPct: round(pct(lastPrice, Number(position.avgCost)), 2),
    };
  });
  const equity = Number(base.cash || 0) + positions.reduce((sum, position) => sum + Number(position.marketValue || 0), 0);
  const snapshot = {
    ...base,
    positions,
    equity: round(equity, 2),
    totalReturnPct: round(pct(equity, base.initialCapital), 2),
  };
  return {
    ...snapshot,
    risk: buildPaperRiskSnapshot(snapshot),
  };
}

async function buildWatchOrderSnapshot(order) {
  const referencePrice = Number(order.referencePrice);
  const cachedLastPrice = Number(order.lastPrice);
  if (Number.isFinite(cachedLastPrice) && cachedLastPrice > 0 && Number.isFinite(referencePrice) && referencePrice > 0) {
    const returnPct = Number.isFinite(Number(order.returnPct)) ? Number(order.returnPct) : pct(cachedLastPrice, referencePrice);
    return {
      lastPrice: cachedLastPrice,
      returnPct: round(returnPct, 2),
      triggerState: buildWatchOrderState(order, cachedLastPrice, returnPct),
      marketSource: "cached-watch-order",
    };
  }
  try {
    const chart = await fetchChart(order.symbol);
    const returnPct = pct(chart.lastClose, referencePrice);
    return {
      lastPrice: chart.lastClose,
      returnPct: round(returnPct, 2),
      triggerState: buildWatchOrderState(order, chart.lastClose, returnPct),
      marketSource: chart.source || "market",
    };
  } catch (error) {
    return {
      lastPrice: Number.isFinite(cachedLastPrice) ? cachedLastPrice : null,
      returnPct: Number.isFinite(Number(order.returnPct)) ? Number(order.returnPct) : null,
      triggerState: "行情暂未更新",
      marketError: error.message,
    };
  }
}

function buildWatchOrderTradeProposal(portfolio, order, snapshot, capital) {
  const price = Number(snapshot.lastPrice);
  if (!Number.isFinite(price) || price <= 0) return null;
  const marked = localPaperSnapshot(portfolio);
  const equity = Number(marked.equity) || Number(capital) || Number(marked.initialCapital) || 100_000;
  const availableCash = Math.max(0, Number(marked.cash || 0) - equity * (paperRiskPolicy.minCashPct / 100));
  const maxValue = Math.min(equity * 0.06, equity * (paperRiskPolicy.maxSinglePositionPct / 100), availableCash);
  const lotSize = lotSizeForSymbol(order.symbol);
  const shares = Math.floor(maxValue / price / lotSize) * lotSize;
  if (!shares) return null;
  const stopReturnPct = Number(order.structuredTrigger?.stopReturnPct);
  const stopPrice = Number.isFinite(stopReturnPct) ? price * (1 + stopReturnPct / 100) : price * 0.92;
  return {
    symbol: order.symbol,
    side: "buy",
    shares,
    price,
    name: order.companyName || order.symbol,
    stopPrice: round(stopPrice, 3),
    targetPrice: round(price * 1.16, 3),
    strategy: "briefing-watch-trigger",
    theme: order.theme || order.evidenceMix || "简报观察单",
    signalGrade: "观察单触发",
    reason: `简报观察单触发：${order.decisionWhy || order.triggerText || "价格和证据条件满足"}`,
  };
}

async function processTriggeredWatchOrders(options = {}) {
  const execute = options.execute !== false;
  const capital = Math.max(10_000, Number(options.capital) || 100_000);
  const evaluatedAt = new Date().toISOString();
  const portfolio = normalizePaperPortfolio(await getPaperPortfolio(false));
  portfolio.watchOrders ||= [];
  portfolio.trades ||= [];
  portfolio.positions ||= [];
  const executions = [];
  const reviewItems = [];
  const skipped = [];
  let processed = 0;

  for (let index = 0; index < portfolio.watchOrders.length; index += 1) {
    const order = portfolio.watchOrders[index];
    if (!order || order.status === "done") continue;
    const snapshot = await buildWatchOrderSnapshot(order);
    const nextOrder = {
      ...order,
      lastPrice: snapshot.lastPrice,
      returnPct: snapshot.returnPct,
      triggerState: snapshot.triggerState,
      lastEvaluatedAt: evaluatedAt,
    };
    const triggerState = snapshot.triggerState || "";
    const existingPosition = portfolio.positions.find((position) => position.symbol === normalizeSymbol(order.symbol));

    if (order.action === "买入" && triggerState.includes("待人工确认")) {
      const risk = localPaperSnapshot(portfolio).risk;
      if (existingPosition) {
        skipped.push(`${order.companyName || order.symbol} 已持仓，观察单不重复买入。`);
        nextOrder.status = "review";
        nextOrder.reviewNote = "已持仓，改为复查是否加仓或移动止盈。";
      } else if (!risk.canOpenNewPositions) {
        skipped.push(`${order.companyName || order.symbol} 触发买入，但组合风控禁止新开仓。`);
        nextOrder.status = "review";
        nextOrder.reviewNote = `触发但未成交：${risk.violations.join("；")}`;
      } else {
        const proposal = buildWatchOrderTradeProposal(portfolio, order, snapshot, capital);
        if (!proposal) {
          skipped.push(`${order.companyName || order.symbol} 触发买入，但现金/最小交易单位不足。`);
          nextOrder.status = "review";
          nextOrder.reviewNote = "触发但未成交：现金或最小交易单位不足。";
        } else {
          processed += 1;
          const dryTrade = {
            id: `dry-${evaluatedAt}-${proposal.symbol}-${proposal.side}`,
            ...proposal,
            value: round(proposal.shares * proposal.price, 2),
            tradedAt: evaluatedAt,
          };
          const trade = execute ? applyPaperTrade(portfolio, proposal) : dryTrade;
          executions.push(trade);
          nextOrder.status = execute ? "done" : "waiting";
          nextOrder.processedAt = execute ? evaluatedAt : null;
          nextOrder.executionTradeId = execute ? trade.id : null;
          nextOrder.reviewNote = execute
            ? `已自动模拟买入 ${trade.shares} 股，后续跟踪 1/5/20 日收益。`
            : `满足条件，可自动模拟买入 ${dryTrade.shares} 股；本次为 dry-run 未改仓。`;
          reviewItems.push({
            symbol: order.symbol,
            companyName: order.companyName,
            action: "自动模拟买入",
            triggerState,
            returnPct: snapshot.returnPct,
            note: nextOrder.reviewNote,
          });
        }
      }
    } else if (order.action === "卖出" && triggerState.includes("风险触发")) {
      if (!existingPosition) {
        skipped.push(`${order.companyName || order.symbol} 触发卖出，但模拟盘无持仓。`);
        nextOrder.status = "done";
        nextOrder.reviewNote = "无持仓，风险观察单关闭。";
      } else {
        processed += 1;
        const proposal = {
          symbol: order.symbol,
          side: "sell",
          shares: existingPosition.shares,
          price: snapshot.lastPrice,
          reason: `简报观察单风险触发：${order.decisionWhy || order.riskText || "继续下跌"}`,
        };
        const dryTrade = {
          id: `dry-${evaluatedAt}-${proposal.symbol}-${proposal.side}`,
          ...proposal,
          value: round(proposal.shares * proposal.price, 2),
          tradedAt: evaluatedAt,
        };
        const trade = execute ? applyPaperTrade(portfolio, proposal) : dryTrade;
        executions.push(trade);
        nextOrder.status = execute ? "done" : "waiting";
        nextOrder.processedAt = execute ? evaluatedAt : null;
        nextOrder.executionTradeId = execute ? trade.id : null;
        nextOrder.reviewNote = execute ? "已自动模拟卖出，防止亏损扩大。" : "满足风险卖出条件；本次为 dry-run 未改仓。";
        reviewItems.push({
          symbol: order.symbol,
          companyName: order.companyName,
          action: "自动模拟卖出",
          triggerState,
          returnPct: snapshot.returnPct,
          note: nextOrder.reviewNote,
        });
      }
    } else if (/观望后大涨|观望后大跌/.test(triggerState)) {
      nextOrder.status = "review";
      nextOrder.reviewNote = triggerState.includes("大涨")
        ? "观望后明显上涨，进入错过机会归因池。"
        : "观望后明显下跌，记录为过滤有效样本。";
      reviewItems.push({
        symbol: order.symbol,
        companyName: order.companyName,
        action: "复盘",
        triggerState,
        returnPct: snapshot.returnPct,
        note: nextOrder.reviewNote,
      });
    }

    portfolio.watchOrders[index] = nextOrder;
  }

  await savePaperPortfolio(portfolio);
  return {
    generatedAt: evaluatedAt,
    execute,
    processed,
    executions,
    reviewItems,
    skipped: skipped.slice(0, 12),
    portfolio: localPaperSnapshot(portfolio),
  };
}

function buildStructuredTriggerFromBriefing(item) {
  const action = item.briefAction || "观望";
  if (action === "卖出") {
    return {
      priceRule: "较参考价下跌3%继续复查/减仓",
      stopReturnPct: -3,
      volumeRule: "放量下跌优先级更高",
      evidenceRule: "若出现业绩下修/监管/订单取消等负面硬证据，直接风险处理",
      minHardEvidenceCount: 0,
      riskRule: "无仓不抄底，有仓先控制回撤",
    };
  }
  return {
    priceRule: "较参考价上涨3%且不追高",
    minReturnPct: 3,
    volumeRule: "量比持续大于1.5x",
    evidenceRule: "至少1条订单/业绩/政策/公告硬证据",
    minHardEvidenceCount: 1,
    riskRule: "若只有行业热度或二级市场解读，继续观望",
  };
}

function briefingWatchOrderFromItem(item) {
  const action = item.briefAction || "观望";
  return {
    id: `briefing-watch-${item.id || `${item.symbol}-${item.generatedAt}`}`,
    source: "briefing",
    sourceReportId: item.id || null,
    status: "waiting",
    symbol: item.symbol,
    companyName: item.companyName,
    action,
    referencePrice: Number(item.lastPrice) || null,
    currency: item.currency || "",
    createdAt: new Date().toISOString(),
    sourceGeneratedAt: item.generatedAt,
    dayChangePct: item.dayChangePct ?? null,
    evidenceConfidence: item.evidenceConfidence ?? null,
    hardEvidenceCount: item.hardEvidenceCount ?? 0,
    evidenceMix: item.evidenceMix || "",
    structuredTrigger: buildStructuredTriggerFromBriefing(item),
    decisionWhy: item.decisionWhy || item.topDriver || "",
    triggerText: item.nextAction || "等待下一次简报确认触发条件",
    riskText: (item.riskBullets || []).slice(0, 2).join("；"),
  };
}

async function syncBriefingWatchOrders() {
  const latest = await readLatestResult(BRIEFING_CACHE_FILE);
  const portfolio = normalizePaperPortfolio(await getPaperPortfolio(false));
  portfolio.watchOrders ||= [];
  if (!latest?.items?.length) {
    await savePaperPortfolio(portfolio);
    return { added: 0, portfolio: await getPaperPortfolio(true) };
  }
  const existingIds = new Set((portfolio.watchOrders || []).map((item) => item.id));
  const latestOrders = (latest.items || [])
    .filter((item) => item?.symbol && !item.error && Number.isFinite(Number(item.lastPrice)))
    .map(briefingWatchOrderFromItem);
  const latestById = new Map(latestOrders.map((item) => [item.id, item]));
  portfolio.watchOrders = (portfolio.watchOrders || []).map((order) => {
    const latestOrder = latestById.get(order.id);
    if (!latestOrder) return order;
    return {
      ...order,
      structuredTrigger: order.structuredTrigger || latestOrder.structuredTrigger,
      triggerText: order.triggerText || latestOrder.triggerText,
      riskText: order.riskText || latestOrder.riskText,
    };
  });
  const newOrders = latestOrders.filter((item) => !existingIds.has(item.id));
  portfolio.watchOrders = [...newOrders, ...(portfolio.watchOrders || [])].slice(0, 120);
  await savePaperPortfolio(portfolio);
  return { added: newOrders.length, portfolio: await getPaperPortfolio(true) };
}

function lotSizeForSymbol(symbol) {
  return isMainlandASymbol(symbol) ? 100 : 1;
}

function applyPaperTrade(portfolio, order) {
  const side = order.side === "sell" ? "sell" : "buy";
  const symbol = normalizeSymbol(order.symbol);
  const shares = Math.max(0, Math.floor(Number(order.shares) || 0));
  const price = Number(order.price);
  if (!symbol || !shares || !Number.isFinite(price) || price <= 0) throw new Error("模拟订单缺少有效 symbol、shares 或 price");
  portfolio.positions ||= [];
  portfolio.trades ||= [];
  portfolio.cash = Number(portfolio.cash) || 0;
  let realizedPnl = null;
  let realizedPnlPct = null;
  if (side === "buy") {
    const cost = shares * price;
    if (cost > portfolio.cash + 0.0001) throw new Error("Paper cash 不足");
    const existing = portfolio.positions.find((position) => position.symbol === symbol);
    if (existing) {
      const newShares = existing.shares + shares;
      existing.avgCost = (existing.avgCost * existing.shares + cost) / newShares;
      existing.shares = newShares;
      existing.stopPrice = Number(order.stopPrice) || existing.stopPrice || null;
      existing.targetPrice = Number(order.targetPrice) || existing.targetPrice || null;
      existing.theme = order.theme || existing.theme || "未分类";
      existing.strategy = order.strategy || existing.strategy || "";
      existing.updatedAt = new Date().toISOString();
    } else {
      portfolio.positions.push({
        symbol,
        name: order.name || symbol,
        shares,
        avgCost: price,
        stopPrice: Number(order.stopPrice) || null,
        targetPrice: Number(order.targetPrice) || null,
        theme: order.theme || "未分类",
        strategy: order.strategy || "",
        signalGrade: order.signalGrade || "",
        openedReason: order.reason || "",
        openedAt: new Date().toISOString(),
      });
    }
    portfolio.cash -= cost;
  } else {
    const existing = portfolio.positions.find((position) => position.symbol === symbol);
    if (!existing || existing.shares < shares) throw new Error("Paper position 不足");
    realizedPnl = (price - existing.avgCost) * shares;
    realizedPnlPct = pct(price, existing.avgCost);
    existing.shares -= shares;
    portfolio.cash += shares * price;
    if (existing.shares === 0) portfolio.positions = portfolio.positions.filter((position) => position !== existing);
  }
  const value = shares * price;
  const trade = {
    id: `${Date.now()}-${symbol}-${side}`,
    symbol,
    side,
    reason: order.reason || "手动模拟",
    shares,
    price: round(price, 3),
    value: round(value, 2),
    realizedPnl: Number.isFinite(realizedPnl) ? round(realizedPnl, 2) : null,
    realizedPnlPct: Number.isFinite(realizedPnlPct) ? round(realizedPnlPct, 2) : null,
    tradedAt: new Date().toISOString(),
  };
  portfolio.trades.unshift(trade);
  portfolio.cash = round(portfolio.cash, 2);
  return trade;
}

async function recommendPaperTrade(inputSymbol, strategy = "volume_breakout", capital = 100_000, options = {}) {
  const analysis = await analyzeSymbol(inputSymbol, { fetchEvidenceSourceText: false });
  const backtest = await buildBacktest(analysis.symbol, strategy, 5);
  const plan = buildTradePlan(analysis, backtest, capital);
  const score = scoreDailyPick({ analysis, backtest, plan });
  const filter = buildSignalFilter({ analysis, backtest, plan, score });
  const recommendation = {
    ...plan,
    action: filter.grade,
    signalGrade: filter.grade,
    score: score.score,
    filterPassed: filter.passed,
    filterChecks: filter.checks,
    filterReasons: filter.filterReasons,
    riskFlags: filter.riskFlags,
  };
  const portfolio = normalizePaperPortfolio(await getPaperPortfolio(false));
  portfolio.recommendations = [recommendation, ...(portfolio.recommendations || [])].slice(0, 60);
  const executions = [];
  if (options.execute && filter.passed) {
    const marked = await getPaperPortfolio(true);
    const risk = buildPaperRiskSnapshot(marked);
    const existing = marked.positions?.find((position) => position.symbol === analysis.symbol);
    if (!existing && risk.canOpenNewPositions) {
      const equity = risk.equity || capital;
      const maxValue = Math.min(
        plan.positionValue || 0,
        equity * (paperRiskPolicy.maxSinglePositionPct / 100),
        Math.max(0, (marked.cash || 0) - equity * (paperRiskPolicy.minCashPct / 100)),
      );
      const shares = Math.floor(maxValue / analysis.chart.lastClose / lotSizeForSymbol(analysis.symbol)) * lotSizeForSymbol(analysis.symbol);
      if (shares > 0) {
        executions.push(
          applyPaperTrade(portfolio, {
            symbol: analysis.symbol,
            side: "buy",
            shares,
            price: analysis.chart.lastClose,
            name: analysis.companyName,
            stopPrice: plan.stopPrice,
            targetPrice: plan.targetPrice,
            strategy: plan.strategy,
            signalGrade: filter.grade,
            reason: "当前股票强买信号自动模拟买入",
          }),
        );
      }
    }
  }
  await savePaperPortfolio(portfolio);
  return { plan: recommendation, backtest: backtest.selected, executions, portfolio: await getPaperPortfolio(true) };
}

async function executePaperOrder(body) {
  const symbol = normalizeSymbol(body.symbol);
  const side = body.side === "sell" ? "sell" : "buy";
  const shares = Math.max(0, Math.floor(Number(body.shares) || 0));
  if (!symbol || !shares) throw new Error("请输入有效的 symbol 和 shares");
  const chart = await fetchChart(symbol);
  const price = chart.lastClose;
  const portfolio = normalizePaperPortfolio(await getPaperPortfolio(false));
  applyPaperTrade(portfolio, {
    symbol,
    side,
    shares,
    price,
    name: chart.name,
    stopPrice: body.stopPrice,
    targetPrice: body.targetPrice,
    strategy: body.strategy,
    theme: body.theme,
    reason: body.reason || "手动模拟",
  });
  await savePaperPortfolio(portfolio);
  return getPaperPortfolio();
}

async function buildAutoReview(inputSymbol) {
  const symbol = normalizeSymbol(inputSymbol);
  const history = await getReportHistory(symbol);
  const chart = await fetchChart(symbol);
  const current = chart.lastClose;
  const reviews = history.reports.slice(0, 12).map((report) => {
    const returnSince = Number.isFinite(report.lastPrice) ? pct(current, report.lastPrice) : null;
    const days = daysSince(report.generatedAt);
    let verdict = "继续观察";
    if (Number.isFinite(returnSince) && returnSince >= 8) verdict = "假设阶段性兑现";
    if (Number.isFinite(returnSince) && returnSince <= -6) verdict = "假设可能失效";
    return {
      generatedAt: report.generatedAt,
      daysSince: days,
      reportPrice: report.lastPrice,
      currentPrice: current,
      returnSince: round(returnSince, 2),
      originalDriver: report.topDriver,
      evidenceVerdict: report.evidenceVerdict,
      verdict,
      lesson:
        verdict === "假设可能失效"
          ? "需要检查是否证据误判、买点过追、行业/大盘反向或财报预期落空。"
          : verdict === "假设阶段性兑现"
            ? "需要复核上涨是否由原始催化驱动，并考虑移动止盈。"
            : "样本时间或价格变化不足，继续跟踪公告、成交量和产业链扩散。",
    };
  });
  return {
    symbol,
    companyName: chart.name,
    currentPrice: current,
    generatedAt: new Date().toISOString(),
    reviews,
  };
}

function paperRecommendationFromPick(item) {
  return {
    generatedAt: item.generatedAt || new Date().toISOString(),
    symbol: item.symbol,
    companyName: item.companyName,
    action: item.action,
    signalGrade: item.signalGrade,
    score: item.score,
    lastPrice: item.price,
    topDriver: item.topDriver,
    evidenceVerdict: item.evidenceVerdict,
    evidenceConfidence: item.evidenceConfidence,
    theme: item.theme,
    universeSource: item.universeSource,
    stopPrice: item.plan?.stopPrice ?? null,
    targetPrice: item.plan?.targetPrice ?? null,
    positionPct: item.plan?.positionPct ?? null,
    shares: item.plan?.shares ?? 0,
    filterPassed: item.filterPassed,
    filterReasons: item.filterReasons || [],
  };
}

async function applyPaperExitRules(rawPortfolio) {
  const marked = await getPaperPortfolio(true);
  const executions = [];
  for (const position of marked.positions || []) {
    let reason = "";
    if (Number(position.stopPrice) > 0 && Number(position.lastPrice) <= Number(position.stopPrice)) {
      reason = "触发止损";
    } else if (Number(position.targetPrice) > 0 && Number(position.lastPrice) >= Number(position.targetPrice)) {
      reason = "触发止盈";
    } else if (Number(position.unrealizedPnlPct) <= -12) {
      reason = "单票亏损超过12%，风控平仓";
    }
    if (!reason) continue;
    executions.push(
      applyPaperTrade(rawPortfolio, {
        symbol: position.symbol,
        side: "sell",
        shares: position.shares,
        price: position.lastPrice,
        reason,
      }),
    );
  }
  return executions;
}

function isBlacklistedTheme(item) {
  const text = `${item.theme || ""} ${item.companyName || ""} ${item.topDriver || ""}`;
  return /退市|ST|地产高杠杆|博彩|高息债|壳资源|纯概念炒作/i.test(text);
}

function buildRecommendationReviewFromPortfolio(portfolio) {
  const recommendations = (portfolio.recommendations || []).slice(0, 80);
  return mapWithConcurrency(recommendations, 4, async (item) => {
    try {
      const symbol = normalizeSymbol(item.symbol);
      const chart = await fetchHistoricalChart(symbol, 1);
      const startDate = String(item.generatedAt || "").slice(0, 10);
      const startIndex = chart.points.findIndex((point) => point.date >= startDate);
      const entry = Number(item.lastPrice) || chart.points[startIndex]?.close;
      const current = chart.points.at(-1)?.close;
      const horizonReturn = (days) => {
        if (startIndex < 0 || !Number.isFinite(entry)) return null;
        const target = chart.points[startIndex + days];
        return target ? round(pct(target.close, entry), 2) : null;
      };
      const currentReturn = Number.isFinite(entry) && Number.isFinite(current) ? round(pct(current, entry), 2) : null;
      const directionOk = item.signalGrade === "强买" ? (currentReturn || 0) > 0 : item.signalGrade === "不碰" ? (currentReturn || 0) <= 0 : null;
      return {
        symbol,
        companyName: item.companyName || chart.name,
        generatedAt: item.generatedAt,
        action: item.signalGrade || item.action,
        entryPrice: round(entry, 3),
        currentPrice: round(current, 3),
        returnNow: currentReturn,
        returns: {
          "1d": horizonReturn(1),
          "5d": horizonReturn(5),
          "20d": horizonReturn(20),
        },
        verdict:
          directionOk === true
            ? "方向暂时正确"
            : directionOk === false
              ? "方向暂时错误"
              : "继续观察",
      };
    } catch (error) {
      return { symbol: item.symbol, error: error.message };
    }
  });
}

function summarizeRecommendationReview(reviews) {
  const summary = {};
  for (const horizon of ["1d", "5d", "20d"]) {
    const values = reviews
      .filter((item) => item.action === "强买" && Number.isFinite(item.returns?.[horizon]))
      .map((item) => item.returns[horizon]);
    summary[horizon] = {
      samples: values.length,
      hitRate: values.length ? round((values.filter((value) => value > 0).length / values.length) * 100, 1) : null,
      avgReturn: round(mean(values), 2),
    };
  }
  return summary;
}

async function measureStep(label, fn) {
  const startedAt = Date.now();
  try {
    const data = await fn();
    return { label, ok: true, ms: Date.now() - startedAt, data };
  } catch (error) {
    return { label, ok: false, ms: Date.now() - startedAt, error: error.message };
  }
}

function diagnosticCheck(checks, level, title, detail, action = "") {
  checks.push({ level, title, detail, action });
}

async function countReportFiles() {
  try {
    const files = await fs.readdir(REPORTS_DIR);
    return files.filter((file) => file.endsWith(".json")).length;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}

async function countReportEntries(reason = "") {
  try {
    const files = (await fs.readdir(REPORTS_DIR)).filter((file) => file.endsWith(".json"));
    const groups = await Promise.all(
      files.map((file) => readJsonFile(path.join(REPORTS_DIR, file), []).catch(() => [])),
    );
    return groups.flat().filter((item) => !reason || item.reason === reason).length;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}

async function readReportEntries(reason = "") {
  try {
    const files = (await fs.readdir(REPORTS_DIR)).filter((file) => file.endsWith(".json"));
    const groups = await Promise.all(
      files.map((file) => readJsonFile(path.join(REPORTS_DIR, file), []).catch(() => [])),
    );
    return groups.flat().filter((item) => !reason || item.reason === reason);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function summarizeReportMaturity(reason = "briefing") {
  try {
    const entries = await readReportEntries(reason);
    const mature = { "1d": 0, "5d": 0, "20d": 0 };
    for (const item of entries) {
      const days = completedDaysSince(item.generatedAt);
      if (!Number.isFinite(days)) continue;
      if (days >= 1) mature["1d"] += 1;
      if (days >= 5) mature["5d"] += 1;
      if (days >= 20) mature["20d"] += 1;
    }
    return { total: entries.length, mature };
  } catch (error) {
    if (error.code === "ENOENT") return { total: 0, mature: { "1d": 0, "5d": 0, "20d": 0 } };
    throw error;
  }
}

function classifyWatchReviewCause(item, kind) {
  const text = `${item.decisionWhy || ""} ${item.note || ""}`;
  if (/价格异动|成交量|放量|量价/.test(text)) {
    return kind === "missed"
      ? {
          key: "price-rule-too-tight",
          title: "量价有效但规则太保守",
          detail: "当时已有量价转强，系统没有升级为买入；复查回撤、趋势和硬证据门槛是否过紧。",
          rule: "同类样本若放量延续且没有反向风险，先进入小仓模拟，不直接忽略。",
        }
      : {
          key: "price-only-filter-worked",
          title: "只靠量价追高会受伤",
          detail: "当时量价强但后续下跌，说明上涨本身不是买入理由。",
          rule: "保留“价格强势必须叠加公司级硬证据”的过滤。",
        };
  }
  if (/新闻密度|主题|AI|算力|新能源|电池|机器人|半导体|国产|光模块/.test(text)) {
    return kind === "missed"
      ? {
          key: "theme-not-mapped-to-company",
          title: "主题热度没有映射到公司",
          detail: "当时只识别到板块/主题，没有确认订单、业绩、客户或公告是否直接指向公司。",
          rule: "主题上涨时优先补公司公告、互动易、调研纪要和客户/供应商证据。",
        }
      : {
          key: "theme-hype-filter-worked",
          title: "主题热度过滤有效",
          detail: "主题有热度但后续下跌，说明没有公司级兑现时不追是有效的。",
          rule: "继续把纯主题热度降级为观察，等待公司级硬事实。",
        };
  }
  return kind === "missed"
    ? {
        key: "unclear-watch-reason",
        title: "观望理由不可证伪",
        detail: "当时理由不够具体，导致复盘时不知道该改哪条规则。",
        rule: "每条观望必须写清楚缺少哪类证据，以及升级为买入的触发条件。",
      }
    : {
        key: "risk-filter-worked",
        title: "风险过滤有效",
        detail: "观望后下跌，说明当时不交易避免了回撤。",
        rule: "保留该类过滤，并把避险样本纳入胜率统计。",
      };
}

function summarizeWatchReviewAttribution(missedUpside = [], avoidedDownside = []) {
  const grouped = new Map();
  for (const [kind, items] of [
    ["missed", missedUpside],
    ["avoided", avoidedDownside],
  ]) {
    for (const item of items || []) {
      const cause = classifyWatchReviewCause(item, kind);
      const key = `${kind}:${cause.key}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          kind,
          key: cause.key,
          title: cause.title,
          detail: cause.detail,
          rule: cause.rule,
          count: 0,
          examples: [],
        });
      }
      const bucket = grouped.get(key);
      bucket.count += 1;
      bucket.examples.push({
        symbol: item.symbol,
        companyName: item.companyName,
        horizon: item.horizon,
        returnPct: item.returnPct,
      });
    }
  }
  const rootCauses = [...grouped.values()]
    .map((item) => ({ ...item, examples: item.examples.slice(0, 3) }))
    .sort((a, b) => b.count - a.count);
  const lessons = rootCauses.slice(0, 4).map((item) => ({
    title: item.title,
    rule: item.rule,
    evidence: `${item.count} 个样本；代表：${item.examples
      .map((example) => `${example.companyName || example.symbol} ${example.horizon} ${round(example.returnPct, 2)}%`)
      .join("，") || "暂无"}`,
  }));
  return { rootCauses, lessons };
}

async function buildBriefingOutcomeStats(options = {}) {
  const limit = Math.max(10, Math.min(160, Number(options.limit) || 80));
  const entries = (await readReportEntries("briefing"))
    .filter((item) => item.symbol && Number.isFinite(Number(item.lastPrice)) && completedDaysSince(item.generatedAt) >= 1)
    .sort((a, b) => new Date(b.generatedAt || 0) - new Date(a.generatedAt || 0))
    .slice(0, limit);
  const chartCache = new Map();
  const getChart = async (symbol) => {
    const normalized = normalizeSymbol(symbol);
    if (!chartCache.has(normalized)) chartCache.set(normalized, fetchHistoricalChart(normalized, 1).catch((error) => ({ error })));
    return chartCache.get(normalized);
  };
  const rows = await mapWithConcurrency(entries, 4, async (report) => {
    try {
      const chart = await getChart(report.symbol);
      if (chart.error) throw chart.error;
      const startDate = String(report.generatedAt || "").slice(0, 10);
      const startIndex = chart.points.findIndex((point) => point.date >= startDate);
      const entry = Number(report.lastPrice);
      const horizonReturn = (days) => {
        if (startIndex < 0 || !Number.isFinite(entry)) return null;
        const target = chart.points[startIndex + days];
        return target ? round(pct(target.close, entry), 2) : null;
      };
      const rawReturns = {
        "1d": horizonReturn(1),
        "5d": horizonReturn(5),
        "20d": horizonReturn(20),
      };
      const action = report.briefAction || "观望";
      const directionReturns = Object.fromEntries(
        Object.entries(rawReturns).map(([horizon, value]) => [
          horizon,
          ["买入", "卖出"].includes(action) && Number.isFinite(value)
            ? round(action === "买入" ? value : -value, 2)
            : null,
        ]),
      );
      return {
        symbol: report.symbol,
        companyName: report.companyName,
        generatedAt: report.generatedAt,
        action,
        entryPrice: round(entry, 3),
        confidence: report.briefConfidence ?? report.evidenceConfidence ?? null,
        decisionWhy: report.decisionWhy || report.topDriver || report.evidenceVerdict || "",
        evidenceMix: report.evidenceMix || null,
        returns: rawReturns,
        directionReturns,
      };
    } catch (error) {
      return { symbol: report.symbol, companyName: report.companyName, generatedAt: report.generatedAt, error: error.message };
    }
  });
  const summary = {};
  for (const horizon of ["1d", "5d", "20d"]) {
    const actionable = rows.filter(
      (item) => ["买入", "卖出"].includes(item.action) && Number.isFinite(item.returns?.[horizon]),
    );
    const watchRows = rows.filter((item) => !["买入", "卖出"].includes(item.action) && Number.isFinite(item.returns?.[horizon]));
    const all = rows.filter((item) => Number.isFinite(item.returns?.[horizon]));
    const directionValues = actionable.map((item) => item.directionReturns?.[horizon]).filter(Number.isFinite);
    const hits = directionValues.filter((value) => value > 0);
    const byAction = Object.fromEntries(
      ["买入", "卖出"].map((action) => {
        const actionRows = actionable.filter((item) => item.action === action);
        const rawValues = actionRows.map((item) => item.returns?.[horizon]).filter(Number.isFinite);
        const actionDirectionValues = actionRows.map((item) => item.directionReturns?.[horizon]).filter(Number.isFinite);
        return [
          action,
          {
            samples: actionRows.length,
            hitRate: actionDirectionValues.length
              ? round((actionDirectionValues.filter((value) => value > 0).length / actionDirectionValues.length) * 100, 1)
              : null,
            avgRawReturn: rawValues.length ? round(mean(rawValues), 2) : null,
            avgDirectionReturn: actionDirectionValues.length ? round(mean(actionDirectionValues), 2) : null,
          },
        ];
      }),
    );
    summary[horizon] = {
      samples: all.length,
      actionableSamples: actionable.length,
      buySamples: byAction["买入"].samples,
      sellSamples: byAction["卖出"].samples,
      watchSamples: watchRows.length,
      watchMissedUpside: watchRows.filter((item) => item.returns[horizon] >= 5).length,
      watchAvoidedDownside: watchRows.filter((item) => item.returns[horizon] <= -5).length,
      watchAvgReturn: watchRows.length ? round(mean(watchRows.map((item) => item.returns[horizon])), 2) : null,
      hitRate: directionValues.length ? round((hits.length / directionValues.length) * 100, 1) : null,
      avgReturn: all.length ? round(mean(all.map((item) => item.returns[horizon])), 2) : null,
      avgDirectionReturn: directionValues.length ? round(mean(directionValues), 2) : null,
      worstDirectionReturn: directionValues.length ? round(Math.min(...directionValues), 2) : null,
      bestDirectionReturn: directionValues.length ? round(Math.max(...directionValues), 2) : null,
      byAction,
    };
  }
  const buildWatchReviewItems = (kind) => {
    const threshold = kind === "missed" ? 5 : -5;
    const horizonLabel = { "1d": "1日", "5d": "5日", "20d": "20日" };
    const buildWatchNote = (item, horizon, value) => {
      const why = item.decisionWhy || "";
      const label = horizonLabel[horizon] || horizon;
      if (kind === "missed") {
        if (/新闻密度|主题|AI|算力|新能源|电池|机器人|半导体/.test(why)) {
          return `${label}后上涨 ${round(value, 2)}%，当时只识别到主题热度但未升级为买入；复查是否漏掉公司级订单、业绩或公告证据。`;
        }
        if (/价格异动|成交量|放量/.test(why)) {
          return `${label}后上涨 ${round(value, 2)}%，当时量价信号有效但未触发买入；复查趋势/回撤门槛是否过紧。`;
        }
        return `${label}后上涨 ${round(value, 2)}%，复查当时观望理由是否可证伪，避免错过同类机会。`;
      }
      const decline = Math.abs(round(value, 2));
      if (/价格异动本身偏强|放量|成交量/.test(why)) {
        return `${label}后下跌 ${decline}%，说明单纯强势/放量不能追；保留“必须有公司级硬证据”的过滤。`;
      }
      if (/新闻密度|主题|AI|算力|新能源|电池|机器人|半导体/.test(why)) {
        return `${label}后下跌 ${decline}%，说明主题热度没有转成个股兑现；继续要求新闻直接指向公司。`;
      }
      return `${label}后下跌 ${decline}%，观望规则阶段性有效，保留当时的风险过滤条件。`;
    };
    const candidates = rows
      .filter((item) => !["买入", "卖出"].includes(item.action))
      .map((item) => {
        const horizon = ["5d", "1d", "20d"].find((key) => {
          const value = item.returns?.[key];
          return Number.isFinite(value) && (kind === "missed" ? value >= threshold : value <= threshold);
        });
        if (!horizon) return null;
        const value = item.returns[horizon];
        return {
          symbol: item.symbol,
          companyName: item.companyName,
          generatedAt: item.generatedAt,
          horizon,
          returnPct: value,
          entryPrice: item.entryPrice,
          decisionWhy: item.decisionWhy || "当时未记录明确理由",
          note: buildWatchNote(item, horizon, value),
        };
      })
      .filter(Boolean);
    return candidates
      .sort((a, b) => (kind === "missed" ? b.returnPct - a.returnPct : a.returnPct - b.returnPct))
      .slice(0, 6);
  };
  const missedUpside = buildWatchReviewItems("missed");
  const avoidedDownside = buildWatchReviewItems("avoided");
  const attribution = summarizeWatchReviewAttribution(missedUpside, avoidedDownside);
  return {
    generatedAt: new Date().toISOString(),
    limit,
    totalReviewed: rows.length,
    actionableReviewed: rows.filter((item) => ["买入", "卖出"].includes(item.action)).length,
    summary,
    watchReview: {
      missedUpside,
      avoidedDownside,
      rootCauses: attribution.rootCauses,
      lessons: attribution.lessons,
    },
    rows: rows.slice(0, 20),
  };
}

async function buildSystemDiagnostics(options = {}) {
  const sample = Math.max(2, Math.min(10, Number(options.sample) || 4));
  const checks = [];
  const timings = [];
  const watchlistStep = await measureStep("自选股", () => getWatchlist());
  timings.push(watchlistStep);
  const paperStep = await measureStep("模拟盘", () => getPaperPortfolio(true));
  timings.push(paperStep);
  const reportsStep = await measureStep("报告文件", () => countReportFiles());
  timings.push(reportsStep);
  const picksStep = await measureStep("候选抽样", () => buildDailyPicks({ limit: sample, capital: 100_000, recordReports: false }));
  timings.push(picksStep);

  const watchlist = watchlistStep.data || { symbols: [] };
  const paper = paperStep.data || {};
  const picks = picksStep.data || { items: [] };
  const pickItems = (picks.items || []).filter((item) => !item.error);
  const strongBuys = pickItems.filter((item) => item.signalGrade === "强买").length;
  const observations = pickItems.filter((item) => item.signalGrade === "观察").length;
  const noTouches = pickItems.filter((item) => item.signalGrade === "不碰").length;
  const avgScore = round(mean(pickItems.map((item) => Number(item.score)).filter(Number.isFinite)), 1);
  const dataSources = listDataSources();

  if (watchlistStep.ok && (watchlist.symbols || []).length >= 50) {
    diagnosticCheck(checks, "ok", "股票池规模", `当前自选 ${watchlist.symbols.length} 只，足够做每日扫描。`);
  } else {
    diagnosticCheck(checks, "warn", "股票池规模偏小", `当前自选 ${watchlist.symbols?.length || 0} 只。`, "继续加入你关注的核心行业龙头和高弹性标的。");
  }

  if (FINNHUB_API_KEY && NEWSAPI_KEY) {
    diagnosticCheck(checks, "ok", "免费新闻源", "Finnhub 和 NewsAPI 已配置，可补充美股新闻和跨市场新闻。");
  } else {
    diagnosticCheck(checks, "warn", "免费新闻源不完整", "Finnhub 或 NewsAPI 未配置。", "补齐 key 后新闻证据会更稳定。");
  }

  if (picksStep.ok) {
    const seconds = round(picksStep.ms / 1000, 1);
    diagnosticCheck(
      checks,
      picksStep.ms <= 30_000 ? "ok" : "warn",
      "扫描速度",
      `抽样 ${sample} 只耗时 ${seconds} 秒。`,
      picksStep.ms > 30_000 ? "全量扫描建议放到每日定时任务，前端只展示结果。" : "",
    );
  } else {
    diagnosticCheck(checks, "bad", "候选扫描失败", picksStep.error || "未知错误", "优先检查免费行情/新闻接口是否断流。");
  }

  if (pickItems.length && strongBuys === 0) {
    diagnosticCheck(checks, "ok", "推荐纪律", `抽样中 0 个强买，${observations} 个观察，${noTouches} 个不碰。`, "没有硬条件就不交易，这是正确状态。");
  } else if (strongBuys > 0) {
    diagnosticCheck(checks, "ok", "强买候选", `抽样出现 ${strongBuys} 个强买，需进入模拟盘验证。`);
  }

  const risk = paper.risk || {};
  if ((risk.violations || []).length) {
    diagnosticCheck(checks, "bad", "组合风控", risk.violations.join("；"), "暂停新开仓，先处理回撤、现金或持仓集中度。");
  } else {
    diagnosticCheck(checks, "ok", "组合风控", `现金 ${round(risk.cashPct, 1) ?? 100}%，回撤 ${round(risk.drawdownPct, 1) ?? 0}%，持仓 ${risk.openPositions || 0} 个。`);
  }

  const reportCount = reportsStep.data || 0;
  diagnosticCheck(
    checks,
    reportCount >= 20 ? "ok" : "warn",
    "复盘样本",
    `当前报告样本文件 ${reportCount} 个。`,
    reportCount < 20 ? "继续跑每日闭环，样本越多，胜率/回撤统计越可信。" : "",
  );

  const failedSteps = timings.filter((item) => !item.ok).length;
  const badCount = checks.filter((item) => item.level === "bad").length;
  const warnCount = checks.filter((item) => item.level === "warn").length;
  const score = Math.max(0, 100 - badCount * 28 - warnCount * 10 - failedSteps * 18);
  const status = badCount ? "需要处理" : warnCount ? "可用但需改进" : "健康";

  return {
    generatedAt: new Date().toISOString(),
    status,
    score,
    sample,
    metrics: {
      watchlistCount: watchlist.symbols?.length || 0,
      reportFiles: reportCount,
      paperEquity: paper.equity || paper.initialCapital || 0,
      paperReturnPct: paper.totalReturnPct ?? 0,
      openPositions: paper.positions?.length || 0,
      avgCandidateScore: avgScore,
      strongBuys,
      observations,
      noTouches,
      cacheEntries: memoryCache.size,
      freeSources: dataSources.freeNow.length,
    },
    checks,
    timings: timings.map(({ label, ok, ms, error }) => ({ label, ok, ms, error })),
    nextUpgrades: [
      "把全量扫描改成后台定时任务，前端读取最近一次结果，避免按钮等待过久。",
      "增加按行业/主题的胜率与回撤统计，过滤掉长期无效主题。",
      "把公告原文和新闻原文做引用留存，复盘时能追溯当初为什么推荐。",
      "加入模拟盘交易日志导出，方便和真实券商观察单对比。",
    ],
  };
}

function qaCheck(checks, level, title, detail, action) {
  checks.push({ level, title, detail, action });
}

function hasUsefulEvidenceContent(item) {
  return (item.evidenceItems || []).some((evidence) => {
    const text = String(evidence.content || "");
    return text.length >= 40 && !text.includes("仅抓到标题");
  });
}

async function buildInvestorQa() {
  const [briefing, dailyPicks, cycle, paper] = await Promise.all([
    readLatestResult(BRIEFING_CACHE_FILE),
    readLatestResult(DAILY_PICKS_CACHE_FILE),
    readLatestResult(DAILY_CYCLE_CACHE_FILE),
    getPaperPortfolio(true),
  ]);
  const briefingMaturity = await summarizeReportMaturity("briefing");
  const briefingSignals = briefingMaturity.total;
  const checks = [];
  const briefingItems = (briefing?.items || []).filter((item) => !item.error);
  const pickItems = (dailyPicks?.items || []).filter((item) => !item.error);
  const watchOrders = paper?.watchOrders || [];
  const triggeredWatchOrders = watchOrders.filter((item) => /触发|复查|大涨|大跌|确认/.test(item.triggerState || ""));
  const briefingBuys = briefingItems.filter((item) => item.briefAction === "买入").length;
  const strongBuys = pickItems.filter((item) => item.signalGrade === "强买").length;
  const reviewSamples =
    (cycle?.review?.summary?.["1d"]?.samples || 0) +
    (cycle?.review?.summary?.["5d"]?.samples || 0) +
    (cycle?.review?.summary?.["20d"]?.samples || 0);
  const missingEvidence = briefingItems.filter((item) => !(item.evidenceItems || []).length || !hasUsefulEvidenceContent(item)).length;
  const missingAction = briefingItems.filter((item) => !item.nextAction || item.nextAction.includes("暂无")).length;
  const vagueWords = ["价格异动本身偏弱", "暂无明确催化", "市场正在重新定价", "继续观察"];
  const vagueHits = briefingItems.reduce((sum, item) => {
    const text = `${item.decisionWhy || ""} ${(item.signalBullets || []).join(" ")} ${(item.reasons || []).join(" ")}`;
    return sum + vagueWords.filter((word) => text.includes(word)).length;
  }, 0);

  if (!briefingItems.length) {
    qaCheck(checks, "严重", "每日简报缺失", "还没有可用简报，投资者打开页面无法判断当天重点。", "后台生成简报，并缓存最近一次结果。");
  } else if (missingEvidence > 0) {
    qaCheck(
      checks,
      "警告",
      "简报证据不足",
      `${missingEvidence}/${briefingItems.length} 条简报缺少可读证据摘要或只拿到标题。`,
      "优先补原文摘要、公告类型解释和来源链接，不允许只显示新闻标题。",
    );
  } else {
    qaCheck(checks, "通过", "简报证据可读", `${briefingItems.length} 条简报都带有证据摘要。`, "继续降低网页导航噪音和重复公告。");
  }

  if (vagueHits > 0) {
    qaCheck(checks, "警告", "空话仍存在", `命中 ${vagueHits} 个笼统表达。`, "把空话替换成量价、证据、新闻摘要和交易触发条件。");
  } else {
    qaCheck(checks, "通过", "表达足够具体", "未发现主要空话模板。", "继续保持结论可核查。");
  }

  if (missingAction > 0) {
    qaCheck(checks, "警告", "缺少操作触发", `${missingAction} 条简报没有明确下一步动作。`, "每条都必须写：买入条件、观望触发或卖出处理。");
  } else {
    qaCheck(checks, "通过", "操作触发明确", "简报已提供下一步动作。", "已接入模拟盘观察单；下一步把自然语言触发条件结构化，满足后再模拟成交。");
  }

  if (watchOrders.length) {
    qaCheck(
      checks,
      "通过",
      "观察单已接入",
      `当前 ${watchOrders.length} 条观察单，${triggeredWatchOrders.length} 条需要复查或触发确认。`,
      "下一步让触发后的观察单自动进入模拟成交/复盘队列。",
    );
  } else {
    qaCheck(checks, "警告", "观察单未生成", "还没有从简报沉淀观察单。", "生成每日简报后自动同步观察单。");
  }

  if (strongBuys > 3) {
    qaCheck(checks, "严重", "强买过多", `当前强买 ${strongBuys} 个，容易变成乱推荐。`, "强买必须同时通过证据、趋势、量能、回测、风控。");
  } else {
    qaCheck(checks, "通过", "推荐纪律", `强买 ${strongBuys} 个，保持克制。`, "没有硬条件就宁愿观望。");
  }

  const matureSamples = Math.max(reviewSamples, briefingMaturity.mature["1d"] || 0);
  if (matureSamples < 30) {
    qaCheck(
      checks,
      "警告",
      "成熟复盘样本不足",
      `已记录简报观察 ${briefingSignals} 条，至少 1 日成熟样本 ${briefingMaturity.mature["1d"] || 0} 条，但 5/20 日样本仍需继续积累。`,
      "继续每天跑简报/闭环，等样本跨过 1/5/20 个交易日后统计胜率、盈亏比和最大回撤。",
    );
  } else {
    qaCheck(
      checks,
      "通过",
      "复盘样本可用",
      `1日成熟 ${briefingMaturity.mature["1d"] || 0} 条，5日成熟 ${briefingMaturity.mature["5d"] || 0} 条，20日成熟 ${briefingMaturity.mature["20d"] || 0} 条。`,
      "已接入收益率复盘；下一步反查观望后大涨/大跌样本，校准错过机会和避险规则。",
    );
  }

  const risk = paper?.risk || {};
  if ((risk.violations || []).length) {
    qaCheck(checks, "严重", "模拟盘风控违规", risk.violations.join("；"), "暂停新开仓，先处理持仓/现金/回撤约束。");
  } else {
    qaCheck(checks, "通过", "模拟盘风控正常", `现金 ${round(risk.cashPct, 1) ?? 100}%，回撤 ${round(risk.drawdownPct, 1) ?? 0}%。`, "继续只用模拟盘验证，不急着实盘。");
  }

  const severe = checks.filter((item) => item.level === "严重").length;
  const warnings = checks.filter((item) => item.level === "警告").length;
  return {
    generatedAt: new Date().toISOString(),
    status: severe ? "需修" : warnings ? "可用待改" : "通过",
    metrics: {
      briefingItems: briefingItems.length,
      briefingBuys,
      strongBuys,
      missingEvidence,
      missingAction,
      vagueHits,
      watchOrders: watchOrders.length,
      triggeredWatchOrders: triggeredWatchOrders.length,
      reviewSamples,
      briefingSignals,
      mature1d: briefingMaturity.mature["1d"] || 0,
      mature5d: briefingMaturity.mature["5d"] || 0,
      mature20d: briefingMaturity.mature["20d"] || 0,
    },
    checks,
    nextUpgrades: checks
      .filter((item) => item.level !== "通过")
      .map((item) => item.action)
      .filter(Boolean)
      .slice(0, 5),
  };
}

async function buildDailyCycle(options = {}) {
  const limit = Math.max(1, Math.min(120, Number(options.limit) || 80));
  const capital = Math.max(10_000, Number(options.capital) || 100_000);
  const shouldExecute = options.execute !== false;
  const startedAt = new Date().toISOString();
  const watchOrderProcessing = await processTriggeredWatchOrders({ execute: shouldExecute, capital });
  const rawPortfolio = normalizePaperPortfolio(await getPaperPortfolio(false));
  const executions = [...(watchOrderProcessing.executions || [])];
  executions.push(...(await applyPaperExitRules(rawPortfolio)));
  if (executions.length) await savePaperPortfolio(rawPortfolio);
  rawPortfolio.recommendations ||= [];

  const dailyPicks = await buildDailyPicks({ limit, capital, recordReports: true });
  const candidateRecs = (dailyPicks.items || [])
    .filter((item) => !item.error)
    .slice(0, 20)
    .map(paperRecommendationFromPick);
  rawPortfolio.recommendations = [...candidateRecs, ...rawPortfolio.recommendations].slice(0, 100);

  let marked = await getPaperPortfolio(true);
  marked = { ...marked, equityHighWatermark: Math.max(marked.equityHighWatermark || 0, marked.equity || 0) };
  let risk = buildPaperRiskSnapshot(marked);
  const skipped = [];
  if (shouldExecute && risk.canOpenNewPositions) {
    const strongPicks = (dailyPicks.items || [])
      .filter((item) => !item.error && item.signalGrade === "强买" && item.filterPassed)
      .slice(0, 8);
    for (const item of strongPicks) {
      if (executions.filter((trade) => trade.side === "buy").length >= paperRiskPolicy.maxDailyNewBuys) break;
      if ((rawPortfolio.positions || []).length >= paperRiskPolicy.maxOpenPositions) {
        skipped.push(`持仓数已达到 ${paperRiskPolicy.maxOpenPositions}，停止新开仓。`);
        break;
      }
      if (rawPortfolio.positions.some((position) => position.symbol === item.symbol)) {
        skipped.push(`${item.companyName || item.symbol} 已持仓，跳过重复买入。`);
        continue;
      }
      if (isBlacklistedTheme(item)) {
        skipped.push(`${item.companyName || item.symbol} 命中黑名单主题，跳过。`);
        continue;
      }
      const equity = risk.equity || capital;
      const existingThemePct = Number(risk.themeExposurePct?.[item.theme || "未分类"]) || 0;
      const maxPositionValue = Math.min(
        item.plan?.positionValue || 0,
        equity * (paperRiskPolicy.maxSinglePositionPct / 100),
        Math.max(0, rawPortfolio.cash - equity * (paperRiskPolicy.minCashPct / 100)),
      );
      const newThemePct = equity ? ((maxPositionValue / equity) * 100) + existingThemePct : 0;
      if (newThemePct > paperRiskPolicy.maxThemeExposurePct) {
        skipped.push(`${item.companyName || item.symbol} 所在主题仓位将超过 ${paperRiskPolicy.maxThemeExposurePct}%，跳过。`);
        continue;
      }
      const shares =
        Math.floor(maxPositionValue / Math.max(0.01, item.price || 0) / lotSizeForSymbol(item.symbol)) * lotSizeForSymbol(item.symbol);
      if (!shares) {
        skipped.push(`${item.companyName || item.symbol} 按当前风险预算买不了最小交易单位。`);
        continue;
      }
      executions.push(
        applyPaperTrade(rawPortfolio, {
          symbol: item.symbol,
          side: "buy",
          shares,
          price: item.price,
          name: item.companyName,
          stopPrice: item.plan?.stopPrice,
          targetPrice: item.plan?.targetPrice,
          strategy: item.backtest?.strategy,
          theme: item.theme,
          signalGrade: item.signalGrade,
          reason: "每日强买信号自动模拟买入",
        }),
      );
      rawPortfolio.cash = round(rawPortfolio.cash, 2);
      const roughEquity = equity;
      risk.themeExposurePct[item.theme || "未分类"] = round(newThemePct, 2);
      risk.cashPct = round((rawPortfolio.cash / roughEquity) * 100, 2);
      risk.openPositions = rawPortfolio.positions.length;
      if (risk.cashPct < paperRiskPolicy.minCashPct) break;
    }
  }

  rawPortfolio.cycles = [
    {
      generatedAt: startedAt,
      scanned: dailyPicks.universeBreakdown?.scanned || limit,
      strongBuys: (dailyPicks.items || []).filter((item) => item.signalGrade === "强买").length,
      observations: (dailyPicks.items || []).filter((item) => item.signalGrade === "观察").length,
      noTouches: (dailyPicks.items || []).filter((item) => item.signalGrade === "不碰").length,
      executions: executions.length,
      skipped: skipped.slice(0, 8),
    },
    ...(rawPortfolio.cycles || []),
  ].slice(0, 30);
  await savePaperPortfolio(rawPortfolio);
  const finalPaper = await getPaperPortfolio(true);
  const highWatermark = Math.max(finalPaper.equityHighWatermark || 0, finalPaper.equity || 0);
  if (highWatermark !== rawPortfolio.equityHighWatermark) {
    rawPortfolio.equityHighWatermark = highWatermark;
    await savePaperPortfolio(rawPortfolio);
  }
  const paper = await getPaperPortfolio(true);
  const reviewItems = await buildRecommendationReviewFromPortfolio(rawPortfolio);
  return {
    generatedAt: new Date().toISOString(),
    mode: shouldExecute ? "scan-filter-paper-execute-review" : "scan-filter-review",
    dailyPicks,
    watchOrderProcessing,
    executions,
    skipped,
    paper,
    risk: buildPaperRiskSnapshot(paper),
    review: {
      summary: summarizeRecommendationReview(reviewItems),
      items: reviewItems.slice(0, 12),
    },
    notes: [
      "所有买卖都是本地模拟盘，不是真实下单。",
      "只有过滤器全部通过的强买信号才允许进入模拟盘；其他信号只进入观察或不碰。",
      "免费数据源可能延迟或缺字段，实盘前仍需人工核实公告原文和交易规则。",
    ],
  };
}

async function buildNightlyDeepDive(options = {}) {
  const limit = Math.max(20, Math.min(180, Number(options.limit) || 120));
  const focusLimit = Math.max(8, Math.min(48, Number(options.focusLimit) || 24));
  const capital = Math.max(10_000, Number(options.capital) || 100_000);
  const startedAt = new Date().toISOString();
  const briefing = await buildBriefing({
    limit,
    focusLimit,
    fetchEvidenceSourceText: true,
    evidenceSourceTextLimit: 2,
    symbolTimeoutMs: 22_000,
  });
  await writeJsonFile(BRIEFING_CACHE_FILE, briefing);
  const watchSync = await syncBriefingWatchOrders();
  const watchOrderProcessing = await processTriggeredWatchOrders({ execute: false, capital });
  const [dailyPicks, outcomes, qa] = await Promise.all([
    buildDailyPicks({ limit, capital, recordReports: false }),
    buildBriefingOutcomeStats({ limit: 120 }),
    buildInvestorQa(),
  ]);
  const strongBuys = (dailyPicks.items || []).filter((item) => item.signalGrade === "强买" && item.filterPassed);
  return {
    generatedAt: new Date().toISOString(),
    startedAt,
    mode: "nightly-full-scan-cache",
    scan: {
      requested: limit,
      briefingFocus: focusLimit,
      briefingScanned: briefing.scannedSymbols || briefing.symbols?.length || 0,
      dailyPickScanned: dailyPicks.universeBreakdown?.scanned || limit,
      strongBuys: strongBuys.length,
      watchOrdersAdded: watchSync.added || 0,
      triggeredWatchOrders: watchOrderProcessing.reviewItems?.length || 0,
    },
    briefing,
    dailyPicks,
    outcomes,
    qa,
    watchSync: { added: watchSync.added || 0 },
    watchOrderProcessing: {
      processed: watchOrderProcessing.processed || 0,
      reviewItems: (watchOrderProcessing.reviewItems || []).slice(0, 8),
      skipped: (watchOrderProcessing.skipped || []).slice(0, 8),
    },
    notes: [
      "夜间深挖会缓存完整结果；前端第二天优先读取缓存，避免打开页面重新等待。",
      "本阶段只做模拟盘和 dry-run 观察单，不会真实下单。",
      "免费源速度和稳定性有限，部署到云端后应放在定时任务里跑。",
    ],
  };
}

function listDataSources() {
  return {
    freeNow: [
      { name: "Yahoo Finance chart", use: "美股/A股 5年日线回测", limitation: "非授权商业源，实盘产品需替换。" },
      { name: "腾讯/新浪/东方财富公共接口", use: "A股日线、F10、公告/资讯原型", limitation: "稳定性、历史深度和授权不足。" },
      { name: "Google News RSS / Yahoo RSS", use: "早期新闻线索、非主流来源扫描", limitation: "只能当线索，必须用公告/交易所/公司原文二次确认。" },
      { name: "SEC EDGAR", use: "美股财务事实", limitation: "不覆盖大部分 ADR 和非 SEC 披露公司。" },
      { name: "Tushare 基础积分", use: "A股非复权日线和部分低门槛接口", limitation: "免费权限很窄；财务、复权、分钟和特色数据通常需要积分或独立权限。" },
      {
        name: "Finnhub API",
        use: "美股公司新闻、公司资料、基础财务增强",
        limitation: FINNHUB_API_KEY ? "已配置。免费额度和授权范围仍需遵守 Finnhub 条款。" : "未配置 FINNHUB_API_KEY。",
      },
      {
        name: "NewsAPI",
        use: "A股/美股新闻增强、英文新闻补充、事件证据扩展",
        limitation: NEWSAPI_KEY ? "已配置。Developer 免费计划通常适合开发测试，不等同实时新闻终端。" : "未配置 NEWSAPI_KEY。",
      },
      { name: "Polygon / Massive 免费层", use: "美股日线、公司参考数据补充", limitation: "免费频率很低，适合补数据，不适合大范围实时扫描。" },
    ],
    paidRecommended: [
      { name: "Tushare Pro", priority: "高", use: "A股历史日线、复权因子、财务、公告索引、北交所补齐" },
      { name: "Choice / Wind", priority: "高", use: "A股/港股高质量财务、研报、一致预期、行业分类、事件历史" },
      { name: "Polygon / Finnhub / Intrinio", priority: "中高", use: "美股授权行情、公司新闻、财务、拆股分红" },
      { name: "NewsAPI / Benzinga / Dow Jones / Bloomberg", priority: "中高", use: "新闻原文、实时新闻、事件分类" },
      { name: "FactSet / Bloomberg Supply Chain", priority: "中", use: "供应链关系、客户/供应商暴露、关系权重" },
    ],
    whyNeeded: [
      "要证明年化 50%+ 这类高目标，必须用 3-5 年以上无幸存者偏差数据做严肃回测。",
      "事件驱动策略需要历史公告、财报、研报、一致预期和新闻时间戳；免费源只能做原型。",
      "实盘需要授权、稳定、可追溯的数据，避免公共接口断流或数据口径变化。",
    ],
  };
}

async function analyzeSymbol(inputSymbol, options = {}) {
  const symbol = normalizeSymbol(inputSymbol);
  if (!symbol) {
    throw new Error("请输入股票代码或公司名称");
  }

  const isAshare = isMainlandASymbol(symbol);
  const [chart, summary, secBase, companyProfile, finnhubBase] = await Promise.all([
    fetchChart(symbol),
    isAshare ? Promise.resolve(null) : fetchYahooSummary(symbol),
    isAshare ? Promise.resolve(null) : fetchSecFundamentals(symbol),
    isAshare ? fetchEastmoneyCompanyProfile(symbol) : Promise.resolve(null),
    isAshare ? Promise.resolve(null) : fetchFinnhubFundamentals(symbol),
  ]);

  const aShareFinancials = isAshare ? await fetchAshareFinancials(symbol, chart) : null;
  const sec = isAshare ? aShareFinancials : secBase;
  const fundamentals = isAshare
    ? buildAshareFundamentals(companyProfile, aShareFinancials, chart)
    : buildUsFundamentals(summary, secBase, chart, finnhubBase);
  const companyName =
    companyProfile?.name ||
    aShareFinancials?.name ||
    finnhubBase?.profile?.name ||
    chart.name ||
    summary?.price?.longName ||
    summary?.price?.shortName ||
    symbol;
  const supplyChain = getSupplyChain(symbol, companyName, fundamentals || {});
  const news = await fetchNews(symbol, companyName);
  const newsProfile = categorizeNews(news);

  const related = uniqueBySymbol([
    ...supplyChain.upstream.map((item) => ({ ...item, relation: "上游" })),
    ...supplyChain.downstream.map((item) => ({ ...item, relation: "下游" })),
    ...supplyChain.competitors.map((item) => ({ ...item, relation: "同行/替代" })),
  ]).slice(0, 14);

  const benchmarkSymbols = isMainlandASymbol(symbol)
    ? ["000300.SS", "000905.SS", "399006.SZ"]
    : isChinaSymbol(symbol)
      ? ["000300.SS", "510300.SS", "2800.HK"]
    : ["SPY", "QQQ", "SOXX"];

  const [relatedCharts, benchmarkResults] = await Promise.all([
    mapWithConcurrency(related, 4, async (relation) => ({
      relation,
      chart: await fetchChart(relation.symbol),
    })),
    mapWithConcurrency(benchmarkSymbols, 3, async (benchmark) => ({
      symbol: benchmark,
      chart: await fetchChart(benchmark),
    })),
  ]);

  const benchmarks = {};
  for (const item of benchmarkResults) {
    if (item?.chart) benchmarks[item.symbol] = item.chart;
  }

  const targetCandidate = {
    relation: { symbol, name: companyName, role: "分析目标", relation: "目标", weight: 100 },
    chart,
  };
  const candidateInputs = [targetCandidate, ...relatedCharts.filter((item) => item.chart)];
  const candidates = candidateInputs
    .map((item) => {
      const scores = scoreCandidate({
        chart: item.chart,
        relation: item.relation,
        newsProfile,
        sec: item.relation.symbol === symbol ? sec : null,
        fundamentals: item.relation.symbol === symbol ? fundamentals : null,
      });
      return {
        symbol: item.relation.symbol,
        name:
          item.relation.name ||
          (item.chart.name && item.chart.name !== item.relation.symbol ? item.chart.name : item.relation.symbol),
        relation: item.relation.relation,
        role: item.relation.role,
        market: item.relation.market || item.chart.exchangeName,
        price: item.chart.lastClose,
        currency: item.chart.currency,
        dayChangePct: item.chart.dayChangePct,
        return1m: item.chart.metrics.return1m,
        return3m: item.chart.metrics.return3m,
        volatility63d: item.chart.metrics.volatility63d,
        maxDrawdown1y: item.chart.metrics.maxDrawdown1y,
        scores,
      };
    })
    .sort((a, b) => b.scores.total - a.scores.total);

  const drivers = buildDrivers({ chart, newsProfile, benchmarks, relatedCharts });
  const evidenceReview = await buildEvidenceReview(
    {
      symbol,
      companyName,
      chart,
      news,
      newsProfile,
      sec,
      fundamentals,
      supplyChain,
      benchmarks,
      relatedCharts,
    },
    {
      fetchSourceText: options.fetchEvidenceSourceText !== false,
      sourceTextLimit: options.evidenceSourceTextLimit ?? 4,
    },
  );
  const memo = buildResearchMemo({
    symbol,
    chart,
    supplyChain,
    newsProfile,
    candidates,
    sec,
    fundamentals,
    drivers,
    evidenceReview,
  });
  const evidenceByIndex = new Map((evidenceReview.items || []).map((item) => [item.index, item]));
  const annotatedNews = news.map((article, index) => {
    const evidence = evidenceByIndex.get(index);
    return evidence
      ? {
          ...article,
          evidence: {
            level: evidence.level,
            confidence: evidence.confidence,
            catalystType: evidence.catalystType,
            polarity: evidence.polarity,
            sourceTier: evidence.sourceTier,
            action: evidence.action,
          },
        }
      : article;
  });

  return {
    generatedAt: new Date().toISOString(),
    symbol,
    companyName,
    chart,
    fundamentals,
    sec,
    companyProfile,
    supplyChain,
    news: annotatedNews,
    newsProfile,
    evidenceReview,
    related: relatedCharts.map((item) =>
      item.chart
        ? { relation: item.relation, chart: summarizeChart(item.chart) }
        : { relation: item.input || item.relation, error: item.error || "No data" },
    ),
    benchmarks: Object.fromEntries(
      Object.entries(benchmarks).map(([key, value]) => [key, summarizeChart(value)]),
    ),
    drivers,
    candidates,
    memo,
    dataNotes: [
      "A股和美股均作为一等市场：A股使用腾讯/新浪日线、东方财富财务/公告/中文资讯，美股使用 Yahoo 图表、SEC EDGAR 财务事实和英文新闻。",
      "北交所已走 A股通道；若 F10 公司概况暂缺，会用行情名称和东方财富财务数据中心补齐核心字段。",
      "商业化需要把公共接口替换为授权行情、新闻、公告和供应链数据源。",
      "产业链第一版使用人工整理知识库与 A股行业模板；正式版建议接供应链数据库或基于公告/年报抽取关系。",
      AI_API_KEY && AI_MODEL
        ? `AI 审核已启用：${AI_MODEL}。`
        : "AI 审核当前使用本地证据引擎；配置 AI_API_KEY 和 AI_MODEL 后可启用大模型增强。",
      FINNHUB_API_KEY
        ? "Finnhub 已启用：用于补充美股公司新闻、公司资料和基础财务。"
        : "Finnhub 未启用：配置 FINNHUB_API_KEY 后可补充美股公司新闻、公司资料和基础财务。",
      NEWSAPI_KEY
        ? "NewsAPI 已启用：用于补充 A股/美股新闻和事件证据。"
        : "NewsAPI 未启用：配置 NEWSAPI_KEY 后可补充新闻源。",
      "评分是研究排序，不构成投资建议。",
    ],
  };
}

async function serveStatic(request, response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const fullPath = path.normalize(path.join(PUBLIC_DIR, requestedPath));
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const content = await fs.readFile(fullPath);
    const extension = path.extname(fullPath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders(),
  });
  response.end(JSON.stringify(payload, null, 2));
}

function isAuthorized(request) {
  if (!APP_PASSWORD) return true;
  const header = String(request.headers.authorization || "");
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return username === APP_USERNAME && password === APP_PASSWORD;
  } catch (error) {
    return false;
  }
}

function sendAuthRequired(response) {
  response.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "WWW-Authenticate": 'Basic realm="InvestGraph AI"',
    "Cache-Control": "no-store",
    ...corsHeaders(),
  });
  response.end("Authentication required");
}

async function buildHealthPayload() {
  let dataDirWritable = false;
  let dataDirError = null;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_DIR, fsSync.constants.W_OK);
    dataDirWritable = true;
  } catch (error) {
    dataDirError = error.message;
  }
  return {
    ok: dataDirWritable,
    service: "investgraph-ai",
    generatedAt: new Date().toISOString(),
    uptimeSec: round(process.uptime(), 1),
    storage: {
      mode: DATA_STORAGE,
      dataDirConfigured: Boolean(process.env.DATA_DIR),
      writable: dataDirWritable,
      error: dataDirError,
    },
    authEnabled: Boolean(APP_PASSWORD),
    integrations: {
      aiReview: Boolean(AI_API_KEY && AI_MODEL),
      finnhub: Boolean(FINNHUB_API_KEY),
      newsapi: Boolean(NEWSAPI_KEY),
    },
  };
}

function localNetworkUrls(port = PORT) {
  const interfaces = os.networkInterfaces();
  const urls = [];
  const ignoredPrefixes = ["bridge", "utun", "awdl", "llw", "anpi", "ap"];
  for (const [name, entries] of Object.entries(interfaces)) {
    const ignored = ignoredPrefixes.some((prefix) => name.startsWith(prefix));
    for (const entry of entries || []) {
      if (entry.internal || entry.family !== "IPv4") continue;
      if (!/^(10|172\.(1[6-9]|2\d|3[0-1])|192\.168)\./.test(entry.address)) continue;
      if (ignored) continue;
      urls.push({
        interface: name,
        address: entry.address,
        url: `http://${entry.address}:${port}/`,
        preferred: name === "en0" || name === "en1",
      });
    }
  }
  return urls.sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.interface.localeCompare(b.interface));
}

async function readJsonBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 32_000) throw new Error("请求体过大");
  }
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        ...corsHeaders(),
      });
      response.end();
      return;
    }
    if (requestUrl.pathname === "/api/health") {
      const payload = await buildHealthPayload();
      sendJson(response, payload.ok ? 200 : 503, payload);
      return;
    }
    if (!isAuthorized(request)) {
      sendAuthRequired(response);
      return;
    }
    if (requestUrl.pathname === "/api/analyze") {
      const symbol = requestUrl.searchParams.get("symbol") || "NVDA";
      const data = await analyzeSymbol(symbol);
      sendJson(response, 200, data);
      return;
    }
    if (requestUrl.pathname === "/api/intraday") {
      const symbol = requestUrl.searchParams.get("symbol") || "688122";
      sendJson(response, 200, await fetchIntraday(symbol));
      return;
    }
    if (requestUrl.pathname === "/api/watchlist") {
      if (request.method === "GET") {
        sendJson(response, 200, await getWatchlist());
        return;
      }
      if (request.method === "POST") {
        const body = await readJsonBody(request);
        sendJson(response, 200, await addWatchlistSymbol(body.symbol));
        return;
      }
      if (request.method === "DELETE") {
        const symbol = requestUrl.searchParams.get("symbol") || "";
        sendJson(response, 200, await removeWatchlistSymbol(symbol));
        return;
      }
    }
    if (requestUrl.pathname === "/api/reports") {
      const symbol = requestUrl.searchParams.get("symbol") || "";
      sendJson(response, 200, await getReportHistory(symbol));
      return;
    }
    if (requestUrl.pathname === "/api/reports/snapshot") {
      const body = request.method === "POST" ? await readJsonBody(request) : {};
      const symbol = body.symbol || requestUrl.searchParams.get("symbol") || "";
      const analysis = await analyzeSymbol(symbol);
      sendJson(response, 200, await appendReport(analysis, "manual"));
      return;
    }
    if (requestUrl.pathname === "/api/briefing") {
      const limit = Number(requestUrl.searchParams.get("limit") || 0);
      const focusLimit = Number(requestUrl.searchParams.get("focusLimit") || 8);
      sendJson(response, 200, await buildBriefing({ limit, focusLimit }));
      return;
    }
    if (requestUrl.pathname === "/api/briefing/job") {
      const limit = Number(requestUrl.searchParams.get("limit") || 0);
      const focusLimit = Number(requestUrl.searchParams.get("focusLimit") || 8);
      const job = startBackgroundJob({
        type: "briefing",
        label: "每日简报",
        cacheFile: BRIEFING_CACHE_FILE,
        task: () => buildBriefing({ limit, focusLimit, fetchEvidenceSourceText: true, evidenceSourceTextLimit: 1 }),
      });
      sendJson(response, 200, { job: publicJob(job, false), latest: await readLatestResult(BRIEFING_CACHE_FILE) });
      return;
    }
    if (requestUrl.pathname === "/api/briefing/latest") {
      sendJson(response, 200, {
        latest: await readLatestResult(BRIEFING_CACHE_FILE),
        runningJob: publicJob(getRunningJob("briefing"), false),
      });
      return;
    }
    if (requestUrl.pathname === "/api/daily-picks") {
      const limit = Number(requestUrl.searchParams.get("limit") || 12);
      const capital = Number(requestUrl.searchParams.get("capital") || 100000);
      sendJson(response, 200, await buildDailyPicks({ limit, capital }));
      return;
    }
    if (requestUrl.pathname === "/api/daily-picks/job") {
      const limit = Number(requestUrl.searchParams.get("limit") || 80);
      const capital = Number(requestUrl.searchParams.get("capital") || 100000);
      const job = startBackgroundJob({
        type: "daily-picks",
        label: "每日推荐候选",
        cacheFile: DAILY_PICKS_CACHE_FILE,
        task: () => buildDailyPicks({ limit, capital }),
      });
      sendJson(response, 200, { job: publicJob(job, false), latest: await readLatestResult(DAILY_PICKS_CACHE_FILE) });
      return;
    }
    if (requestUrl.pathname === "/api/daily-picks/latest") {
      sendJson(response, 200, {
        latest: await readLatestResult(DAILY_PICKS_CACHE_FILE),
        runningJob: publicJob(getRunningJob("daily-picks"), false),
      });
      return;
    }
    if (requestUrl.pathname === "/api/daily-cycle") {
      const limit = Number(requestUrl.searchParams.get("limit") || 80);
      const capital = Number(requestUrl.searchParams.get("capital") || 100000);
      const execute = requestUrl.searchParams.get("execute") !== "false";
      sendJson(response, 200, await buildDailyCycle({ limit, capital, execute }));
      return;
    }
    if (requestUrl.pathname === "/api/daily-cycle/job") {
      const limit = Number(requestUrl.searchParams.get("limit") || 80);
      const capital = Number(requestUrl.searchParams.get("capital") || 100000);
      const execute = requestUrl.searchParams.get("execute") !== "false";
      const job = startBackgroundJob({
        type: "daily-cycle",
        label: "实战闭环",
        cacheFile: DAILY_CYCLE_CACHE_FILE,
        task: () => buildDailyCycle({ limit, capital, execute }),
      });
      sendJson(response, 200, { job: publicJob(job, false), latest: await readLatestResult(DAILY_CYCLE_CACHE_FILE) });
      return;
    }
    if (requestUrl.pathname === "/api/daily-cycle/latest") {
      sendJson(response, 200, {
        latest: await readLatestResult(DAILY_CYCLE_CACHE_FILE),
        runningJob: publicJob(getRunningJob("daily-cycle"), false),
      });
      return;
    }
    if (requestUrl.pathname === "/api/nightly-deep-dive") {
      const limit = Number(requestUrl.searchParams.get("limit") || 120);
      const focusLimit = Number(requestUrl.searchParams.get("focusLimit") || 24);
      const capital = Number(requestUrl.searchParams.get("capital") || 100000);
      sendJson(response, 200, await buildNightlyDeepDive({ limit, focusLimit, capital }));
      return;
    }
    if (requestUrl.pathname === "/api/nightly-deep-dive/job") {
      const limit = Number(requestUrl.searchParams.get("limit") || 120);
      const focusLimit = Number(requestUrl.searchParams.get("focusLimit") || 24);
      const capital = Number(requestUrl.searchParams.get("capital") || 100000);
      const job = startBackgroundJob({
        type: "nightly-deep-dive",
        label: "夜间全量深挖",
        cacheFile: NIGHTLY_DEEP_DIVE_CACHE_FILE,
        task: () => buildNightlyDeepDive({ limit, focusLimit, capital }),
      });
      sendJson(response, 200, { job: publicJob(job, false), latest: await readLatestResult(NIGHTLY_DEEP_DIVE_CACHE_FILE) });
      return;
    }
    if (requestUrl.pathname === "/api/nightly-deep-dive/latest") {
      sendJson(response, 200, {
        latest: await readLatestResult(NIGHTLY_DEEP_DIVE_CACHE_FILE),
        runningJob: publicJob(getRunningJob("nightly-deep-dive"), false),
      });
      return;
    }
    if (requestUrl.pathname.startsWith("/api/jobs/")) {
      const id = decodeURIComponent(requestUrl.pathname.slice("/api/jobs/".length));
      sendJson(response, 200, { job: publicJob(backgroundJobs.get(id)) });
      return;
    }
    if (requestUrl.pathname === "/api/diagnostics") {
      const sample = Number(requestUrl.searchParams.get("sample") || 4);
      sendJson(response, 200, await buildSystemDiagnostics({ sample }));
      return;
    }
    if (requestUrl.pathname === "/api/investor-qa") {
      sendJson(response, 200, await buildInvestorQa());
      return;
    }
    if (requestUrl.pathname === "/api/briefing-outcomes") {
      const limit = Number(requestUrl.searchParams.get("limit") || 80);
      sendJson(response, 200, await buildBriefingOutcomeStats({ limit }));
      return;
    }
    if (requestUrl.pathname === "/api/backtest") {
      const symbol = requestUrl.searchParams.get("symbol") || "688122";
      const strategy = requestUrl.searchParams.get("strategy") || "volume_breakout";
      const years = Number(requestUrl.searchParams.get("years") || 5);
      sendJson(response, 200, await buildBacktest(symbol, strategy, years));
      return;
    }
    if (requestUrl.pathname === "/api/trade-plan") {
      const symbol = requestUrl.searchParams.get("symbol") || "688122";
      const strategy = requestUrl.searchParams.get("strategy") || "volume_breakout";
      const capital = Number(requestUrl.searchParams.get("capital") || 100000);
      const analysis = await analyzeSymbol(symbol, { fetchEvidenceSourceText: false });
      const backtest = await buildBacktest(analysis.symbol, strategy, 5);
      sendJson(response, 200, {
        plan: buildTradePlan(analysis, backtest, capital),
        backtest: backtest.selected,
      });
      return;
    }
    if (requestUrl.pathname === "/api/paper") {
      sendJson(response, 200, await getPaperPortfolio());
      return;
    }
    if (requestUrl.pathname === "/api/paper/recommend") {
      const body = request.method === "POST" ? await readJsonBody(request) : {};
      const symbol = body.symbol || requestUrl.searchParams.get("symbol") || "688122";
      const strategy = body.strategy || requestUrl.searchParams.get("strategy") || "volume_breakout";
      const capital = Number(body.capital || requestUrl.searchParams.get("capital") || 100000);
      const execute = body.execute === true || requestUrl.searchParams.get("execute") === "true";
      sendJson(response, 200, await recommendPaperTrade(symbol, strategy, capital, { execute }));
      return;
    }
    if (requestUrl.pathname === "/api/paper/watch-orders/sync") {
      sendJson(response, 200, await syncBriefingWatchOrders());
      return;
    }
    if (requestUrl.pathname === "/api/paper/watch-orders/process") {
      const body = request.method === "POST" ? await readJsonBody(request) : {};
      const executeParam = requestUrl.searchParams.get("execute");
      const execute = body.execute === false || executeParam === "false" ? false : true;
      const capital = Number(body.capital || requestUrl.searchParams.get("capital") || 100000);
      sendJson(response, 200, await processTriggeredWatchOrders({ execute, capital }));
      return;
    }
    if (requestUrl.pathname === "/api/paper/order") {
      const body = await readJsonBody(request);
      sendJson(response, 200, await executePaperOrder(body));
      return;
    }
    if (requestUrl.pathname === "/api/review") {
      const symbol = requestUrl.searchParams.get("symbol") || "688122";
      sendJson(response, 200, await buildAutoReview(symbol));
      return;
    }
    if (requestUrl.pathname === "/api/data-sources") {
      sendJson(response, 200, listDataSources());
      return;
    }
    if (requestUrl.pathname === "/api/device-access") {
      sendJson(response, 200, {
        localUrl: `http://localhost:${PORT}/`,
        networkUrls: localNetworkUrls(),
        host: HOST,
        port: PORT,
        note: "手机和 Windows 需要与这台 Mac 在同一个 Wi-Fi 下，使用 networkUrls 里的地址。",
      });
      return;
    }
    await serveStatic(request, response, requestUrl.pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, {
      error: error.message || "Unexpected error",
      hint: "Try a symbol like NVDA, TSLA, AAPL, MSFT, 300750, or 600519.",
    });
  }
});

server.listen(PORT, HOST, () => {
  const networkUrls = localNetworkUrls();
  console.log(`InvestGraph AI is running at http://localhost:${PORT}`);
  for (const item of networkUrls) {
    console.log(`Same Wi-Fi access: ${item.url}`);
  }
});
