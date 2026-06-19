# SQL Data Collection Guide

> **Query Tool**: [Google Apps Script SQL Query](https://script.google.com/macros/s/AKfycbz7CmUgos3WY8Vmn6IuL40mJlsGhCvJZWxubWq0LZu3d3TdHIytPs1C5XNcJPZgle7J/exec)
>
> **Table Name**: `product_list` (examples show `sku`, but the real table is `product_list`)
>
> **Column Mapping**: `sku_code` -> `SKU`, `price` -> `RRP`

---

## Query 1 (REQUIRED) -- Order 1 SKU Products

Order 1 (PO-20251130-00072) contains 5 unique SKUs. Run this query to get their product details:

```sql
SELECT * FROM product_list WHERE SKU IN ('TBAMET10','TBAMET28','TBOPAL28','HARNIG','LELCBD100')
```

These SKUs and their order quantities:

| SKU | QTY | Tracking | Order |
|-----|-----|----------|-------|
| TBAMET10 | 3 | Track 1 | PO-20251130-00072 |
| TBAMET28 | 1 | Track 1 | PO-20251130-00072 |
| TBOPAL28 | 1 | Track 1 | PO-20251130-00072 |
| HARNIG | 4 | Track 1 | PO-20251130-00072 |
| LELCBD100 | 6 | Track 1 | PO-20251130-00072 |

---

## Query 2 (REQUIRED) -- Order 2 SKU Products

Order 2 (PO-20251202-00046) contains 4 unique SKUs. Run this query:

```sql
SELECT * FROM product_list WHERE SKU IN ('AURPUR10','HALGEO15','MCMW10','MCBO30')
```

These SKUs and their order quantities:

| SKU | QTY | Tracking | Order |
|-----|-----|----------|-------|
| AURPUR10 | 10 | Track 2 | PO-20251203-00046 |
| HALGEO15 | 1 | Track 3 | PO-20251203-00046 |
| MCMW10 | 2 | Track 3 | PO-20251203-00046 |
| MCBO30 | 3 | Track 3 | PO-20251203-00046 |

---

## Query 3 (COMBINED -- Recommended)

If you prefer to run a single query for all 9 SKUs at once:

```sql
SELECT * FROM product_list WHERE SKU IN ('TBAMET10','TBAMET28','TBOPAL28','HARNIG','LELCBD100','AURPUR10','HALGEO15','MCMW10','MCBO30')
```

---

## Query 4 (OPTIONAL) -- Full Product List

If you want to populate the database with ALL products (for the Products management page):

```sql
SELECT * FROM product_list
```

> Note: This may return many rows. The default limit is 10. If the tool supports `LIMIT`, try increasing it:

```sql
SELECT * FROM product_list LIMIT 100
```

---

## Query 5 (OPTIONAL) -- Verify Individual SKUs

If any SKU from Query 3 returns no results, try querying them individually to verify the SKU code:

```sql
SELECT * FROM product_list WHERE SKU = 'TBAMET10'
```

```sql
SELECT * FROM product_list WHERE SKU = 'TBAMET28'
```

```sql
SELECT * FROM product_list WHERE SKU = 'TBOPAL28'
```

```sql
SELECT * FROM product_list WHERE SKU = 'HARNIG'
```

```sql
SELECT * FROM product_list WHERE SKU = 'LELCBD100'
```

```sql
SELECT * FROM product_list WHERE SKU = 'AURPUR10'
```

```sql
SELECT * FROM product_list WHERE SKU = 'HALGEO15'
```

```sql
SELECT * FROM product_list WHERE SKU = 'MCMW10'
```

```sql
SELECT * FROM product_list WHERE SKU = 'MCBO30'
```

---

## Query 6 (OPTIONAL) -- Explore Table Structure

Check what columns are available:

```sql
SELECT * FROM product_list LIMIT 1
```

---

## Expected Data Fields

Each SKU record should contain the following fields (based on previous query results):

| Field | Purpose | Example |
|-------|---------|---------|
| `SKU` | Product identifier, matches order line items | `TBAMET10` |
| `ProductName` | Display name on frontend | `ZenStem 30:15 Indica...` |
| `RRP` | Unit price in $ (includes GST) | `175.00` |
| `Description` | Product description | `Pastilles - 30 pack...` |
| `weight` | Shipping fee calculation | `0.2g` |
| `length` | Shipping fee calculation | `10.0mm` |
| `width` | Shipping fee calculation | `10.0mm` |
| `height` | Shipping fee calculation | `10.0mm` |
| `volume` | Shipping fee calculation | `1000.0mm³` |
| `Volumetric_GrossWeight` | Shipping volumetric weight | `0.2kg` |
| `Barcode` | Product barcode | `998855` |
| `DosageType` | Product category | `Pastille` |
| `Size` | Product size/dosage | `1350` |
| `Status` | Product listing status | `List` |

---

## How to Submit Results

1. Open the [SQL Query Tool](https://script.google.com/macros/s/AKfycbz7CmUgos3WY8Vmn6IuL40mJlsGhCvJZWxubWq0LZu3d3TdHIytPs1C5XNcJPZgle7J/exec) in your browser
2. Run **Query 3** (the combined query for all 9 SKUs)
3. Copy the full JSON result from the output area
4. Paste it back to me in the chat

The `seed.py` script will parse the JSON and import all data into the SQLite database automatically.
