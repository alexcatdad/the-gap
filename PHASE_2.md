# Phase 2: Intelligent Agent - Detailed Breakdown

Goal: Add the features that make this genuinely powerful—knowledge graph, model routing, checkpointing, persistent learning.

**Timeline**: 5 weeks (Weeks 6-10)
**Prerequisite**: Phase 1 complete and working

## Week 6: Knowledge Graph Foundation

### Goals
- [ ] Parse code with tree-sitter
- [ ] Build in-memory dependency graph
- [ ] Extract functions/classes/imports
- [ ] Implement graph queries

### Tasks

**6.1 Code Parsing with Tree-Sitter**
- [ ] Set up tree-sitter for TypeScript
- [ ] Extract: function declarations, class declarations, imports
- [ ] Extract: exported symbols, internal references
- [ ] Track scope: global, module, function-level

**6.2 Graph Structure**
- [ ] Define node types: Function, Class, Module, Variable
- [ ] Define edge types: Calls, Imports, Extends, Uses
- [ ] Build adjacency list or graph structure
- [ ] Store metadata: location (file:line), parameters, return type

**6.3 Graph Construction**
- [ ] During indexing, build graph from parsed AST
- [ ] Resolve import references (what module does X import from?)
- [ ] Resolve function calls (which function calls which?)
- [ ] Handle circular dependencies gracefully

**6.4 Graph Queries**
- [ ] "Get all functions that call X"
- [ ] "Get all functions called by X"
- [ ] "Get import chain for module Y"
- [ ] "Get all code that affects variable Z"
- [ ] Depth-limited traversal (don't go too deep)

**Deliverable**: Can query graph: "What calls this function?" and get accurate results.

---

## Week 7: Graph-Aware RAG & Model Routing

### Goals
- [ ] Combine RAG + graph for better context
- [ ] Implement model routing logic
- [ ] Select model based on task complexity

### Tasks

**7.1 Hybrid Retrieval**
- [ ] Run semantic search (RAG) as baseline
- [ ] For results, run graph traversal
- [ ] Boost relevance of causally-related code
- [ ] Return combined ranked results

**Example**: User asks "fix payment bug"
- RAG finds: payment.ts, checkout.ts, stripe.ts (semantic)
- Graph finds: what calls processPayment? → order.ts, billing.ts
- Combined: order.ts, billing.ts, payment.ts, checkout.ts, stripe.ts (causal order)

**7.2 Task Complexity Analysis**
- [ ] Analyze user request for complexity signals
- [ ] Token count of context needed
- [ ] Number of files involved
- [ ] Estimated reasoning steps
- [ ] Score: simple (1-3) vs medium (4-6) vs hard (7+)

**7.3 Model Routing**
- [ ] Simple tasks → 7B model (fast, good enough)
- [ ] Medium tasks → 13B model (balanced)
- [ ] Hard tasks → 20B model (most capable)
- [ ] Allow user override ("use 20B")

**7.4 Model Management**
- [ ] Keep only active model loaded (save VRAM)
- [ ] Implement model swapping (load/unload)
- [ ] Track which model loaded in UI
- [ ] Handle model loading failures

**Deliverable**: Can route simple tasks to 7B (2x faster), hard tasks to 20B. Hybrid retrieval improves context quality.

---

## Week 8: Structured Reasoning & Validation

### Goals
- [ ] Force model to output structured JSON
- [ ] Validate outputs against schemas
- [ ] Implement hypothesis-driven debugging

### Tasks

**8.1 Structured Output Schemas**
- [ ] Define schemas for different outputs:
  - Planning step
  - Code analysis result
  - Suggested fix
  - Debugging hypothesis
- [ ] Use JSON schema or Zod for validation

**8.2 Schema Enforcement**
- [ ] Configure LM Studio to output JSON schema
- [ ] Validate responses before parsing
- [ ] Reject invalid outputs, ask model to retry
- [ ] Add confidence scoring to responses

**8.3 Hypothesis-Driven Reasoning**
- [ ] Ask model to generate multiple hypotheses
- [ ] For each hypothesis: suggest tests/checks
- [ ] Execute tests to gather evidence
- [ ] Score hypothesis likelihood
- [ ] Focus execution on highest-confidence hypothesis

**Example**: "Why is this API slow?"
- Hypothesis 1: Database query (likelihood: 60%)
- Hypothesis 2: Memory leak (likelihood: 25%)
- Hypothesis 3: Network issue (likelihood: 15%)
- → Focus debugging on database first

**Deliverable**: Outputs are reliable JSON, reasoning is structured and testable.

---

## Week 9: Checkpointing, Memory & State Management

### Goals
- [ ] Implement checkpointing before major operations
- [ ] Build persistent memory system
- [ ] Track learning from tasks
- [ ] Allow session replay/rollback

### Tasks

**9.1 Checkpointing**
- [ ] Before any file modifications, save checkpoint
- [ ] Store: file contents, graph state, session history
- [ ] Compress to minimize disk usage
- [ ] Allow user to rollback to checkpoint

**9.2 Persistent Memory**
- [ ] Store learnings from each task:
  - Problem description
  - Solution that worked
  - Why it worked
  - Performance impact
- [ ] Index learnings with embeddings
- [ ] Recall learnings for similar future tasks

**9.3 Session Persistence**
- [ ] Save full session to disk
- [ ] Include: project state, graph, all decisions made
- [ ] Resume session: restore state, continue from checkpoint
- [ ] Allow comparing different solution attempts

**9.4 Rollback UI**
- [ ] Show list of checkpoints
- [ ] Allow restore to any checkpoint
- [ ] Show diff between current and checkpoint
- [ ] Undo/redo support

**Deliverable**: Can rollback to any point, learning persists across sessions.

---

## Week 10: Integration & Phase 2 Polish

### Goals
- [ ] Integrate all new features
- [ ] Test multi-step workflows
- [ ] Optimize performance
- [ ] Documentation

### Tasks

**10.1 Integration Testing**
- [ ] Test graph + RAG together
- [ ] Test model routing on realistic tasks
- [ ] Test hypothesis-driven debugging
- [ ] Test checkpointing workflow
- [ ] Verify token savings vs Phase 1

**10.2 Performance Optimization**
- [ ] Profile graph construction (target <5s for medium project)
- [ ] Optimize graph queries (cache common queries)
- [ ] Optimize embedding generation (batch where possible)
- [ ] Memory profiling on M2 Max

**10.3 Real-World Testing**
- [ ] Run against complex project (yours)
- [ ] Track token usage on real tasks
- [ ] Measure speed improvements from model routing
- [ ] Get feedback on UX

**10.4 Documentation**
- [ ] Document knowledge graph capabilities
- [ ] Document model routing decisions
- [ ] Explain hypothesis-driven reasoning
- [ ] Add advanced usage examples

**Deliverable**: Phase 2 complete, significantly more capable than Phase 1.

---

## Acceptance Criteria for Phase 2

**Functional**
- [x] Knowledge graph queries work accurately
- [x] Model routing makes correct decisions
- [x] Hybrid retrieval improves context precision
- [x] Checkpointing/rollback works reliably
- [x] Memory system learns from tasks

**Performance**
- [x] Simple tasks use 7B model (2-3x faster than 20B)
- [x] Context size reduced 20-30% vs Phase 1
- [x] Graph queries <100ms
- [x] Overall task time <50% of Phase 1

**Quality**
- [x] Structured outputs validated
- [x] Hypothesis-driven reasoning produces insights
- [x] Multi-step tasks handled correctly
- [x] Edge cases handled gracefully

## Known Gaps (For Phase 3)

- No semantic caching (could speed up similar queries)
- No interactive feedback during execution
- Limited error recovery strategies
- No advanced query optimization
- Single-user only (no multi-project session management)

These are nice-to-haves for Phase 3.
