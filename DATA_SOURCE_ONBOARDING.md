# 数据源申请与接入清单

目标顺序：先把 A股基础数据跑稳，再补美股授权行情和新闻事件，最后补企业级供应链与研报/一致预期。

## 1. Tushare Pro

用途：A股历史行情、复权因子、财务、公告索引、北交所补齐。

操作：

1. 打开官方站点并登录/注册：https://tushare.pro
2. 进入个人中心，找到 Pro API Token。
3. 把 token 写入本地环境变量 `TUSHARE_TOKEN`。
4. 若积分不足，优先购买能覆盖日线、复权因子、财务和公告接口的权限。

注意：手机号、验证码、密码、支付信息必须由你本人输入和确认。

## 2. Polygon / Finnhub / Intrinio

用途：美股授权行情、拆股分红、财务、公司新闻。

建议顺序：

1. Finnhub 先申请免费 API key，用于快速补新闻和基础美股数据。
2. Polygon 购买 Stocks 套餐，用于稳定行情和历史数据。
3. Intrinio 作为财务和基本面深度数据备选。

接入变量：

- `FINNHUB_API_KEY`
- `POLYGON_API_KEY`
- `INTRINIO_API_KEY`

## 3. NewsAPI / Benzinga

用途：历史新闻、实时事件、事件分类和复盘。

建议顺序：

1. NewsAPI 先申请开发者 key。
2. 若要做实时交易事件，进一步评估 Benzinga 或 Dow Jones/Bloomberg。

接入变量：

- `NEWSAPI_KEY`
- `BENZINGA_API_KEY`

## 4. Choice / Wind

用途：A股高质量财务、研报、一致预期、行业分类、宏观和机构数据。

这类通常需要销售沟通和合同授权。询价时重点确认：

- 是否允许 API 接入和本地量化研究。
- A股历史日线、复权因子、财务、公告、研报、一致预期分别覆盖几年。
- 是否覆盖北交所。
- 是否允许衍生指标、回测和内部投研系统使用。
- 个人/企业授权价格、并发限制、下载限制和续费条件。

## 5. FactSet / Bloomberg Supply Chain

用途：供应链客户/供应商关系、关系权重、上下游暴露和变化。

这类是企业级数据，通常价格较高。若短期目标是验证策略，可以先用公开年报/公告抽取供应链关系，等策略证明有效后再购买。

## 本地接入方式

复制 `.env.example` 为 `.env`，填入你已申请到的 token/key，然后用类似下面的方式启动：

```bash
set -a
source .env
set +a
node server.js
```

不要把验证码、密码、银行卡信息写入 `.env`，也不要提交到 Git。
