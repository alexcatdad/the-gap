# Implementation Guidelines & Decision Points

## Key Principles

1. **Offline-First** — Every design decision prioritizes offline capability. Cloud integration is future work.
2. **Token Efficiency** — Track every token. Optimize aggressively. RAG exists to reduce tokens.
3. **Human-in-the-Loop** — Never execute without user approval. Transparency > automation.
4. **Local Optimization** — Exploit M2 Max specifics (unified memory, Metal, MLX). Don't ignore hardware.
5. **Fail Gracefully** — No silent errors. Every failure surfaces actionable guidance to user.

## Critical Design Decisions

### Decision 1: In-Memory vs Persistent Graph

**Question**: Should knowledge graph live in memory only or persist to disk?

**Options**:
- **Memory only**: Faster queries, rebuild on startup
- **Persist to disk**: Resume instantly, but slower updates

**Recommendation**: **Memory + lazy persistence**
- Load graph into memory on startup (parsed from cache if exists)
- Persist to JSON on project changes
- TTL: invalidate cache if source files modified

**Trade-off**: 3-5s startup time vs instant queries. Win on repeated sessions.

---

### Decision 2: RAG Chunk Size

**Question**: How to split files into chunks for embedding?

**Options**:
- **Semantic chunks** (functions, classes): Complex parsing, better semantics
- **Fixed size** (500 tokens): Simple, loses context
- **Line-based** (50 lines): Fast, reasonable semantics

**Recommendation**: **Function/class-level chunks**
- Parse with tree-sitter to identify boundaries
- Each chunk = one function or class
- Fall back to line-based if parsing fails
- Keeps context tight, embeddings meaningful

**Trade-off**: More complex parsing vs better retrieval quality.

---

### Decision 3: Model Selection Strategy

**Question**: How to decide which model to use?

**Options**:
- **Always 20B**: Consistent, slow
- **Always 7B**: Fast, lower quality
- **User chooses**: Maximum control, requires expertise
- **Auto-routing**: Smart but complex

**Recommendation**: **Default auto-routing with override**
- Analyze task complexity (tokens, scope, reasoning steps)
- Suggest model: "Using 7B (fast)" or "Using 20B (thorough)"
- Allow --model flag to override
- Log model choice in output

**Trade-off**: Complexity vs optimal speed/quality balance.

---

### Decision 4: Structured Output Format

**Question**: How to force model to output JSON?

**Options**:
- **JSON schema** (LM Studio native): Built-in, most reliable
- **Prompt engineering**: Works but not guaranteed
- **Post-process**: Parse output then validate

**Recommendation**: **JSON schema first, prompt as fallback**
1. Use LM Studio's JSON schema feature if available
2. Include schema in prompt as example
3. Retry with schema-free prompt if it fails
4. Log failures for debugging

**Trade-off**: More reliable (schema) vs flexibility (prompt).

---

### Decision 5: Error Handling Strategy

**Question**: What to do when operations fail?

**Options**:
- **Fail fast**: Error immediately, user recovers
- **Auto-retry**: Retry with different strategy
- **Ask user**: Prompt for guidance

**Recommendation**: **Tiered approach**
- Tier 1: Fail fast with clear error
- Tier 2: Auto-retry (if it's a transient failure)
- Tier 3: Ask user (if retries exhausted)
- Always: Checkpoint before trying recovery

**Trade-off**: User control vs automation.

---

### Decision 6: Context Window Management

**Question**: What if context exceeds token limit?

**Options**:
- **Truncate**: Cut context, lose information
- **Summarize**: Ask LM to summarize (costs tokens)
- **Refuse**: Tell user and stop

**Recommendation**: **Adaptive truncation + user choice**
1. Calculate total tokens needed
2. If over limit, remove least-important context
3. Warn user: "Context reduced from 12K to 8K tokens"
4. Allow --force-context to override (risky)

**Trade-off**: Graceful degradation vs user autonomy.

---

### Decision 7: Caching Strategy

**Question**: What should be cached?

**Options**:
- **None**: Fresh every time, no staleness issues
- **Aggressive**: Cache everything, fastest but stale
- **Smart**: Cache with TTL/invalidation

**Recommendation**: **Smart caching with file watching**
- Cache query results (embeddings + retrieval)
- Cache graph (rebuild if source files change)
- Use file timestamps for invalidation
- Manual cache clear command available

**Trade-off**: Speed vs data freshness.

---

## Implementation Sequencing

### What to Build First (Order Matters)

1. **LM Studio client** — Foundation, everything depends on it
2. **File indexing** — Can't build RAG without it
3. **Basic RAG** — Need retrieval before reasoning
4. **CLI scaffolding** — Simple commands to test basics
5. **Agentic loop** — The core logic
6. **TUI** — UX polish
7. **Knowledge graph** — Advanced feature
8. **Model routing** — Optimization
9. **Error handling** — Robustness
10. **Testing** — Quality

**Why this order?** Each layer builds on previous. Early wins build momentum.

---

## Testing Strategy

### Unit Tests (Per Module)
- LM Studio client: Connection, response parsing, token counting
- Parser: Tree-sitter output, graph construction
- RAG: Embedding generation, search results
- Execution: Command running, shell safety
- Planning: Plan generation, validation

### Integration Tests (Workflows)
- Index → Search → Generate (happy path)
- Approval → Execute → Checkpoint (human loop)
- Error → Retry → Succeed (resilience)
- Model swap mid-task (routing)

### End-to-End Tests
- Run on real projects (Quorum?)
- Measure token usage (vs baseline)
- Benchmark performance (vs OpenCode)
- User acceptance testing

---

## Code Quality Standards

### Linting & Formatting
- ESLint with TypeScript rules
- Prettier for formatting
- Pre-commit hooks to enforce

### Type Safety
- `strict: true` in tsconfig
- No `any` types (use `unknown` + type guards)
- Explicit return types for all functions

### Testing Coverage
- Aim for 80%+ on critical paths
- 100% on security-sensitive code
- Integration tests for workflows

### Documentation
- JSDoc comments for public APIs
- Inline comments for complex logic
- README for each module

---

## Performance Optimization Checklist

### Startup Performance
- [ ] Lazy load graph (parse on demand)
- [ ] Cache parsed graph between sessions
- [ ] Parallel file processing where possible
- [ ] Profile startup with `bun --inspect`

### Query Performance
- [ ] Index frequent queries
- [ ] Batch embeddings
- [ ] LRU cache eviction
- [ ] Profile with `bun --profile`

### Memory Performance
- [ ] Stream large files (don't load entirely)
- [ ] Garbage collection tuning
- [ ] Memory pooling for reusable objects
- [ ] Monitor with `Memory.usage()`

### Token Efficiency
- [ ] Measure tokens per operation
- [ ] A/B test context sizes
- [ ] Track semantic search precision
- [ ] Compare to baseline (OpenCode)

---

## Debugging & Observability

### Logging
- Use structured logging (pino)
- Log levels: debug, info, warn, error
- Include: timestamp, module, context
- Environment variable to enable debug mode

### Metrics
- Track: tokens used, latency, cache hits, errors
- Export to file for analysis
- Show summary in UI

### Error Tracking
- Log all errors with full context
- Save error logs to disk
- Include: input, context, stack trace, recovery action

---

## Security Checklist

Before releasing:
- [ ] No secrets in code (API keys, paths)
- [ ] Command execution uses allowlist
- [ ] File operations respect user permissions
- [ ] Input validation on all user inputs
- [ ] No arbitrary code execution
- [ ] Checkpointing preserves data integrity
- [ ] Audit log of all operations

---

## Deployment Checklist

Before shipping Phase 1:
- [ ] All tests pass locally
- [ ] No TypeScript errors
- [ ] Linting passes
- [ ] Documentation complete
- [ ] README has setup instructions
- [ ] Works offline (no API calls)
- [ ] Token tracking accurate
- [ ] Performance meets targets
- [ ] Error messages are user-friendly
- [ ] Rollback capability works

---

## Known Unknowns & Risk Mitigation

### Risk: LM Studio Connection Fails
- **Mitigation**: Detect early, show clear error, offer troubleshooting steps
- **Fallback**: Store connection config, retry with exponential backoff

### Risk: Tree-Sitter Parsing Fails on Unusual Code
- **Mitigation**: Graceful degradation to line-based chunking
- **Fallback**: Skip graph features, use RAG only

### Risk: OOM on Large Projects
- **Mitigation**: Monitor memory, chunk parsing in batches
- **Fallback**: Warn user, limit project scope

### Risk: Token Counting Inaccurate
- **Mitigation**: Compare with LM Studio's official counts
- **Fallback**: Conservative estimates (overcount if unsure)

### Risk: User Accepts Dangerous Suggestion
- **Mitigation**: Review system prompt for safety guardrails
- **Fallback**: Offer preview mode (don't execute, just show)

---

## Documentation Requirements

For each phase:
- [ ] README updated
- [ ] API docs for new modules
- [ ] Example workflows documented
- [ ] Common issues & solutions
- [ ] Architecture diagrams (if complex)
- [ ] Decision log (why certain choices)

Maintain CHANGELOG.md tracking:
- Features added
- Bug fixes
- Performance improvements
- Breaking changes
