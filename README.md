# InvestGraph AI

一个零依赖本地 MVP，用来研究股票异动、上下游产业链、新闻催化和候选公司排序。

## 运行

```bash
node server.js
```

打开：

```text
http://localhost:4173
```

同一 Wi-Fi 下的手机/Windows 需要访问页面里显示的局域网地址，例如 `http://192.168.x.x:4173/`。这要求 Mac 一直开着，并保持 `node server.js` 或 `Start InvestGraph.command` 窗口运行。

## 云端部署

如果要让 MacBook、iPhone、Windows 在任何地方都能访问，需要把服务部署到云端。当前项目已准备好 Render Blueprint：

- `package.json`：云端启动命令 `npm start`。
- `render.yaml`：Render Web Service 配置、健康检查、持久数据目录 `/var/data`。
- `/api/health`：部署平台健康检查。
- `APP_USERNAME` / `APP_PASSWORD`：云端访问密码保护。

Render 操作：

1. 把本项目推到 GitHub。
2. 打开 Render Dashboard，选择 Blueprint，指向仓库根目录的 `render.yaml`。
3. 填入至少这些环境变量：
   - `APP_PASSWORD`：访问密码，必须设置。
   - `FINNHUB_API_KEY`：美股新闻/基础数据增强。
   - `NEWSAPI_KEY`：新闻增强。
   - `AI_API_KEY`、`AI_MODEL`：可选，用于大模型证据审阅。
4. 部署完成后访问 Render 给的 `https://*.onrender.com` 链接。

注意：Render 的持久磁盘需要付费实例。没有持久磁盘时，`data/` 里的自选股、模拟盘、报告历史可能在重启/重新部署后丢失。后续若要更正式，建议把数据层迁到 Supabase/PostgreSQL。

可尝试的输入，A股和美股都作为核心市场：

- `688122` 或 `688122.SH`
- `688981` 或 `688981.SH`
- `300750` 或 `300750.SZ`
- `600519` 或 `600519.SH`
- `830799` 或 `920002.BJ`
- `NVDA`
- `BRK.B`
- `TSLA`
- `AAPL`
- `MSFT`

## 当前能力

- A股覆盖沪市、深市、创业板、科创板和北交所；拉取腾讯/新浪日线、东方财富公司概况、财务报表、资讯和公告。
- 美股拉取 Yahoo Finance 公共图表数据，计算 5日、1月、3月、1年表现、成交量倍数、波动率和最大回撤。
- 美股拉取 Yahoo Finance RSS、Google News RSS 和 GDELT 新闻。
- 对美股尝试接入 SEC EDGAR companyfacts，补充收入增长、净利率、资产负债率等事实。
- 使用内置产业链知识库和 A股行业模板，展示上游、下游、同行/替代公司。
- 对目标公司和产业链公司做研究排序，分解动量、催化、关系强度、质量、估值和风险。
- 输出看多理由、看空风险和下一步验证清单。
- V2 已加入本地 Watchlist 自选股、报告历史和每日简报，数据保存在 `data/` 目录。
- V3 已加入证据分级 / AI 审核：把新闻和公告拆成硬事实、软催化、市场解读和待核实传闻，并给出必须核实的问题。
- V4 已加入赚钱系统工作台：回测、信号胜率/赔率统计、策略模板、买卖点/仓位、风险控制、Paper Trading、自动复盘和数据源缺口清单。
- V5 免费源模式已加入每日推荐候选：扫描自选股中的 A股和美股，按技术、证据、财务质量、回测和风险扣分排序，只给研究/模拟建议，不自动真实下单。

## 赚钱系统工作台

当前策略模板：

- 放量突破
- 趋势跟随
- 强势回踩
- 超跌修复

可用接口：

- `GET /api/backtest?symbol=688122&strategy=trend_following&years=5`
- `GET /api/trade-plan?symbol=688122&strategy=trend_following&capital=100000`
- `GET /api/daily-picks?limit=12&capital=100000`
- `GET /api/paper`
- `POST /api/paper/recommend`
- `POST /api/paper/order`
- `GET /api/review?symbol=688122`
- `GET /api/data-sources`

注意：当前回测优先使用免费日线数据。它能帮助淘汰明显不靠谱的信号，但还不能证明实盘可稳定盈利。

## 可选 AI 增强

默认使用本地证据引擎，不需要 API key。若要让大模型进一步审阅证据，可启动前配置：

```bash
AI_API_KEY=... AI_MODEL=... node server.js
```

也可以通过 `AI_API_URL` 指向兼容 OpenAI Responses 风格的接口。

## 付费数据源接入

申请顺序和本地环境变量模板见 `DATA_SOURCE_ONBOARDING.md` 与 `.env.example`。

当前免费增强源也支持 Finnhub。生成新的 Finnhub API key 后，把它写入本地 `.env`：

```bash
FINNHUB_API_KEY=你的新key
```

重启 `node server.js` 后，美股会额外使用 Finnhub 补充公司新闻、公司资料和基础财务。

NewsAPI 也可作为免费新闻增强源：

```bash
NEWSAPI_KEY=你的新key
```

配置后系统会把 NewsAPI 新闻并入 A股/美股新闻流，用于事件证据评分和每日推荐。

## 数据说明

这是一版研究原型，不是投资建议。当前行情与新闻源适合个人研究和产品验证；如果要商业化，需要替换为授权数据源，例如 Polygon/Massive、Finnhub、Tushare、Choice、Wind、FactSet Supply Chain 或交易所公告源。

若目标是严肃实盘或验证年化 50%+ 这类高目标，建议优先购买或接入：

- A股：Tushare Pro、Choice 或 Wind，用于 5 年以上历史行情、复权因子、财务、公告、研报和一致预期。
- 美股：Polygon、Finnhub、Intrinio 或 Nasdaq Data Link，用于授权行情、拆股分红、财务和新闻。
- 新闻/事件：NewsAPI、Benzinga、Dow Jones、Bloomberg 或同类源，用于历史新闻时间戳和事件分类。
- 供应链：FactSet 或 Bloomberg Supply Chain，用于客户/供应商关系和关系权重。

## 后续建议

- 接入正式行情源和新闻源。
- 把产业链关系存入数据库，支持关系强度、证据来源和时间戳。
- 进一步增强 LLM 服务层，让 AI 阅读更多新闻原文和公告原文并给出带引用的结论。
- 把 Paper Trading 扩展成定时任务，每天自动生成建议、模拟成交并复盘。
- 对接用户自己的交易/持仓数据，展示组合在产业链和因子上的集中风险。
