# Technical Design Document

## System Overview

The Gap is a graph-aware, offline-first coding agent built in Bun/TypeScript. It combines semantic search (RAG) with structural code analysis (knowledge graph) to understand codebases precisely and efficiently.

## Core Components

### 1. LM Studio Client

**Purpose**: Interface with local LM Studio instance for LLM and embeddings.

**Responsibilities**:
- Connect to LM Studio (default: localhost:1234)
- Generate embeddings for code chunks
- Generate responses for reasoning tasks
- Track token usage
- Handle connection/retry logic
- Support multiple models (7B/13B/20B)

**Interface**:
```
LMStudioClient
├─ connect()
├─ generateEmbedding(text: string)
├─ generateResponse(prompt: string, options: {...})
├─ loadModel(modelName: string)
├─ unloadModel(modelName: string)
└─ getTokenUsage()
```

---

### 2. Code Parser & Knowledge Graph

**Purpose**: Parse code and extract semantic relationships.

**Responsibilities**:
- Parse TypeScript/JavaScript files
- Extract: functions, classes, imports, exports
- Build dependency graph
- Support graph queries
- Track scope and references
- Handle circular dependencies

**Key Structures**:
```
CodeNode
├─ type: "function" | "class" | "variable" | "module"
├─ name: string
├─ file: string
├─ line: number
├─ imports: string[]
├─ references: string[]
└─ exports: string[]

CodeGraph
├─ nodes: Map<id, CodeNode>
├─ edges: Map<id, Edge>
└─ queries:
    ├─ findCaller(nodeId)
    ├─ findCallees(nodeId)
    ├─ findImports(nodeId)
    └─ findDependents(nodeId)
```

---

### 3. RAG Engine (LanceDB)

**Purpose**: Semantic retrieval of code.

**Responsibilities**:
- Index code chunks with embeddings
- Semantic search
- Caching results
- Persistent storage

**Database Schema**:
```
CodeIndex
├─ id: string (unique identifier)
├─ file_path: string
├─ chunk_id: number (which chunk in the file)
├─ content: string
├─ embedding: float[] (from LM Studio)
├─ language: string
├─ start_line: number
├─ end_line: number
└─ metadata: { exports, imports, functions }
```

---

### 4. Hybrid Retrieval

**Purpose**: Combine RAG + knowledge graph for better context.

**Algorithm**:
```
1. User query + context
2. Generate embedding for query
3. RAG search: find top-K semantically similar chunks
4. Graph traversal: from RAG results, find causally related code
5. Combine and rank by: semantic score + graph distance
6. Return top-N chunks with highest combined score
```

**Benefits**:
- Semantic relevance (RAG)
- Structural understanding (graph)
- Better context precision
- Reduced token waste

---

### 5. Planning Layer

**Purpose**: Decompose user requests into actionable steps.

**Responsibilities**:
- Parse user request
- Ask LM to suggest steps
- Validate plan
- Show plan to user
- Execute step-by-step

**Plan Structure**:
```
Plan
├─ steps: Step[]
│   ├─ id: string
│   ├─ name: string
│   ├─ description: string
│   ├─ files_affected: string[]
│   ├─ dependencies: string[] (prior steps)
│   └─ estimated_complexity: number
├─ total_estimated_tokens: number
└─ status: "pending" | "in_progress" | "completed"
```

---

### 6. Agentic Execution Loop

**Purpose**: Execute tasks with LM guidance and human oversight.

**Loop**:
```
For each step in plan:
  1. Retrieve relevant context (hybrid retrieval)
  2. Ask LM to reason about step
  3. Get structured suggestion
  4. Show to user
  5. Get approval
  6. Execute approved action
  7. Capture output
  8. If failed: ask LM to retry (different approach)
  9. If succeeded: record success + learning
  10. Move to next step
```

**State Machine**:
```
pending → thinking → deciding → awaiting_approval → executing → complete
                ↓                                      ↓
            failed_to_think                      failed_to_execute (retry)
```

---

### 7. Checkpointing & Memory

**Purpose**: Save state and learn from experiences.

**Checkpoint Structure**:
```
Checkpoint
├─ timestamp: string
├─ project_state: ProjectState
├─ file_contents: Map<file, content>
├─ graph_state: CodeGraph
├─ memory: LearningMemory
└─ operations: Operation[]
```

**Memory Structure**:
```
LearningMemory
├─ learnings: Learning[]
│   ├─ id: string
│   ├─ problem: string
│   ├─ solution: string
│   ├─ why_worked: string
│   ├─ tokens_used: number
│   ├─ success: boolean
│   └─ embedding: float[]
├─ search(query) → similar learnings
└─ add(learning)
```

---

### 8. Model Router

**Purpose**: Select appropriate model for task complexity.

**Complexity Scoring**:
```
score = 0
score += token_count * 0.3      // More context = harder
score += file_count * 0.2       // More files = harder
score += reasoning_steps * 0.5  // More reasoning = harder

if score < 3:     use 7B model
elif score < 6:   use 13B model
else:             use 20B model
```

**Model Registry**:
```
ModelRegistry
├─ available_models: Map<id, Model>
├─ active_model: Model
├─ load(modelId)
├─ unload(modelId)
├─ swap(from, to)
└─ estimate_memory(modelId)
```

---

### 9. TUI (Terminal User Interface)

**Purpose**: Interactive CLI with visibility into agent reasoning.

**Components**:
```
Main Screen
├─ Header: project name, status
├─ Context Panel: show retrieved context
├─ Reasoning Panel: show model's thinking
├─ Execution Panel: show running commands
├─ Approval Panel: prompt for decisions
├─ History Panel: previous actions
└─ Status Bar: tokens, model, cache hits
```

**Interaction Flow**:
- User types command
- Agent retrieves context (show in UI)
- Agent reasons (show reasoning process)
- Agent suggests action (ask for approval)
- User approves/rejects/modifies
- Execute and show results

---

## Data Flow

### Indexing Phase (one-time)

```
User runs: the-gap index

1. Scan project directory
2. For each .ts/.tsx/.js/.jsx file:
   a. Parse with tree-sitter → CodeNode[]
   b. Build knowledge graph edges
   c. Split into chunks
   d. Generate embeddings (LM Studio)
   e. Store in LanceDB
3. Build CodeGraph in memory
4. Persist graph + index to disk
```

### Query Phase (per task)

```
User asks: the-gap inspect

1. Parse user request
2. Ask LM to decompose into steps
3. For each step:
   a. Hybrid retrieval:
      - Semantic search (LanceDB)
      - Graph traversal
      - Combine results
   b. Prepare context
   c. Ask LM to reason
   d. Get structured output
   e. Show to user
   f. Get approval
   g. Execute
   h. Record learning
```

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Index (medium project) | <10s | Tree-sitter parsing + embedding |
| Semantic search | <500ms | LanceDB query |
| Graph query | <100ms | In-memory traversal |
| Model response (7B) | <5s | Per-token streaming |
| Model response (20B) | <20s | Per-token streaming |
| Full task | <60s | Plan + execute |
| Memory usage | <4GB | M2 Max constraint |

---

## Token Budget Strategy

**Goal**: Typical task uses 6-8K tokens (vs OpenCode's 30K)

**Breakdown**:
- System prompt: 500-800 tokens (fixed)
- Context (hybrid retrieval): 4-6K tokens (optimized)
- Interaction/output: 1-2K tokens (typical)
- **Total per task**: 6-10K tokens

**Optimization Tactics**:
1. Hybrid retrieval (graph + RAG)
2. Chunk size optimization
3. Semantic caching
4. Model routing (small models for simple tasks)
5. Structured output (no wasted reasoning)

---

## Error Handling Strategy

**Resilience Levels**:

**Level 1: Graceful Failure**
- Try operation
- If fails, show error to user
- Suggest manual fix
- Offer retry with modified approach

**Level 2: Auto-Recovery**
- Try operation
- If fails, auto-retry with:
  - Smaller model
  - Less context
  - Different strategy

**Level 3: Fallback**
- If all strategies fail
- Provide partial results
- Allow manual override
- Checkpoint for later review

**Example: Embedding fails**
```
Level 1: Try embedding
Level 2 (retry): Try with smaller chunk size
Level 3 (fallback): Use keyword search instead
```

---

## Security Considerations

1. **Code Privacy**: All code stays local, never leaves machine
2. **Execution**: User must approve all commands
3. **Rollback**: Can restore to any checkpoint
4. **Audit Trail**: Complete history of all operations
5. **Isolation**: Tool runs in user's environment, no external calls
