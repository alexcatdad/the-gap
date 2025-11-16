# The Gap

A high-performance, offline-first coding agent for local model inference. Built for speed, token efficiency, and complete control. No cloud dependencies, no API keys, no token waste.

## Vision

Replace OpenCode/Claude Code/Cursor Agent for offline scenarios with:
- **RAG for context precision** — only send relevant code (~6-8K tokens instead of 30K)
- **Knowledge graph for causality** — understand code relationships, not just semantics
- **Model routing** — small models for simple tasks, powerful ones for hard problems
- **Agentic planning** — structured reasoning before execution
- **Full transparency** — see exactly what context you're sending

## Key Differentiators

| Feature | OpenCode | Claude Code | The Gap |
|---------|----------|-------------|---------|
| Offline-first | ❌ | ❌ | ✅ |
| Token-aware | Hidden | Hidden | ✅ |
| RAG built-in | ❌ | ❌ | ✅ |
| Knowledge graph | ❌ | ❌ | ✅ |
| Local-optimized | ❌ | ❌ | ✅ |
| Bun/TypeScript | ❌ | ❌ | ✅ |

## Architecture

```
User Input
    ↓
Project Indexing (startup once)
    ├─ Parse code (tree-sitter)
    ├─ Build knowledge graph (functions, imports, dependencies)
    ├─ Generate embeddings (LM Studio)
    └─ Store in LanceDB
    ↓
Task Planner
    └─ Decompose user request into steps
    ↓
For Each Step:
    ├─ Semantic Search (RAG) → get candidate files
    ├─ Graph Traversal → filter to causally related code
    ├─ Model Router → pick right model (7B/13B/20B)
    ├─ Agentic Loop:
    │   ├─ Think (structured reasoning with schema)
    │   ├─ Decide (what tool to use, what to do)
    │   ├─ User Approval (human-in-the-loop)
    │   ├─ Execute (run linters, git, etc.)
    │   └─ Iterate (if failed, retry)
    ├─ Checkpoint & Memory
    │   ├─ Save state before major operations
    │   ├─ Allow rollback if user rejects
    │   └─ Persist learnings for future tasks
    └─ Emit transparent output
        └─ Show tokens used, context size, decisions made
```

## Stack

- **Runtime**: Bun (TypeScript native)
- **LLM**: LM Studio (embeddings + generation)
- **Vector DB**: LanceDB (local, embedded)
- **Code Analysis**: Tree-sitter (parsing) + TypeScript Compiler API
- **TUI**: Ink (React for terminals)
- **Task Execution**: Bun shell, git, linters (eslint, biome, etc.)
- **Framework Inspiration**: LangGraph (mental model, not the actual library)

## Phase 1: MVP (Weeks 1-5)

Minimum viable agent that works for simple code quality inspection tasks.

- [ ] Project setup & scaffolding
- [ ] LM Studio integration (chat + embeddings)
- [ ] Basic file indexing
- [ ] RAG with LanceDB
- [ ] Simple planning layer
- [ ] Command execution
- [ ] TUI with Ink
- [ ] Basic agentic loop
- [ ] Token tracking

## Phase 2: Intelligent (Weeks 6-10)

Add the features that separate good agents from great ones.

- [ ] Knowledge graph (tree-sitter parsing)
- [ ] Graph-aware retrieval (RAG + graph combined)
- [ ] Model routing (7B/13B/20B selection)
- [ ] Structured output validation
- [ ] Checkpointing & rollback
- [ ] Multi-turn reasoning
- [ ] Memory system (persistent learnings)
- [ ] Hypothesis-driven debugging
- [ ] Tool orchestration

## Phase 3: Polish (Weeks 11-14)

Production-ready, battle-tested, edge cases handled.

- [ ] Comprehensive error handling
- [ ] Session persistence
- [ ] Performance optimization
- [ ] Testing suite
- [ ] Documentation
- [ ] Streaming output
- [ ] Semantic caching
- [ ] User feedback integration
- [ ] Rollout-ready

## Success Criteria

For each phase to be "done":

**MVP**: Can inspect code quality in a project, suggest fixes, execute linters, and not waste tokens. Works offline on M2 Max with 32GB RAM.

**Intelligent**: Can handle multi-step refactoring tasks, understand code dependencies, route to appropriate models, and maintain context across session restarts.

**Polish**: Feature parity with OpenCode for local use, battle-tested on real projects, documentation complete, ready for daily use.

## Documentation

See **CLAUDE.md** for project context and file references.

- **TECHNICAL_DESIGN.md** — System architecture and components
- **PHASE_1.md** — MVP implementation (weeks 1-5)
- **PHASE_2.md** — Intelligent features (weeks 6-10)
- **PHASE_3.md** — Production polish (weeks 11-14)
- **PROJECT_STRUCTURE.md** — File organization and dependencies
- **IMPLEMENTATION_GUIDELINES.md** — Design decisions and best practices

## Quick Start

```bash
# Install Bun (if needed)
curl -fsSL https://bun.sh/install | bash

# Clone/setup
cd the-gap
bun install

# Verify LM Studio is running
# Then follow PHASE_1.md
```

## Status

🎯 **Phase**: Production-ready (Phase 3 complete)
✅ **Completed**:
- Phase 1: MVP features (indexing, RAG, planning, execution, TUI, checkpointing)
- Phase 2: Knowledge graph with imports/calls, graph-aware retrieval, hybrid boosting
- Phase 3: Error handling, semantic caching, comprehensive test suite, CLI help system

📝 **Next**: CI/CD setup and final deployment

## Features

### Core Capabilities
- ✅ **Smart Code Indexing**: Parse TypeScript/JavaScript with full AST analysis
- ✅ **Knowledge Graph**: Extract functions, classes, imports, and function calls
- ✅ **Graph-Aware RAG**: Hybrid retrieval combining semantic search with graph boosting
- ✅ **Semantic Caching**: Cache embeddings and graph queries for faster performance
- ✅ **AI Planning**: Structured task decomposition with LM Studio
- ✅ **Command Execution**: Safe execution with user approval and checkpointing
- ✅ **Error Resilience**: Comprehensive error handling with retry logic and fallbacks
- ✅ **TUI Interface**: Interactive terminal UI with React/Ink

### Production Features
- ✅ **Comprehensive Testing**: Unit and integration tests with Vitest
- ✅ **Type Safety**: Full TypeScript coverage with strict mode
- ✅ **Error Recovery**: Graceful degradation and clear error messages
- ✅ **Performance**: Optimized with caching and lazy loading
- ✅ **Documentation**: Complete API docs and usage examples

## Installation & Usage

### Prerequisites
- Bun runtime (v1.0+)
- LM Studio (optional, for AI features)

### Setup

```bash
# Install dependencies
bun install

# Index your project
bun run start index

# Search for code
bun run start search "authentication"

# Run AI-powered inspection
bun run start inspect "improve error handling"

# Launch TUI
bun run start tui

# Run tests
bun test

# Run linter
bun run lint
```

### Commands

- `index` - Index project files and build knowledge graph
- `search <query>` - Semantic search through codebase
- `inspect <task>` - AI-powered code analysis and execution
- `tui` - Interactive terminal UI
- `help` - Show help information
- `version` - Show version
