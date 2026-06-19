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

**Key insight** — RRP prices are in USD and **already include GST** (10% Australian Goods and Services Tax). GST must be back-calculated, not added.

**关键发现** — RRP 价格为美元且**已包含 GST**（10% 澳大利亚商品服务税）。需要反算 GST，而非正向加算。

```
line_total = unit_price (RRP) × quantity
subtotal   = Σ line_totals
gst        = subtotal × 10 / 110      ← back-calculated / 反算
total      = subtotal + shipping_fee
```

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
products ────── orders ─┬── order_items
                        │
                        └── tracking ──── tracking_events
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

---

## 4. Testing Strategy / 测试策略

### Backend Tests (pytest) / 后端测试

| Test File / 测试文件 | Coverage / 覆盖范围 |
|---|---|
| `test_products.py` | Product CRUD endpoints / 产品 CRUD 端点 |
| `test_orders.py` | Order creation, status updates, price calculation / 订单创建、状态、价格 |
| `test_price_service.py` | Decimal-precision financial calculation unit tests / 金融计算精度单元测试 |
| `test_tracking.py` | Tracking endpoints / 追踪端点 |

**26 test cases** using in-memory SQLite for isolation / **26 个测试用例**，使用内存数据库隔离

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
- **Financial precision** — Decimal arithmetic ensures accurate GST back-calculation
  / **金融精度** — Decimal 运算确保 GST 反算准确
- **API integration** — Successfully authenticated and integrated AusPost shipping & tracking APIs
  / **API 集成** — 成功认证并集成 AusPost 运费和追踪 API
- **Graceful degradation** — TNT API failures handled with automatic fallback
  / **优雅降级** — TNT API 故障自动回退处理
- **Test coverage** — 34 automated tests across backend and frontend
  / **测试覆盖** — 前后端共 34 个自动化测试
- **Security-first** — No credentials in source code, parameterized queries, CORS, input validation
  / **安全优先** — 源码无凭证、参数化查询、CORS、输入校验
