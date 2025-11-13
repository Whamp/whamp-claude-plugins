# Browser Tools Plugin

**Efficient browser automation without MCP overhead** - A collection of lightweight Node.js tools that leverage Chrome's DevTools Protocol for powerful web automation, inspired by [Mario Zechner's article](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/).

## Philosophy

> "Building these tools is ridiculously easy, gives you all the freedom you need, and makes you, your agent, and your token usage efficient."

Instead of heavy MCP servers consuming 13-18k tokens per operation, these tools use **~300 tokens** while providing complete browser automation capabilities.

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install puppeteer-core

# Make scripts executable (Unix/Linux/macOS)
chmod +x skills/browser-tools/*.js
```

### Basic Usage

```bash
# Start Chrome with debugging
cd skills/browser-tools
./start.js              # Fresh profile
./start.js --profile    # Use your Chrome profile (cookies, logins)

# Navigate to a website
./navigate.js https://example.com
./navigate.js https://example.com --new  # Open in new tab

# Execute JavaScript
./evaluate.js 'document.title'
./evaluate.js 'document.querySelectorAll("a").length'

# Take screenshots
./screenshot.js         # Full page screenshot
```

## 🛠️ Core Tools

### 1. Browser Control
- **`start.js`** - Launch Chrome with remote debugging on port 9222
- **`navigate.js`** - Navigate to URLs in current or new tabs
- **`close.js`** - Clean browser shutdown

### 2. Page Interaction
- **`evaluate.js`** - Execute JavaScript in page context (async support)
- **`screenshot.js`** - Capture full-page or element screenshots
- **`element.js`** - Interactive DOM element picker and selector
- **`cookies.js`** - Cookie import/export management

## 📖 Detailed Usage

### Chrome Startup

```bash
./start.js              # Fresh profile (private browsing)
./start.js --profile    # Sync your default Chrome profile
```

**Features:**
- Automatic cleanup of existing Chrome processes
- Profile synchronization with rsync (fast on subsequent runs)
- Waits for Chrome to be ready before returning
- Cross-platform support (macOS, Linux, Windows)

### Navigation

```bash
./navigate.js https://example.com              # Current tab
./navigate.js https://example.com --new        # New tab
./navigate.js https://example.com --wait       # Wait for network idle
```

### JavaScript Execution

```bash
# Simple queries
./evaluate.js 'document.title'
./evaluate.js 'window.location.href'

# Complex async operations
./evaluate.js 'await fetch("/api/data").then(r => r.json())'

# DOM manipulation
./evaluate.js 'document.querySelector("#form").style.display = "none"'

# Data extraction
./evaluate.js 'Array.from(document.querySelectorAll("a")).map(a => a.href)'
```

### Screenshots

```bash
./screenshot.js                    # Full page, timestamped filename
./screenshot.js --element selector # Specific element only
./screenshot.js --format jpeg      # JPEG instead of PNG
```

Returns temporary file path: `/tmp/screenshot-2025-11-12T15-30-45-123Z.png`

### Cookie Management

```bash
./cookies.js --export > cookies.json    # Export all cookies
./cookies.js --import cookies.json      # Import cookies
./cookies.js --domain example.com       # Filter by domain
./cookies.js --clear                    # Clear all cookies
```

### Element Selection

```bash
./element.js                    # Interactive picker
./element.js "button.submit"    # Get selector for element
./element.js --text "Submit"    # Find element by text
```

## 🎯 Use Cases

### Web Scraping
```bash
./start.js
./navigate.js https://news.ycombinator.com
./evaluate.js 'Array.from(document.querySelectorAll(".titleline > a")).map(a => a.href)'
./screenshot.js
```

### Form Testing
```bash
./navigate.js https://example.com/form
./evaluate.js 'document.querySelector("#email").value = "test@example.com"'
./evaluate.js 'document.querySelector("#password").value = "password123"'
./evaluate.js 'document.querySelector("form").submit()'
```

### Performance Monitoring
```bash
./navigate.js https://example.com
./evaluate.js 'performance.timing.loadEventEnd - performance.timing.navigationStart'
./screenshot.js
```

### API Testing
```bash
./navigate.js https://api.example.com/docs
./evaluate.js 'await fetch("/users").then(r => r.json())'
```

## 🔧 Configuration

### Chrome Profile Location
- **macOS**: `~/Library/Application Support/Google/Chrome/`
- **Linux**: `~/.config/google-chrome/`
- **Windows**: `%LOCALAPPDATA%\Google\Chrome\User Data\`

### Debugging
Chrome runs on `http://localhost:9222` - you can:
- View available pages: `curl http://localhost:9222/json`
- Access DevTools: Open Chrome and navigate to `chrome://inspect`
- Connect other tools to the same debugging session

## 📚 Advanced Patterns

### Waiting for Elements
```bash
./evaluate.js '
  await new Promise(resolve => {
    const check = () => {
      const el = document.querySelector("#dynamic-content");
      if (el) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
'
```

### Handling Popups
```bash
./evaluate.js 'document.querySelector(".popup-close").click()'
```

### Infinite Scrolling
```bash
./evaluate.js '
  for(let i = 0; i < 5; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 1000));
  }
'
```

## 🔒 Security Considerations

- Use fresh profiles for sensitive operations
- Clear cookies after authentication testing: `./cookies.js --clear`
- Avoid executing untrusted JavaScript
- Chrome profile sync includes passwords and sessions

## 🐛 Troubleshooting

### Chrome Won't Start
```bash
# Kill existing Chrome processes
pkill -f "Google Chrome" || true

# Check if port 9222 is available
lsof -i :9222

# Try with explicit Chrome path
./start.js --chrome-path /usr/bin/google-chrome
```

### Connection Issues
- Ensure Chrome started successfully
- Verify port 9222 is accessible: `curl http://localhost:9222/json/version`
- Check firewall settings

### Profile Sync Issues
- Chrome must be completely closed before profile sync
- Verify profile path exists and is accessible
- Large profiles may take time to sync

## 📊 Performance

- **Token Usage**: ~300 tokens vs MCP's 13-18k tokens
- **Startup Time**: ~2-3 seconds (profile sync: ~5-10 seconds)
- **Memory Usage**: Chrome browser memory + Node.js process
- **File Size**: <2MB total for all scripts

## 🤝 Contributing

This plugin follows the philosophy of simplicity and efficiency. When contributing:

1. Keep tools focused and lightweight
2. Maintain cross-platform compatibility
3. Preserve the minimal token usage approach
4. Follow the existing script patterns
5. Update documentation for new features

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Based on the approach described by [Mario Zechner](https://mariozechner.at/) in his article ["What if you don't need MCP?"](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/).

---

**For complex automation scenarios, use the `browser-tools-agent` which provides specialized expertise in browser automation strategies and advanced pattern implementation.**