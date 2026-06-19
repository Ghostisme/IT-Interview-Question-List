# Order Tracking System (OTS) / 订单追踪管理系统

> A full-stack order management system with real-time AusPost/StarTrack/TNT logistics tracking and automated pricing.
>
> 全栈订单管理系统，集成 AusPost/StarTrack/TNT 实时物流追踪与自动化价格计算。

---

## Tech Stack / 技术栈

| Layer / 层级 | Technology / 技术 |
|---|---|
| Frontend / 前端 | Vite + React 19 + TypeScript + TailwindCSS v4 |
| Backend / 后端 | Python 3.11+ + FastAPI + SQLAlchemy ORM |
| Database / 数据库 | SQLite (WAL mode) — production-ready for PostgreSQL migration |
| Testing / 测试 | pytest (26 tests) + Vitest (8 tests) |
| External API / 外部 API | AusPost Shipping & Tracking API (Basic Auth) |
| Tooling / 工具链 | Axios, React Query, Lucide Icons, Pydantic v2 |

---

## Key Features / 核心功能

### Product Management / 产品管理
- Full CRUD with paginated table, search by SKU/name, and category filtering
- 完整 CRUD 操作，支持分页表格、SKU/名称搜索、分类筛选

### Order Management / 订单管理
- Create orders by selecting products — system auto-calculates line totals, subtotal, GST (10%), and total using `Decimal` precision
- 创建订单时选择产品，系统自动通过 `Decimal` 精度计算行合计、小计、GST（10%）和总计

### Logistics Tracking / 物流追踪
- Real-time tracking via AusPost API with vertical timeline visualization
- TNT integration with graceful degradation (web tracking link fallback)
- 通过 AusPost API 实现实时追踪，提供垂直时间线可视化
- TNT 集成采用优雅降级策略（回退至网页追踪链接）

### Shipping Cost Estimation / 运费估算
- Live shipping quotes from AusPost pricing API (POST /prices/items)
- Supports multiple service options (Express Post, Parcel Post, etc.)
- 通过 AusPost 定价 API 获取实时运费报价
- 支持多种服务选项（快递、标准包裹等）

### Consolidated Report / 汇总报告
- JSON report endpoint (`GET /api/orders/{id}/report`) with order header, SKU lines, tracking events, and financial summary
- JSON 报告端点，包含订单头、SKU 行项、追踪事件和财务汇总

---

## Architecture / 系统架构

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Vite + React + TS)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Products │ │  Orders  │ │Logistics │ │Shipping│ │
│  │  (CRUD)  │ │  (CRUD)  │ │(Timeline)│ │(Quote) │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       └─────────────┴────────────┴───────────┘      │
│                Axios API Layer (/api proxy)          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (RESTful)
┌──────────────────────▼──────────────────────────────┐
│                Backend (FastAPI)                     │
│  ┌────────────┐ ┌────────────┐ ┌─────────────────┐  │
│  │ /products  │ │  /orders   │ │   /tracking     │  │
│  │   router   │ │   router   │ │    router       │  │
│  └─────┬──────┘ └─────┬──────┘ └───────┬─────────┘  │
│        ▼              ▼                ▼             │
│   SQLAlchemy     PriceService     AusPost API        │
│   (SQLite DB)    (Decimal)        TNT (fallback)     │
└──────────────────────────────────────────────────────┘
```

---

## Quick Start / 快速启动

### Backend / 后端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env         # Configure API credentials / 配置 API 凭证
python seed.py               # Create DB + seed sample data / 创建数据库 + 种子数据
uvicorn main:app --reload --port 8000
```

### Frontend / 前端

```bash
cd frontend
npm install
npm run dev                  # Starts on http://localhost:5173
```

The frontend proxies `/api` requests to the backend at `http://127.0.0.1:8000`.

前端通过代理将 `/api` 请求转发到后端 `http://127.0.0.1:8000`。

---

## API Endpoints / API 端点

| Method | Endpoint | Description / 描述 |
|--------|----------|---------------------|
| GET | `/api/health` | Health check / 健康检查 |
| **Products / 产品** | | |
| GET | `/api/products` | List products (paginated, searchable) / 产品列表（分页、搜索） |
| GET | `/api/products/{sku}` | Get single product / 获取单个产品 |
| POST | `/api/products` | Create product / 创建产品 |
| PUT | `/api/products/{sku}` | Update product / 更新产品 |
| DELETE | `/api/products/{sku}` | Delete product / 删除产品 |
| **Orders / 订单** | | |
| GET | `/api/orders` | List orders (paginated, filterable, searchable) / 订单列表 |
| GET | `/api/orders/{id}` | Get order detail with items + tracking / 订单详情 |
| GET | `/api/orders/{id}/report` | Consolidated JSON report / 汇总 JSON 报告 |
| POST | `/api/orders` | Create order (auto-calculates totals) / 创建订单（自动计算） |
| PATCH | `/api/orders/{id}/status` | Update order status / 更新订单状态 |
| DELETE | `/api/orders/{id}` | Delete order (cascade) / 删除订单（级联） |
| **Tracking & Shipping / 追踪与运费** | | |
| GET | `/api/tracking/query` | Live tracking query (AusPost/TNT) / 实时物流查询 |
| POST | `/api/tracking/shipping-quote` | Get shipping cost estimates / 运费估算 |
| POST | `/api/tracking/{order_id}` | Add tracking record / 添加追踪记录 |
| GET | `/api/tracking/{order_id}` | List tracking records / 追踪记录列表 |

---

## Project Structure / 项目结构

```
backend/
  main.py              # FastAPI entry + CORS + global error handler
                       # FastAPI 入口 + CORS + 全局异常处理
  config.py            # pydantic-settings config (loads .env)
                       # 配置加载（从 .env 读取）
  database.py          # SQLAlchemy engine + session (WAL mode)
                       # 数据库引擎 + 会话（WAL 模式）
  logger.py            # Dual-channel logging (console + file)
                       # 双通道日志（控制台 + 文件）
  seed.py              # Database seeder with sample data
                       # 数据库种子脚本
  models/
    db_models.py       # 5 ORM models (Product, Order, OrderItem, Tracking, TrackingEvent)
    schemas.py         # Pydantic request/response schemas with validation
  routers/
    products.py        # Product CRUD endpoints
    orders.py          # Order CRUD + report endpoint
    tracking.py        # Tracking query + shipping quote endpoints
  services/
    price_service.py   # Decimal-precision financial calculations
                       # Decimal 精度金融计算
    auspost_service.py # AusPost API client (Basic Auth)
    tnt_service.py     # TNT tracking (degraded mode)
  tests/               # 26 pytest test cases

frontend/
  src/
    main.tsx           # React entry + QueryClientProvider + BrowserRouter
    App.tsx            # Route definitions (5 pages)
    lib/api.ts         # Axios API client with error interceptor
    types/index.ts     # TypeScript interfaces
    components/
      Layout.tsx       # Sidebar navigation layout
      StatusBadge.tsx  # Color-coded status badge (with tests)
      Skeleton.tsx     # Loading skeleton components (with tests)
    pages/
      ProductsPage.tsx     # Product CRUD management / 产品管理
      OrdersPage.tsx       # Order CRUD management / 订单管理
      OrderDetailPage.tsx  # Order detail + tracking timeline / 订单详情
      ShippingPage.tsx     # Shipping quote + tracking tools / 运费工具
      LogisticsPage.tsx    # Logistics timeline visualization / 物流时间线
```

---

## Testing / 测试

```bash
# Backend — 26 test cases / 后端 — 26 个测试用例
cd backend
python -m pytest tests/ -v

# Frontend — 8 test cases / 前端 — 8 个测试用例
cd frontend
npx vitest run
```

| Test Suite / 测试套件 | Coverage / 覆盖范围 |
|---|---|
| `test_products.py` | Product CRUD endpoints / 产品 CRUD 端点 |
| `test_orders.py` | Order creation, status update, price calculation / 订单创建、状态、价格 |
| `test_price_service.py` | Decimal-precision financial calculations / 金融计算精度 |
| `test_tracking.py` | Tracking endpoints / 追踪端点 |
| `StatusBadge.test.tsx` | Status badge rendering / 状态徽章渲染 |
| `Skeleton.test.tsx` | Skeleton loading components / 骨架屏组件 |

---

## Security Design / 安全设计

| Aspect / 层面 | Implementation / 实现 |
|---|---|
| Credentials / 凭证 | `.env` file (excluded from Git via `.gitignore`) / `.env` 文件管理 |
| SQL Injection / SQL 注入 | SQLAlchemy ORM parameterized queries / ORM 参数化查询 |
| API Security / API 安全 | CORS whitelist + Pydantic input validation / CORS 白名单 + 输入校验 |
| Error Handling / 错误处理 | Global exception handler — no stack traces leaked / 全局异常处理器 |
| External API / 外部 API | Credentials from env vars, all calls via HTTPS / 环境变量注入 + HTTPS |

### Environment Setup / 环境配置

1. Copy `.env.example` to `.env` in `backend/` / 复制 `.env.example` 为 `.env`
2. Fill in credentials / 填入凭证:
   - `AUSPOST_API_KEY` / `AUSPOST_PASSWORD` — AusPost shipping & tracking
   - `CORS_ORIGINS` — Allowed frontend origins (comma-separated)
3. Never commit `.env` to version control / 切勿将 `.env` 提交到版本控制

---

## Technical Highlights / 技术亮点

| Highlight / 亮点 | Detail / 详情 |
|---|---|
| **Decoupled Architecture** / 前后端解耦 | React SPA communicates with FastAPI via RESTful API, fully independent deployment / React SPA 通过 RESTful API 与 FastAPI 通信，支持独立部署 |
| **Financial Precision** / 金融精度 | All price calculations use Python `Decimal` to avoid floating-point errors / 所有价格计算使用 `Decimal` 避免浮点误差 |
| **GST Back-Calculation** / GST 反算 | Australian GST extracted from inclusive prices: `GST = subtotal × 10 / 110` / 从含税价反推 GST |
| **Graceful Degradation** / 优雅降级 | TNT API unreliable → automatic fallback to web tracking links / TNT API 不稳定 → 自动回退至网页追踪 |
| **Cascade Integrity** / 级联完整性 | Deleting an order automatically removes line items and tracking records / 删除订单自动清理关联数据 |
| **Dual Logging** / 双通道日志 | Console (colored) + file (`logs/app.log`) with structured log levels / 控制台（彩色）+ 文件持久化 |
| **Optimistic UI** / 乐观更新 | React Query mutation + invalidation for instant feedback / 操作后即时刷新 |

---

## Assumptions / 假设说明

- **RRP pricing** — All product RRP values are in USD ($) and include GST (10% Australian GST)
  / RRP 单价为美元，已含 10% 澳大利亚 GST
- **AusPost API** — Uses the test/sandbox environment; switch URL for production
  / 使用测试环境；生产部署需切换 URL
- **TNT integration** — Degraded mode due to API auth issues; provides web tracking links
  / 因 API 认证问题采用降级模式，提供网页追踪链接
- **Product data source** — Catalog seeded from Google Apps Script SQL queries via `seed.py`
  / 产品目录通过 Google Apps Script SQL 查询 + `seed.py` 导入
- **SQLite** — Suitable for dev/small-scale; migrate to PostgreSQL via `DATABASE_URL` for production
  / 适用于开发/小规模；生产环境通过修改 `DATABASE_URL` 迁移至 PostgreSQL
