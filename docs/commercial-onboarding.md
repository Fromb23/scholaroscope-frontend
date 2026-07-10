# Commercial Onboarding

The public landing page and authenticated additional-workspace flow use the backend
commercial catalogue as the only product authority.

## Catalogue Authority

- Fetch public offers from `/subscriptions/catalog/`.
- Request authoritative quotes from `/subscriptions/catalog/quote/`.
- Render only workspace types returned by the catalogue.
- Do not hardcode fallback prices for missing or unpublished plans.
- Do not show disabled or unpublished plans as purchasable.
- Do not calculate the commercial total as authority in the browser.

The frontend may format displayed money, count selected premium plugins, and show
the selected line items. The final total appears only after the backend returns a
quote.

## Standard And Premium

Standard is always the base workspace subscription. Standard + Premium means the
same Standard foundation plus the selected premium plugins. Premium is not a
separate all-inclusive plan.

Standard + Premium requires at least one selected premium plugin before quote
confirmation.

## Money Formatting

Use the shared `formatMoney` formatter. Whole amounts render without unnecessary
decimal digits, for example:

```text
KES 15,000
```

not:

```text
KES 15000.00
```

## Page Shape

The public page introduces the product before asking for a commercial choice. The
commercial section uses package-mode selection, published workspace cards,
progressive capability disclosure, premium add-on selection, quote summary,
catalogue-derived comparison, activation steps, FAQ, and a final CTA.
