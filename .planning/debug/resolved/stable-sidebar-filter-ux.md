---
status: resolved
trigger: 'Danh mục sidebar vẫn bị biến mất khi filter, danh mục side bar phải được giữ cố định và không bị thay đổi khi filter chứ đúng không. Thanh scroll của side bar trông thô và xấu, chưa thấy các tối ưu UX mà bạn đề xuất'
created: 2026-07-31
updated: 2026-07-31
---

# Stable Sidebar Filter UX

## Symptoms

- Expected: Within one market, sidebar taxonomy choices stay fixed while product filters change.
- Expected: The sidebar has a polished scrollbar, sticky header/actions, independently collapsible groups, local category search for long lists, and a reliably visible selected choice.
- Actual: Category choices still disappear after applying a filter.
- Actual: The sidebar scrollbar looks like the browser default and several proposed navigation affordances are absent.
- Errors: No error message reported.
- Timeline: Observed after quick task 260730-wqd was implemented.
- Reproduction: Open the catalog, apply a sidebar filter, and compare the category list before and after the filtered projection settles.

## Current Focus

- hypothesis: The projection returns context-dependent taxonomy membership and the client replaces the retained sidebar snapshot with that narrower response after settlement.
- test: Trace the SQL facet universe, API projection replacement, and rendered group behavior before and after a filter.
- expecting: A filter-independent market taxonomy snapshot is needed separately from contextual counts, and missing UI affordances will be evident in the component tree.
- next_action: Gather initial source and browser evidence.

## Evidence

- The prior client retained facets only while a request was pending, then replaced the entire sidebar with the settled response.
- The private projection fetched only `list_catalog_facets_filtered(input)`, so an environment still running the prior RPC returned only facets present in the filtered product set.
- The desktop aside used the browser-default `overflow-y-auto` scrollbar and had no fixed header/action area.
- `CatalogFilterContent` had no collapsible group controls and preserved neither group disclosure state nor selected-first ordering.
- A server-side master/context merge keeps all market taxonomy identities and updates only contextual counts; an explicit zero remains zero, while a facet omitted by an older RPC falls back to its market count.
- Chromium verified the category identity set remains unchanged after a category filter settles.

## Eliminated

- The static catalog shell, canonical metadata, and ISR were not responsible; the production build still emits `/[locale]/catalog` as five-minute SSG.
- The issue was not caused by CSS hiding rows; the settled facet array itself could be narrower.

## Resolution

- root_cause: The settled filtered projection remained the sole taxonomy source, and the implemented UI stopped at basic overflow scrolling instead of the proposed navigation design.
- fix: Merge a filter-independent market facet universe with contextual counts on the server, retain the known universe client-side within one context, and add a fixed desktop header, clear action, branded scrollbar, collapsible groups, selected-first ordering, automatic selected-group expansion, and long-category local search.
- verification: Typecheck, lint, 14 focused unit tests, 3 focused Chromium scenarios, 54 security tests, and the production build passed; catalog remains SSG with five-minute ISR.
- files_changed: src/catalog/projections.ts, src/catalog/public-cache.ts, src/components/catalog/catalog-commerce.tsx, src/components/catalog/catalog-filter-content.tsx, src/components/catalog/catalog-mobile-filters.tsx, src/app/globals.css, tests/unit/catalog/storefront-projection.test.ts, tests/e2e/catalog-discovery.spec.ts
