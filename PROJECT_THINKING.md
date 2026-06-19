# Project Thinking Document / 项目思考过程文档

## Order Tracking System (OTS) / 订单追踪管理系统

---

## 1. Background & Goals / 项目背景与目标

### Problem / 问题

The client operated order and product management workflows scattered across Google Sheets, manual SQL queries, and disconnected tracking tools. Key pain points included:

客户的订单和产品管理流程分散在 Google Sheets、手动 SQL 查询和各种互不关联的追踪工具中。核心痛点包括：

- Manual price calculations prone to errors / 手动价格计算容易出错
- No unified view of order details, SKU data, and tracking / 缺少订单、SKU 和物流的统一视图
- Multiple tools needed to check shipment status / 需要多个工具查看物流状态

### Solution / 解决方案

Built a **full-stack web application** that consolidates all operations into a single system with automated calculations and real-time tracking.

构建了一个**全栈 Web 应用**，将所有操作整合到单一系统中，实现自动化计算和实时追踪。

| Component / 组件 | Choice / 选择 | Rationale / 理由 |
|---|---|---|
| Frontend / 前端 | Vite + React + TypeScript | Fast dev server, type safety, modern DX / 快速开发、类型安全 |
| Backend / 后端 | Python + FastAPI | Async support, auto-generated docs, Pydantic validation / 异步支持、自动文档 |
| Database / 数据库 | SQLite + SQLAlchemy ORM | Zero-config, portable, ORM abstraction for future migration / 零配置、可迁移 |
| UI Framework / UI 框架 | TailwindCSS v4 | Utility-first, rapid iteration, consistent design / 原子化CSS、快速迭代 |
| State Management / 状态管理 | React Query (TanStack) | Server state caching, background refetch, optimistic updates / 服务端缓存、乐观更新 |

---

## 2. Key Design Decisions / 核心设计决策

### 2.1 Data Source Strategy / 数据来源策略

**Challenge** — The original data lived in a Google Apps Script Web App that only works as a browser UI (uses `google.script.run`), not as a callable REST API.

**挑战** — 原始数据存在于 Google Apps Script Web App 中，仅作为浏览器 UI 工作，无法作为 REST API 调用。

**Decision** — "Import once, run locally" approach:

**决策** — "一次导入，本地运行"策略：

1. User executes SQL queries in the Google Apps Script browser UI / 用户在浏览器中执行 SQL 查询
2. Results are provided as JSON to the system / 将结果以 JSON 格式提供给系统
3. `seed.py` imports data into local SQLite database / `seed.py` 将数据导入本地 SQLite
4. All subsequent operations use the local database / 后续所有操作使用本地数据库

**Why** — This approach preserves data collection flexibility while eliminating runtime dependency on external services.

**原因** — 保留了数据采集灵活性，同时消除了对外部服务的运行时依赖。

### 2.2 Price Calculation System / 价格计算体系

**Key insight** — RRP prices are in USD and already include GST. The assessment specification defines the calculation formula explicitly:

**关键发现** — RRP 价格为美元且已含 GST。考题明确定义了计算公式：

```
line_total = unit_price (RRP) × quantity
subtotal   = Σ line_totals
gst        = subtotal × 10%            ← per assessment: "GST = 10% of Subtotal"
total      = subtotal + gst + shipping_fee
```

> **Design decision note / 设计决策说明**: The initial implementation used GST back-calculation (`subtotal × 10/110`), which is more accurate from an Australian tax perspective (since RRP already includes GST). However, this was revised to match the assessment's literal formula (`GST = 10% of Subtotal`, `Total = Subtotal + GST + Shipment Fee`) to ensure the output exactly matches the expected results. This trade-off prioritizes assessment compliance over tax-accounting precision.
>
> 初始实现使用了 GST 反算（`subtotal × 10/110`），从澳大利亚税制角度更准确。但为了确保输出与考题预期完全一致，已修正为考题字面公式。这一取舍优先考虑了考题合规性。

All calculations use Python `Decimal` type for financial precision, avoiding floating-point rounding issues.

所有计算使用 Python `Decimal` 类型确保金融精度，避免浮点舍入问题。

### 2.3 External API Integration / 外部 API 集成

| API | Status / 状态 | Approach / 方案 |
|---|---|---|
| AusPost Tracking / 追踪 | ✅ Working / 可用 | Basic Auth + Account-Number header, GET `/track` |
| AusPost Pricing / 报价 | ✅ Working / 可用 | Basic Auth, POST `/prices/items` with JSON body |
| TNT Tracking / 追踪 | ⚠️ Degraded / 降级 | API returns 500/401 → fallback to web tracking link |
| TNT Pricing / 报价 | ⚠️ Degraded / 降级 | XML schema issues → fallback to AusPost pricing |

**AusPost authentication discovery** — Initial attempt with `AUTH-KEY` header failed. Testing revealed the API requires HTTP Basic Auth (`API_KEY:PASSWORD` base64-encoded) plus an `Account-Number` header.

**AusPost 认证发现** — 最初使用 `AUTH-KEY` header 失败。测试发现 API 需要 HTTP Basic Auth + `Account-Number` header。

**Graceful degradation philosophy** — Rather than blocking on unreliable third-party services, the system provides alternative access methods (web links for TNT tracking). Users can still track packages; just through browser redirect instead of in-app display.

**优雅降级理念** — 不阻塞于不可靠的第三方服务，系统提供替代访问方式。用户仍可追踪包裹，只是通过浏览器跳转而非应用内展示。

### 2.4 Frontend Design Philosophy / 前端设计理念

Designed for international/Western aesthetic preferences:

采用国际化/西方审美风格设计：

| Principle / 原则 | Implementation / 实现 |
|---|---|
| Minimalism / 极简主义 | Generous whitespace, moderate information density, card-based layout / 大量留白、卡片布局 |
| Information Hierarchy / 信息层级 | Font size and color depth differentiate primary vs secondary info / 字体大小和颜色区分主次 |
| Neutral Palette / 中性色调 | Gray-based with blue accent for key actions / 灰色系 + 蓝色点缀 |
| Micro-interactions / 微交互 | Hover effects, focus rings, smooth transitions / 悬停效果、过渡动画 |
| Responsive / 响应式 | Grid/Flex layout adapts to different screen sizes / Grid/Flex 适配不同屏幕 |

### 2.5 Database Design / 数据库设计

```
products ────── orders ─┬── order_items  (assigned_tracking, image_url)
                        │
                        └── tracking  (tracking_label) ──── tracking_events
```

**Product model extended to match real API data / Product 模型扩展以匹配真实 API 数据**:

The Google Apps Script SQL query returns product data with unit-suffixed values (e.g. `"10.0mm"`, `"0.2kg"`, `"1000.0mm³"`). The Product model was expanded to store all these fields:

Google Apps Script SQL 查询返回的产品数据带有单位后缀。Product 模型已扩展以存储所有字段：

| New Field / 新字段 | Source Example / 数据源示例 | Purpose / 用途 |
|---|---|---|
| `length/width/height` | `"10.0mm"` → `10.0` | Package dimensions for shipping fee calculation / 包裹尺寸用于运费计算 |
| `volume` | `"1000.0mm³"` → `1000.0` | Volumetric weight fallback / 体积重量计算 |
| `volumetric_gross_weight` | `"0.2kg"` → `0.2` | Shipping weight in kg / 运输重量 |
| `barcode` | `"998855"` | Product identification / 产品条码 |
| `dosage_type` | `"Pastille"` | Product classification / 产品剂型 |
| `image_url` | placeholder URL | SKU image display in order detail / 订单详情中 SKU 图片展示 |

**Order model extended / 订单模型扩展**:

| New Field / 新字段 | Assessment Requirement / 考题要求 |
|---|---|
| `company_name` | "V22 Dispensary" / "Cann Life Dispensary" — listed as a separate field in the assessment |
| `customer_phone` | "0481 735 488" / "0411 547 288" — explicitly shown in the order header |
| `OrderItem.assigned_tracking` | Links each SKU line to its Track label (e.g. "Track 1") — assessment defines SKU ↔ Track mapping |
| `OrderItem.image_url` | Snapshot of product image at order time / 订单时产品图片快照 |
| `Tracking.tracking_label` | "Track 1", "Track 2", "Track 3" — assessment uses these labels |

**Data parsing fault tolerance / 数据解析容错**:

A `utils.py` module provides `parse_numeric()` which strips unit suffixes and handles null/empty/malformed values gracefully:

`utils.py` 模块提供 `parse_numeric()` 函数，可剥离单位后缀并优雅处理空值/异常格式：

```python
parse_numeric("10.0mm")      → 10.0
parse_numeric("0.2kg")       → 0.2
parse_numeric("1000.0mm³")   → 1000.0
parse_numeric("nullDays")    → 0.0  (default)
parse_numeric(None)           → 0.0  (default)
```

| Design Choice / 设计决策 | Rationale / 理由 |
|---|---|
| CASCADE deletes / 级联删除 | Deleting an order auto-removes items and tracking / 删除订单自动清理关联数据 |
| Composite indexes / 复合索引 | `(status, created_at)` accelerates order list queries / 加速订单列表查询 |
| WAL mode / WAL 模式 | Improved concurrent read/write performance / 提升并发读写性能 |
| Foreign key enforcement / 外键约束 | `PRAGMA foreign_keys = ON` ensures referential integrity / 确保引用完整性 |

### 2.6 Security Design / 安全设计

| Layer / 层面 | Measure / 措施 |
|---|---|
| Sensitive data / 敏感数据 | `.env` file + `.gitignore` exclusion / `.env` 文件 + `.gitignore` 排除 |
| SQL Injection / SQL 注入 | SQLAlchemy ORM parameterized queries — no raw SQL concatenation / ORM 参数化查询 |
| API Security / API 安全 | CORS whitelist + Pydantic input validation / CORS 白名单 + 输入校验 |
| Error Leakage / 错误泄露 | Global exception handler returns generic messages / 全局异常处理器，不暴露堆栈 |
| External Credentials / 外部凭证 | `pydantic-settings` type-safe env var loading / 类型安全的环境变量加载 |

### 2.7 B-side vs C-side Module Positioning / B 端与 C 端模块定位分析

#### The Question / 核心问题

Are Products, Orders, and Shipping Tools enterprise-internal (B-side) modules, while Logistics is a consumer-facing (C-side) module? Does this align with the assessment requirements and real-world architecture?

Products、Orders、Shipping Tools 是面向企业内部的 B 端模块，而 Logistics 是面向终端消费者的 C 端模块——这种划分是否符合考题要求和真实业务场景？

#### Module Classification / 模块分类

| Module / 模块 | Classification / 定位 | Rationale / 依据 |
|---|---|---|
| **Products** | Pure B-side / 纯 B 端 | Product catalog management (SKU, pricing, inventory) is a back-office operation never exposed to end consumers / 产品目录管理属于后台运营，不会暴露给终端消费者 |
| **Orders** | Pure B-side / 纯 B 端 | Order creation, status management, and price calculation are internal business workflows; C-side users can only view their own orders, not perform CRUD / 订单 CRUD 是内部业务流，C 端用户最多只能查看自己的订单 |
| **Shipping Tools** | Pure B-side / 纯 B 端 | Shipping cost estimation and batch tracking queries are warehouse/operations staff tools; C-side users don't manually input postcodes and parcel dimensions / 运费估算是仓库运营人员的内部工具 |
| **Logistics** | B/C Hybrid (C-side UI, B-side data) / B/C 混合体 | The timeline visualization mimics AusPost's consumer-facing tracking experience, but the current implementation allows browsing all orders (B-side behavior) / 时间线 UI 模仿了 C 端体验，但数据权限仍是 B 端模式 |

#### Why Logistics is a Hybrid, Not Pure C-side / 为什么 Logistics 是混合体而非纯 C 端

Based on AusPost's official architecture ([StarTrack Fact Sheet](https://auspost.com.au/content/dam/auspost_corp/media/documents/startrack-fact-sheet-improving-your-customers-track-experience.pdf), [AusPost Developer Centre](https://auspost.com.au/integrate-shipping-and-tracking-apis)), logistics tracking in real-world systems has two distinct layers:

根据 AusPost 官方架构，物流追踪在真实系统中分为两层：

**B-side (Enterprise Internal) / B 端（企业内部）**：
- Operations staff manage all parcels via Business Support Portal (BSP) or MyStarTrack Online / 运营人员通过 BSP 或 MyStarTrack Online 管理全部包裹
- Bulk tracking, recall, redirect capabilities / 批量追踪、召回、重定向
- Full visibility across all orders / 可见全量订单

**C-side (Consumer) / C 端（消费者）**：
- Customers query a single tracking number via AusPost App or `auspost.com.au/track` / 客户通过 App 或网页输入单个追踪号
- Can only see their own package / 只能看到自己的包裹
- Self-service features: Safe Drop, Redirect / 自助服务功能
- No login required / 无需登录

**Current Logistics module status / 当前 Logistics 模块状态**：
- ✅ UI presentation → Mimics C-side timeline experience / UI 呈现模仿 C 端时间线
- ⚠️ Data permissions → Can browse all orders (B-side behavior) / 可浏览所有订单（B 端行为）
- ⚠️ Entry method → Dropdown order selector (B-side), not tracking number input (C-side) / 下拉选择器（B 端），而非追踪号输入（C 端）

#### Alignment with Assessment Requirements / 与考题的匹配度

The original assessment requirements specify:

考题原始要求：

> 1. A script/application that reads order files, SKU files, calculates Subtotal/GST/Total, retrieves tracking via API, estimates shipping fees
> 2. A simple output view (console, web page, or JSON) showing order header, SKU lines, tracking info, financial summary

**The assessment is fundamentally a B-side internal tool** — all 4 provided images and deliverables target an internal operations perspective. There is no mention of user authentication, customer self-service portals, or B2C interfaces.

**考题本质上是一个纯 B 端内部工具** — 4 张图片和交付物均指向企业内部操作人员视角，未涉及用户认证、客户自助门户或 B2C 界面。

| Dimension / 维度 | Assessment Req. / 考题要求 | Implementation / 当前实现 | Evaluation / 评价 |
|---|---|---|---|
| Core features / 核心功能 | Data reading + calculation + tracking + output | ✅ Fully covered / 完全覆盖 | Meets requirements / 满足要求 |
| Output format / 输出方式 | "console, web page, or JSON" | ✅ Web + JSON endpoint | Exceeds expectations / 超出预期 |
| Architecture / 架构 | Not explicitly required | ✅ Full-stack + REST API + ORM | **Highlight**: architectural capability / 展示架构能力 |
| Module separation / 模块划分 | Not explicitly required | ✅ 4 independent modules | **Highlight**: modular thinking / 模块化思维 |
| B/C-side awareness / B/C 端意识 | Not explicitly required | ✅ Proactively identified | **Bonus**: business understanding / 业务理解力 |

#### Real-World Industry Practice / 真实场景行业实践

Based on industry research ([Shopify B2B Architecture](https://www.shopify.com/enterprise/blog/b2b-ecommerce-software-architecture), [Emporix OMS Guide](https://www.emporix.com/blog/order-management-system-b2b-guide), [Infios OMS](https://www.infios.com/en/supply-chain-solutions/order-management-and-commerce-engagement)), production OMS systems adopt a B/C separation architecture:

根据行业研究，生产级 OMS 系统采用 B/C 分离架构：

```
┌──────────────────────────────────────────────────┐
│         B-side — Enterprise Back-office            │
│         B 端 — 企业后台                             │
│  Products (CRUD) │ Orders (CRUD)                   │
│  Shipping Tools  │ Batch Tracking                  │
│  Reports / Analytics │ Inventory                   │
│  → Requires login + role-based permissions         │
│  → 需要登录 + 角色权限                              │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│         C-side — Customer Portal                   │
│         C 端 — 客户门户                             │
│  Order inquiry (own orders only)                   │
│  Tracking (by tracking number)                     │
│  Self-service (Safe Drop / Redirect)               │
│  → Public or customer login                        │
│  → 公开访问或客户登录                                │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│         Shared Layer — Backend API                  │
│         共享层 — 后端 API                           │
│  FastAPI / Node.js                                 │
│  Database + External APIs (AusPost/TNT)            │
│  → API permissions differentiate B/C data scope    │
│  → 通过 API 权限区分 B/C 端数据范围                  │
└──────────────────────────────────────────────────┘
```

#### Conclusion / 结论

1. **The B/C-side classification is directionally correct** — Products, Orders, Shipping Tools are B-side; Logistics UI leans C-side
   / **B/C 端划分方向正确** — Products、Orders、Shipping Tools 是 B 端；Logistics UI 偏 C 端

2. **The assessment itself is a pure B-side scenario** — all requirements target internal operations staff
   / **考题本身是纯 B 端场景** — 所有需求指向内部运营人员

3. **The Logistics module is a deliberate hybrid** — C-side UI style + B-side data model, demonstrating that the same data can serve different audiences through different presentation layers
   / **Logistics 是刻意的混合体** — C 端 UI + B 端数据模型，展示同一数据可通过不同呈现层服务不同受众

4. **To convert to a true C-side module**, it would need: tracking number input (instead of order dropdown), removal of internal data (phone, email), and public access without login
   / **转换为真正 C 端**需要：追踪号输入、移除内部信息、无需登录

5. **Interview positioning** — "The system is built as a B-side internal tool (matching assessment requirements), but the Logistics module's timeline UI references AusPost's consumer-facing tracking experience. Extending it to a C-side portal would only require adding permission isolation and a tracking number query entry point."
   / **面试定位** — "系统以 B 端内部工具为核心（符合考题），Logistics 的时间线 UI 参考了 AusPost C 端体验，扩展为 C 端门户只需增加权限隔离和追踪号入口。"

### 2.8 Assessment Data Alignment / 考题数据对齐

After a thorough gap analysis comparing the assessment specification against the implementation, the following corrections were made to ensure exact data fidelity:

在对考题规格与实现进行全面差距分析后，做了以下修正以确保数据完全一致：

**Seed data corrected to match assessment / 种子数据修正为考题原始数据**:

| Field / 字段 | Before (generic) / 之前（通用） | After (assessment-exact) / 之后（考题精确） |
|---|---|---|
| Order 1 Address | 45 Oxford St, Sydney NSW 2000 | 125 Toorak Road, South Yarra VIC 3141 |
| Order 2 Address | 120 Collins St, Melbourne VIC 3000 | 381 Smith Street, Fitzroy VIC 3065 |
| Order 1 Email | jason@v22dispensary.com | Jason@aerishealth.au |
| Order 2 Email | bella@cannlife.com | Bella@aerishealth.au |
| Track 1 Number | ABC123456789 | 2FWZ50008569 |
| Track 2 Number | DEF987654321 | 2FWZ50008645 |
| Track 3 Number | GHI111222333 | 305506914 |
| Shipping origin | 2000 (Sydney) | 2111 (Ryde, NSW) |
| Company Name | *(missing)* | V22 Dispensary / Cann Life Dispensary |
| Phone | *(missing)* | 0481 735 488 / 0411 547 288 |

**SKU ↔ Track mapping added / SKU 与 Track 对应关系**:

```
Order 1 (PO-20251130-00072):
  Track 1 (2FWZ50008569, StarTrack) ← TBAMET10×3, TBAMET28×1, TBOPAL28×1, HARNIG×4, LELCBD100×6

Order 2 (PO-20251202-00046):
  Track 2 (2FWZ50008645, StarTrack) ← AURPUR10×10
  Track 3 (305506914, TNT)          ← HALGEO15×1, MCMW10×2, MCBO30×3
```

**Frontend layout aligned to assessment sample / 前端布局对齐考题样例**:

The OrderDetailPage was redesigned from a single-column vertical stack to a **two-column layout** matching the assessment's sample screenshot:

OrderDetailPage 从单列纵向堆叠重新设计为**左右两列布局**，匹配考题样例截图：

- **Left column (3/5)**: Order header (company, customer, phone, email, address, date), SKU line items with product images and Track labels, financial summary (Subtotal + GST 10% + Shipment Fee = Total)
- **Right column (2/5)**: Logistics tracking timeline for each tracking record, with carrier info, tracking label, status badge, estimated delivery, current location, and event history

- **左列 (3/5)**：订单头部（公司、客户、电话、邮箱、地址、日期）、带产品图片和 Track 标签的 SKU 行项、财务汇总
- **右列 (2/5)**：每个追踪记录的物流时间线，含承运商、追踪标签、状态、预计送达、当前位置和事件历史

**SKU image display with fault tolerance / SKU 图片展示（含容错）**:

Each SKU line item now displays a product image. A `ProductImage` component handles loading failures gracefully — if the image URL fails to load, it falls back to a placeholder icon instead of showing a broken image.

每个 SKU 行项现在显示产品图片。`ProductImage` 组件优雅处理加载失败——图片 URL 加载失败时回退为占位图标。

---

## 3. Challenges & Solutions / 问题与解决

### Environment Issues / 环境问题

| Problem / 问题 | Root Cause / 原因 | Solution / 解决 |
|---|---|---|
| `vite create` generated vanilla TS instead of React | Vite CLI template selection anomaly | Manually installed React dependencies / 手动安装 React 依赖 |
| `tsconfig.json` baseUrl deprecation warning | TypeScript version update | Removed baseUrl/paths, used relative imports / 移除配置，改用相对路径 |
| Vite proxy `ECONNREFUSED ::1:8000` | IPv6 loopback unreachable on Windows | Changed proxy target to `http://127.0.0.1:8000` / 改为 IPv4 |
| Port 8000 already in use | Previous background process not terminated | Found PID via `Get-NetTCPConnection` and killed / 查找并终止进程 |
| `seed.py` cannot delete `app.db` | File locked by uvicorn process | Used ORM `drop_all/create_all` instead / 使用 ORM 重建表 |

### API Integration Issues / API 集成问题

| Problem / 问题 | Root Cause / 原因 | Solution / 解决 |
|---|---|---|
| AusPost pricing returns 405 | Used GET instead of required POST | Changed to POST with JSON body / 改为 POST + JSON body |
| AusPost auth failure | API requires Basic Auth, not AUTH-KEY header | Switched to Basic Auth + Account-Number / 切换认证方式 |
| TNT API 500/401 errors | Test environment credentials unstable | Degraded to web tracking links / 降级为网页追踪链接 |
| Google Apps Script not a REST API | It's a browser-side UI | Manual query + JSON seed import / 手动查询 + JSON 导入 |

### Assessment Compliance Issues / 考题合规问题

| Problem / 问题 | Root Cause / 原因 | Solution / 解决 |
|---|---|---|
| GST formula mismatch / GST 公式不匹配 | Used `subtotal×10/110` (back-calc) instead of `subtotal×10%` (assessment spec) | Changed to `subtotal × 0.10` and `total = subtotal + gst + shipping_fee` / 改为考题公式 |
| Missing order fields / 订单字段缺失 | Model lacked `company_name`, `customer_phone` | Added to Order model, schemas, and frontend / 增加到模型、schema 和前端 |
| No SKU images / 无 SKU 图片 | Product model lacked `image_url` | Added field + placeholder URLs + fault-tolerant `ProductImage` component / 增加字段 + 容错图片组件 |
| No SKU-Track association / 无 SKU-Track 关联 | OrderItem lacked `assigned_tracking` | Added field + Track label display in UI / 增加字段 + UI 展示 |
| Tracking numbers incorrect / 追踪号不一致 | Seed used generic numbers (ABC123...) | Replaced with assessment's exact numbers (2FWZ50008569, etc.) / 改为考题精确追踪号 |
| Wrong addresses/postcodes / 地址邮编错误 | Seed used generic Sydney addresses | Corrected to Toorak Road VIC 3141 / Smith Street VIC 3065 / 修正为考题地址 |
| Single-column layout / 单列布局 | OrderDetailPage used vertical stack | Redesigned to two-column (3:2) matching sample screenshot / 重新设计为左右两列 |
| Default postcode not 2111 / 默认邮编非 2111 | ShippingPage defaulted to 2000 (Sydney) | Changed to 2111 (Ryde, NSW) per assessment / 改为 2111 |
| API data unit suffixes / API 数据单位后缀 | Google Script returns `"10.0mm"`, `"0.2kg"` | Created `utils.py` with `parse_numeric()` for fault-tolerant parsing / 创建容错解析工具 |

---

## 4. Testing Strategy / 测试策略

### Backend Tests (pytest) / 后端测试

| Test File / 测试文件 | Coverage / 覆盖范围 |
|---|---|
| `test_products.py` | Product CRUD endpoints / 产品 CRUD 端点 |
| `test_orders.py` | Order creation, status updates, price calculation / 订单创建、状态、价格 |
| `test_price_service.py` | Decimal-precision financial calculation unit tests / 金融计算精度单元测试 |
| `test_tracking.py` | Tracking endpoints / 追踪端点 |

**28 test cases** using in-memory SQLite for isolation (including order report and shipping fee tests) / **28 个测试用例**，使用内存数据库隔离（含订单报告和运费测试）

### Frontend Tests (Vitest) / 前端测试

| Test File / 测试文件 | Coverage / 覆盖范围 |
|---|---|
| `StatusBadge.test.tsx` | Status badge color-coding and rendering / 状态徽章渲染 |
| `Skeleton.test.tsx` | Skeleton loading component behavior / 骨架屏组件 |

**8 test cases** using React Testing Library / **8 个测试用例**，使用 React Testing Library

### Logging / 日志机制

Dual-channel logging output / 双通道日志输出：
- **Console** — Colored real-time logs for development / 控制台 — 彩色实时日志
- **File** (`logs/app.log`) — Persistent logs for production traceability / 文件 — 持久化日志

---

## 5. Summary / 总结

### Value Delivered / 交付价值

| Before / 之前 | After / 之后 |
|---|---|
| Scattered workflows across Google Sheets and manual tools / 散落在 Google Sheets 和手动工具中 | Unified web application with single sign-on view / 统一的 Web 应用 |
| Manual price calculations / 手动价格计算 | Automated Decimal-precision calculations / 自动化 Decimal 精度计算 |
| Copy-paste tracking numbers into carrier websites / 手动粘贴追踪号到承运商网站 | Real-time in-app tracking with timeline visualization / 应用内实时追踪 + 时间线 |
| No shipment cost visibility until invoice / 发货前无运费可见性 | Instant AusPost shipping quotes / 即时 AusPost 运费报价 |
| No data persistence / 无数据持久化 | Full CRUD with SQLite database / 完整 CRUD + SQLite 数据库 |

### Technical Achievements / 技术成就

- **Full-stack architecture** — React SPA + FastAPI backend, fully decoupled via RESTful API
  / **全栈架构** — React SPA + FastAPI 后端，通过 RESTful API 完全解耦
- **Financial precision** — Decimal arithmetic ensures accurate GST calculation per assessment formula (`GST = Subtotal × 10%`, `Total = Subtotal + GST + Shipment Fee`)
  / **金融精度** — Decimal 运算确保 GST 计算准确，严格遵循考题公式
- **Assessment data fidelity** — Seed data exactly matches all assessment-specified values (addresses, tracking numbers, emails, phones, company names, postcodes)
  / **考题数据一致性** — 种子数据精确匹配考题所有指定值（地址、追踪号、邮箱、电话、公司名、邮编）
- **API integration** — Successfully authenticated and integrated AusPost shipping & tracking APIs
  / **API 集成** — 成功认证并集成 AusPost 运费和追踪 API
- **Graceful degradation** — TNT API failures handled with automatic fallback
  / **优雅降级** — TNT API 故障自动回退处理
- **Test coverage** — 36 automated tests across backend (28) and frontend (8)
  / **测试覆盖** — 前后端共 36 个自动化测试（后端 28 + 前端 8）
- **Security-first** — No credentials in source code, parameterized queries, CORS, input validation
  / **安全优先** — 源码无凭证、参数化查询、CORS、输入校验
- **B/C-side architectural awareness** — Proactively identified module positioning (B-side internal ops vs C-side consumer portal) with industry-backed analysis and clear extension path
  / **B/C 端架构意识** — 主动识别模块定位（B 端内部运营 vs C 端消费者门户），结合行业实践分析并提供清晰的扩展路径
