# Phase 1: MVP - Detailed Breakdown

Goal: Build a working offline agent that can inspect code quality without wasting tokens.

**Timeline**: 5 weeks
**Success**: Can run `the-gap inspect` on a project, get relevant context via RAG, get model suggestions, execute linters, show results.

## Week 1: Project Scaffolding & LM Studio Integration

### Goals
- [ ] Initialize Bun project with all dependencies
- [ ] Set up TypeScript config
- [ ] Establish project structure
- [ ] Integrate LM Studio SDK
- [ ] Verify local model connection

### Tasks

**1.1 Project Setup**
- [ ] Create `bun.toml` with dependencies
- [ ] Install: `@lmstudio/sdk`, `lancedb`, `ink`, `commander`, `tree-sitter`
- [ ] Create directory structure:
  ```
  src/
    ├─ cli/
    ├─ indexing/
    ├─ rag/
    ├─ planning/
    ├─ execution/
    ├─ memory/
    ├─ types.ts
    └─ index.ts
  ```

**1.2 TypeScript Configuration**
- [ ] Configure `tsconfig.json` for latest TS + Bun
- [ ] Set up ESLint + Prettier
- [ ] Add Git hooks (pre-commit linting)

**1.3 LM Studio Connection**
- [ ] Create client wrapper around `@lmstudio/sdk`
- [ ] Test connection to running LM Studio instance
- [ ] Verify GPT OSS 20B loads and responds
- [ ] Implement error handling for no/bad connection

**1.4 Basic CLI Structure**
- [ ] Create `commander` CLI with subcommands: `inspect`, `index`, `chat`
- [ ] Add `--help` and `--version`
- [ ] Basic logging / debug output

**Deliverable**: Can run `the-gap inspect --help` and verify LM Studio is reachable.

---

## Week 2: Indexing & RAG Foundation

### Goals
- [ ] Parse TypeScript/JavaScript files
- [ ] Generate embeddings via LM Studio
- [ ] Store in LanceDB
- [ ] Implement basic semantic search

### Tasks

**2.1 Project Indexing**
- [ ] Scan project for all `.ts/.tsx/.js/.jsx` files
- [ ] Ignore `node_modules`, `.git`, etc.
- [ ] Extract basic metadata: file path, size, imports

**2.2 Embedding Generation**
- [ ] Use LM Studio embedding model (all-MiniLM-L6-v2 or similar)
- [ ] Chunk files intelligently (don't split functions mid-way)
- [ ] Generate embedding for each chunk
- [ ] Track tokens used

**2.3 LanceDB Storage**
- [ ] Create schema: `{ file_path, chunk_id, content, embedding, language }`
- [ ] Store embeddings in local LanceDB database
- [ ] Set up persistence (database file on disk)

**2.4 Semantic Search**
- [ ] Implement query embedding generation
- [ ] Search LanceDB for top-K similar chunks
- [ ] Return results with relevance scores
- [ ] Cache query results to avoid re-embedding

**Deliverable**: Can run `the-gap index` on a project, stores data, and can search for relevant code.

---

## Week 3: Planning & Simple Agentic Loop

### Goals
- [ ] Implement task decomposition (planning layer)
- [ ] Build basic agentic loop
- [ ] Get user approval before execution
- [ ] Execute commands (linters, git, etc.)

### Tasks

**3.1 Task Planning**
- [ ] Prompt LM Studio to break down user request into steps
- [ ] Force structured output: `{ steps: [{ name, description, files_affected }] }`
- [ ] Show plan to user before execution
- [ ] Allow user to approve/reject/modify plan

**3.2 Agentic Loop (Per Step)**
- [ ] Retrieve relevant code via RAG
- [ ] Send to LM Studio with step context
- [ ] Get structured response (with schema validation)
- [ ] Show suggestion to user
- [ ] Get approval before execution
- [ ] Execute approved command/action
- [ ] Capture output
- [ ] Feed output back to model for refinement (if needed)

**3.3 Command Execution**
- [ ] Run shell commands safely (with user approval)
- [ ] Support: linters (eslint), type checkers, git operations
- [ ] Capture stdout/stderr
- [ ] Handle failures gracefully

**3.4 State Management**
- [ ] Track current task state
- [ ] Store step history
- [ ] Allow rollback to previous state

**Deliverable**: Can run `the-gap inspect <project>`, get a plan, see suggestions, and execute linters.

---

## Week 4: TUI & Token Transparency

### Goals
- [ ] Build terminal UI with Ink
- [ ] Show token usage in real-time
- [ ] Make agent decisions visible
- [ ] Create interactive chat interface

### Tasks

**4.1 Terminal UI with Ink**
- [ ] Build main screen layout
- [ ] Show current project state
- [ ] Display plan in progress
- [ ] Show step-by-step execution
- [ ] Approval prompts (interactive)

**4.2 Token Tracking**
- [ ] Track tokens sent to model (per request)
- [ ] Track tokens received
- [ ] Show running total
- [ ] Display token budget remaining
- [ ] Warn if approaching context limit

**4.3 Transparency Display**
- [ ] Show what context was retrieved
- [ ] Show what was sent to model
- [ ] Show model's reasoning (if available)
- [ ] Show what actions will be executed

**4.4 Interactive Chat**
- [ ] Build chat REPL after execution
- [ ] Allow follow-up questions
- [ ] Maintain conversation history
- [ ] Show context for each exchange

**Deliverable**: Full TUI experience with token awareness and transparency.

---

## Week 5: Integration & MVP Polish

### Goals
- [ ] Integrate all components
- [ ] Basic error handling
- [ ] Session persistence
- [ ] Documentation & examples

### Tasks

**5.1 Integration**
- [ ] Ensure all modules work together
- [ ] Fix integration bugs
- [ ] Test full workflow: index → plan → execute

**5.2 Error Handling**
- [ ] Handle missing projects
- [ ] Handle LM Studio disconnects
- [ ] Handle embedding failures
- [ ] Handle execution failures
- [ ] Graceful degradation

**5.3 Session Persistence**
- [ ] Save session state to disk
- [ ] Allow resuming previous session
- [ ] Save conversation history
- [ ] Save executed commands

**5.4 Documentation**
- [ ] README with setup instructions
- [ ] Usage examples (inspect, chat, etc.)
- [ ] Troubleshooting guide
- [ ] Architecture overview

**5.5 MVP Testing**
- [ ] Test on real project (your Quorum?)
- [ ] Verify token efficiency (actual vs expected)
- [ ] Verify offline capability
- [ ] Get feedback on UX

**Deliverable**: Production-ready MVP. Can inspect code quality offline with full token transparency.

---

## Acceptance Criteria for Phase 1

**Functional**
- [x] Runs completely offline (no cloud APIs)
- [x] Indexes projects under 10 seconds
- [x] Inspects code quality via RAG + LM (20B)
- [x] Shows structured plans to user
- [x] Executes linters/commands on approval
- [x] Handles failures gracefully

**Quality**
- [x] Token usage transparent (visible in UI)
- [x] Context efficient (6-8K vs 30K tokens typical)
- [x] Works on M2 Max with 32GB RAM
- [x] No crashes on edge cases
- [x] Reasonably fast (plan in <10s, inspect in <30s)

**UX**
- [x] Clear TUI, easy to understand
- [x] Human-in-the-loop (user approves everything)
- [x] Can save/resume sessions
- [x] Good error messages

## Known Gaps (For Phase 2)

- No knowledge graph yet (semantic search only)
- No model routing (always uses 20B)
- No checkpointing/rollback
- No persistent memory across projects
- No hypothesis-driven reasoning
- Simple planning (not iterative)

These are intentional for MVP. Phase 2 adds sophistication.
