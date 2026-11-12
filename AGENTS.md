# Working instructions

- Focus on the requested feature or bug. Inspect its code and direct dependencies; expand the investigation only when evidence shows wider impact.
- Clarify ambiguity that would materially change the solution; state consequential assumptions and tradeoffs.
- Implement the simplest sufficient solution. Avoid speculative features, configuration, and single-use abstractions.
- Keep edits surgical: follow existing style, avoid unrelated cleanup, and remove only dead code introduced by your change.
- Define a checkable outcome; for bugs, reproduce the failure when practical. Run focused checks, broadening only when shared contracts or critical flows are affected.
- Read project documents only when the task needs them. Product context: `.planning/PROJECT.md`; stack research: `.planning/research/STACK.md`; other `.planning/` files are optional historical context.
- For code navigation, use CodeGraph first when `.codegraph/` exists; use `rg` when CodeGraph does not answer the question.

This is a Vietnamese and English storefront for digital crochet patterns and handmade goods, with separate Vietnam and international market rules. Never deliver digital purchases before full payment confirmation; keep PDFs access controlled. Consult the product brief for other domain rules when relevant.

Postman CLI is available for API work.
