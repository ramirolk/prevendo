# Business rules & design decisions

This document records business-rule decisions made during development that
aren't obvious from the code alone — particularly deliberate simplifications
for the MVP stage, so they read as conscious choices rather than oversights.

## Cost tracking (simplified for the MVP)

`products.cost_price` stores a single value, updated in place whenever a
product's cost is edited. This means the system currently reflects only the
**last recorded purchase cost** — there is no weighted average cost, no FIFO
calculation, and no history of cost changes over time.

This is a deliberate simplification, not an omission. The MVP has no
supplier/purchase-order module (explicitly out of scope for this stage — see
the project's roadmap), so there's no structured way to record multiple
purchases of the same product at different costs in the first place. Once
that module exists, `cost_price` as a single mutable field will need to be
replaced with a proper cost history table, and a decision made between:

- **Weighted average cost** — recalculates `cost_price` as new purchases come in.
- **Last cost** — current behavior, simplest, but doesn't reflect margin
  accurately when purchase costs fluctuate.
- **FIFO** — tracks cost per batch, most accurate but requires modeling
  stock in discrete lots rather than a single `current_stock` counter.

This decision is intentionally deferred to whichever stage introduces
supplier/purchase-order management.

## Manual stock adjustments

Resolved via the manual stock adjustment endpoint (`POST
/products/{product}/stock-adjustments`): every adjustment requires an
explicit `reason` (enforced at the validation layer,
even though the underlying `reason` column is nullable to accommodate
`sale`/`cancellation` movements) and records the responsible `user_id`,
closing what was previously an open question.

## Sale cancellation scope

Per the MVP's business rules: cancelling a sale reverts it in full and
replenishes 100% of the stock sold. Partial cancellation of individual items
within a sale is not supported at this stage.

## Deleted vs. deactivated products

Products with sales history can't be hard-deleted (`restrictOnDelete()` on
`sale_items.product_id` prevents it at the schema level) — attempting to
delete one automatically deactivates it (`active = false`) instead. This
means a sale can never end up referencing a product that no longer exists in
the database at all; the "what happens if a cancelled sale's product was
deleted" scenario from earlier planning notes cannot occur in practice.