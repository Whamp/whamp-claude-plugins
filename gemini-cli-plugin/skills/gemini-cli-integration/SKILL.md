---
name: gemini-cli-integration
description: Use this skill when analyzing large codebases, multiple files, or directories that exceed context limits. Leverages Google Gemini's massive context window with @ syntax for file inclusion to handle comprehensive codebase analysis, implementation verification, and architectural understanding.
---

# Gemini CLI Plugin for Large Codebase Analysis

Use the Gemini CLI with its massive context window when analyzing large codebases or multiple files that might exceed context limits.

## Core Usage

Execute `gemini -p` with the `@` syntax to include files and directories. Paths are relative to the current working directory.

### File Inclusion Patterns

**Single file analysis:**
```bash
gemini -p "@src/main.py Explain this file's purpose and structure"
```

**Multiple files:**
```bash
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"
```

**Entire directory:**
```bash
gemini -p "@src/ Summarize the architecture of this codebase"
```

**Multiple directories:**
```bash
gemini -p "@src/ @tests/ Analyze test coverage for the source code"
```

**Current directory recursively:**
```bash
gemini -p "@./ Give me an overview of this entire project"
```

**Alternative to @ syntax:**
```bash
gemini --all_files -p "Analyze the project structure and dependencies"
```

## Implementation Verification Workflows

### Feature Implementation Analysis
Verify specific features are implemented across the codebase:

```bash
# Check for feature implementation
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

# Authentication verification
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

# Pattern detection
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"
```

### Security and Quality Assurance
Verify security measures and coding standards:

```bash
# Error handling verification
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

# Security measures
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

# Rate limiting
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"
```

### Infrastructure and Testing
Check infrastructure components and test coverage:

```bash
# Caching strategy verification
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

# Test coverage analysis
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"
```

## Advanced CLI Options

For advanced usage scenarios, leverage additional CLI options:

### Safety and Approval Modes
```bash
# Auto-approve edit tools only (safer than full YOLO)
gemini --approval-mode auto_edit -p "@src/ Refactor this code for better performance"

# Full auto-approval (use with caution)
gemini --approval-mode yolo -p "@src/ @tests/ Update all tests to use new syntax"

# Specify allowed tools for selective automation
gemini --allowed-tools edit,read -p "@src/ Review and fix syntax issues"
```

### Session Management
```bash
# Resume previous analysis sessions
gemini --resume latest -p "@src/ Continue the security analysis we started"

# List available sessions
gemini --list-sessions

# Delete old sessions
gemini --delete-session 3
```

### Model and Output Configuration
```bash
# Specify Pro model for difficult analysis
gemini --model gemini-2.5-pro -p "@src/ Analyze this code architecture"

# JSON output for programmatic processing
gemini --output-format json -p "@src/ List all API endpoints" > endpoints.json

# Include additional directories beyond current workspace
gemini --include-directories ../shared-lib -p "@src/ Analyze dependencies"
```

### Extensions and MCP Integration
```bash
# Use specific extensions for enhanced analysis
gemini --extensions security-testing -p "@src/ Perform security analysis"

# List available extensions
gemini --list-extensions

# Use specific MCP servers for specialized tools
gemini --allowed-mcp-server-names code-analyzer -p "@src/ Deep code analysis"
```

## When to Use This Skill

Use `gemini` with appropriate options when:

- **Context limitations**: Analyzing entire codebases or large directories that exceed standard context windows
- **Multi-file comparison**: Comparing multiple large files simultaneously
- **Architecture understanding**: Need to understand project-wide patterns or architectural decisions
- **File size considerations**: Working with files totaling more than 100KB
- **Implementation verification**: Verifying if specific features, patterns, or security measures are implemented
- **Pattern analysis**: Checking for the presence of certain coding patterns across the entire codebase
- **Automated workflows**: Using approval modes for batch operations or refactoring tasks
- **Session continuity**: Resuming complex analyses across multiple sessions
- **Specialized analysis**: Leveraging extensions or MCP servers for domain-specific insights

## Best Practices

- **Specific queries**: Be specific about what you're looking for to get accurate results
- **Path management**: Remember that paths in @ syntax are relative to your current working directory
- **Content inclusion**: The CLI includes file contents directly in the context
- **Safety considerations**: Use appropriate approval modes - avoid --yolo for destructive operations
- **Context awareness**: Gemini's context window can handle entire codebases that would overflow Claude's context
- **Session utilization**: Use session management for complex, multi-step analyses
- **Extension leverage**: Utilize appropriate extensions for domain-specific analysis

## Reference Documentation

For complete CLI option reference, see `references/gemini-cli-help` which contains:
- All available commands and options
- Detailed parameter descriptions
- Extension management commands
- MCP server configuration options

## Query Optimization

For best results, structure queries with:
1. **Clear scope**: Specify exactly what files/directories to analyze
2. **Specific objectives**: Clearly state what you're looking for
3. **Expected format**: Request specific output formats when helpful
4. **Context scope**: Include relevant files while excluding unnecessary ones to maintain focus
5. **Tool selection**: Use --allowed-tools to restrict to specific operations when appropriate
6. **Output formatting**: Leverage --output-format json for programmatic processing of results