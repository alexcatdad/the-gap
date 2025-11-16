# Project Structure & Dependencies

## Directory Layout

```
the-gap/
├─ src/
│  ├─ cli/
│  │  ├─ commands/
│  │  │  ├─ inspect.ts         # Code quality inspection
│  │  │  ├─ index.ts           # Project indexing
│  │  │  ├─ chat.ts            # Interactive chat
│  │  │  ├─ status.ts          # Show project status
│  │  │  └─ reset.ts           # Clear cache/state
│  │  ├─ ui/
│  │  │  ├─ components/
│  │  │  │  ├─ Header.tsx
│  │  │  │  ├─ ContextPanel.tsx
│  │  │  │  ├─ ReasoningPanel.tsx
│  │  │  │  ├─ ExecutionPanel.tsx
│  │  │  │  ├─ ApprovalPrompt.tsx
│  │  │  │  └─ StatusBar.tsx
│  │  │  ├─ styles.ts          # Common styles
│  │  │  └─ hooks.ts           # Custom Ink hooks
│  │  └─ index.ts              # CLI entry point
│  │
│  ├─ llm/
│  │  ├─ client.ts             # LM Studio SDK wrapper
│  │  ├─ embedding.ts          # Embedding generation
│  │  ├─ models.ts             # Model management
│  │  ├─ router.ts             # Model routing logic
│  │  └─ types.ts              # LLM-related types
│  │
│  ├─ parser/
│  │  ├─ codeParser.ts         # Tree-sitter wrapper
│  │  ├─ extractor.ts          # Extract functions/classes
│  │  ├─ graph.ts              # Knowledge graph
│  │  ├─ queries.ts            # Graph query functions
│  │  └─ types.ts              # Graph types
│  │
│  ├─ rag/
│  │  ├─ indexer.ts            # Create embeddings + index
│  │  ├─ retriever.ts          # Semantic search
│  │  ├─ hybrid.ts             # Hybrid RAG + graph
│  │  ├─ cache.ts              # Query caching
│  │  └─ types.ts              # RAG types
│  │
│  ├─ planning/
│  │  ├─ planner.ts            # Task decomposition
│  │  ├─ validator.ts          # Plan validation
│  │  └─ types.ts              # Plan types
│  │
│  ├─ execution/
│  │  ├─ executor.ts           # Execute steps
│  │  ├─ tools.ts              # Available tools (linters, git, etc.)
│  │  ├─ checkpoint.ts         # Checkpointing logic
│  │  ├─ shell.ts              # Safe command execution
│  │  └─ types.ts              # Execution types
│  │
│  ├─ agentic/
│  │  ├─ loop.ts               # Main agentic loop
│  │  ├─ reasoner.ts           # Reasoning logic
│  │  ├─ approval.ts           # Human approval handling
│  │  ├─ schema.ts             # Structured output schemas
│  │  └─ types.ts              # Agentic types
│  │
│  ├─ memory/
│  │  ├─ learningStore.ts      # Persistent learnings
│  │  ├─ sessionState.ts       # Session persistence
│  │  └─ types.ts              # Memory types
│  │
│  ├─ utils/
│  │  ├─ logger.ts             # Logging
│  │  ├─ config.ts             # Configuration loading
│  │  ├─ paths.ts              # Project paths
│  │  ├─ tokenCounter.ts       # Token usage tracking
│  │  └─ validators.ts         # Input validation
│  │
│  ├─ types.ts                 # Global types
│  └─ index.ts                 # Main entry point
│
├─ tests/
│  ├─ unit/
│  │  ├─ parser.test.ts
│  │  ├─ rag.test.ts
│  │  ├─ router.test.ts
│  │  └─ ...
│  └─ integration/
│     ├─ fullWorkflow.test.ts
│     └─ ...
│
├─ docs/
│  ├─ INSTALLATION.md
│  ├─ USAGE.md
│  ├─ API.md
│  ├─ EXAMPLES.md
│  └─ TROUBLESHOOTING.md
│
├─ bun.toml               # Bun config
├─ tsconfig.json          # TypeScript config
├─ .gitignore
├─ .prettierrc
├─ .eslintrc.json
├─ package.json
├─ README.md
├─ CLAUDE.md
├─ TECHNICAL_DESIGN.md
├─ PHASE_1.md
├─ PHASE_2.md
└─ PHASE_3.md
```

## Dependencies

### Core Runtime
```json
{
  "@lmstudio/sdk": "latest",      // LM Studio integration
  "lancedb": "latest",            // Vector database
  "ink": "^5.0.0",                // React for terminals (TUI)
  "react": "^18.0.0",             // Peer dependency for Ink
  "commander": "^11.0.0",         // CLI framework
  "web-tree-sitter": "latest"     // Tree-sitter for code parsing
}
```

### Data & Storage
```json
{
  "zod": "^3.0.0",                // Runtime validation
  "pino": "^8.0.0",               // Structured logging
  "dotenv": "^16.0.0"             // Config loading
}
```

### Utilities
```json
{
  "chalk": "^5.0.0",              // Terminal colors
  "ora": "^6.0.0",                // Spinners
  "inquirer": "^9.0.0",           // Interactive prompts
  "file-type": "^18.0.0",         // File type detection
  "strip-ansi": "^7.0.0"          // Remove ANSI codes
}
```

### Dev Dependencies
```json
{
  "bun-types": "latest",          // Bun type definitions
  "@types/node": "^20.0.0",
  "typescript": "^5.0.0",
  "eslint": "^8.0.0",
  "@typescript-eslint/eslint-plugin": "^6.0.0",
  "@typescript-eslint/parser": "^6.0.0",
  "prettier": "^3.0.0",
  "vitest": "^0.34.0",            // Test runner
  "@testing-library/react": "^14.0.0"
}
```

## LM Studio Configuration

### Required Models

**Phase 1+**:
- `gpt-oss-20b` (for code generation/reasoning)
- `all-MiniLM-L6-v2` or similar (for embeddings)

**Phase 2+**:
- `Mistral-7B-Instruct` (fast, simple tasks)
- `Llama-2-13B-Chat` (medium tasks)

### Recommended Settings

```
Context Length: 16K minimum (target: 32K for Phase 2+)
GPU Offload: Maximum (MLX optimized)
Temperature: 0.7 (reasoning), 0.3 (structured output)
Batch Size: 1 (for local inference stability)
```

## Project Configuration Files

### bun.toml
```toml
[build]
root = "."
outdir = "./dist"
target = "bun"

[package]
name = "the-gap"
version = "0.1.0"
main = "./src/index.ts"
type = "module"
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Development Setup

### Initial Setup
```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Clone and install
cd the-gap
bun install

# Verify LM Studio connection
bun src/cli inspect --check-connection
```

### Development Commands
```bash
# Dev mode with hot reload
bun --hot src/cli/index.ts

# Type checking
bun tsc --noEmit

# Linting
bunx eslint src/

# Format
bunx prettier --write src/

# Testing
bun test

# Build for distribution
bun build src/cli/index.ts --outdir dist
```

### Environment Variables
```bash
# .env.local
LM_STUDIO_HOST=localhost
LM_STUDIO_PORT=1234
LM_STUDIO_LLM_MODEL=gpt-oss-20b
LM_STUDIO_EMBEDDING_MODEL=all-MiniLM-L6-v2
DEBUG=the-gap:*
LOG_LEVEL=info
```

## Deployment

### As CLI Tool
```bash
# Install globally
bun build src/cli/index.ts -o /usr/local/bin/the-gap
chmod +x /usr/local/bin/the-gap

# Or use bunx
bunx the-gap inspect
```

### As Package
```bash
# Publish to npm
bun publish

# Install from npm
npm install -g the-gap
# or
bun add -g the-gap
```

## Performance Benchmarks

Baseline targets (update as development progresses):

| Metric | Target | Notes |
|--------|--------|-------|
| Startup | <5s | Load project state |
| Index (1K files) | <10s | Parse + embed |
| Search query | <500ms | LanceDB |
| Plan generation | <5s | LM reasoning |
| Full task | <60s | Plan + execute |
| Memory (loaded) | <4GB | M2 Max constraint |
| Memory (indexed) | <2GB | All structures in RAM |

Track actual performance during development in PERFORMANCE.md.
