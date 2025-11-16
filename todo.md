# The Gap — TODO

Last updated: 2025-11-16

## Phase 1 (MVP)
- [x] Replace Node.js APIs with Bun APIs (fs.ts, fileIndexer.ts, commands.ts)
- [x] Integrate LM Studio client (chat + embeddings fallback)
- [x] Planning layer (structured steps)
- [x] Execution layer (Bun.spawn with approval stub)
- [x] TUI (Ink) with inspect runner
- [x] Checkpointing (create/restore/list; stored in `.the-gap/checkpoints/`)

## Phase 2 (Intelligence Layer)
- [ ] Knowledge graph with Tree-sitter parsing
  - [x] Minimal file-level graph scaffold (`src/parser/graphBuilder.ts`)
  - [ ] Extract functions/classes and edges (calls/imports) via Tree-sitter
- [ ] Graph-aware hybrid retrieval
  - [x] Hybrid retriever scaffold (`src/rag/hybridRetriever.ts`)
  - [ ] Boost RAG scores using graph connections
- [ ] Model routing (7B/13B/20B) based on task complexity

## Phase 3 (Production Polish)
- [ ] Comprehensive error handling and resilience
- [ ] Optimization and caching (semantic cache, lazy graph loading)
- [ ] Testing suite (Vitest: unit + integration)
- [ ] Documentation polish and CLI help
- [ ] CI/CD (GitHub Actions), package publishing

## Notes
- Lint/format: Biome clean on `src/`.
- Artifacts in `.the-gap/` intentionally excluded from lint/format.
- LM Studio integration is resilient: falls back to deterministic embedding hash if unavailable.
