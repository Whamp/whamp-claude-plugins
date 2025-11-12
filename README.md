# PocketBase Claude Code Plugin

A comprehensive PocketBase development and deployment toolkit for Claude Code, providing extensive documentation, templates, and guidance for building backend services with PocketBase.

## Overview

This plugin bundles a complete PocketBase knowledge base with 40+ reference files covering everything from basic setup to advanced Go extensions and production deployment. It also includes a specialized research agent optimized for navigating and synthesizing PocketBase information.

## What's Included

### 📚 Comprehensive Documentation (40+ Files)

#### Core Topics
- Getting started with PocketBase
- Collection design and management
- Authentication and authorization
- Security rules and best practices
- File handling and storage
- Record relations and references
- Production deployment guides

#### API Reference
Complete coverage of all 9 API endpoints:
- Records API (CRUD operations)
- Auth API (authentication endpoints)
- Files API (file upload/download)
- Collections API (schema management)
- Realtime API (subscriptions)
- And more...

#### Go Extensions (17 Files)
- Custom event hooks
- Advanced routing
- Database operations
- Data migrations
- Background jobs
- Email templates
- CLI commands
- Realtime functionality
- Filesystem management
- Logging and testing

#### SDKs
- JavaScript/TypeScript SDK
- Go SDK
- Dart/Flutter SDK

#### Schema Templates
Pre-built schemas for common applications:
- Blog/CMS
- E-commerce
- Social networks
- Forums
- Task management
- And more...

#### Scripts & Utilities
- Data export/import tools
- Setup automation
- Configuration helpers

#### Assets
- Docker Compose configurations
- Caddy reverse proxy setup
- Frontend integration templates
- Collection schema templates

### 🔍 Research Agent

The included research agent (`researching-pocketbase.md`) provides:
- Deep knowledge extraction from all reference files
- Cross-file synthesis for complex topics
- Customizable response formats (educational, production, prototyping)
- Code examples from templates and API files
- Troubleshooting and error resolution guidance

## Installation

This plugin is designed for Claude Code. Once published to the marketplace, it can be installed and used within Claude Code sessions.

## Usage

This is a knowledge-based plugin that provides comprehensive PocketBase information. When working on PocketBase projects, this plugin's resources are automatically available to provide:

- Detailed documentation on any PocketBase feature
- Code examples and best practices
- Template schemas for rapid development
- Production deployment guidance
- Troubleshooting assistance

## Structure

```
pocketbase-plugin/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── pocketbase/               # Main knowledge base
│   ├── SKILL.md              # Table of contents
│   ├── references/           # 40+ reference files
│   │   ├── core/             # Core topics (7 files)
│   │   ├── api/              # API documentation (9 files)
│   │   ├── go/               # Go extensions (17 files)
│   │   ├── sdk/              # SDK guides (3 files)
│   │   ├── security_rules.md
│   │   ├── schema_templates.md
│   │   └── api_reference.md
│   ├── scripts/              # Utility scripts
│   │   ├── export_data.py
│   │   ├── import_data.py
│   │   └── setup_project.py
│   └── assets/               # Configuration templates
│       ├── docker-compose.yml
│       ├── caddyfile
│       ├── frontend-template.html
│       ├── collection-schema.json
│       └── app-schema.json
├── researching-pocketbase.md # Research agent
└── README.md                 # This file
```

## Topics Covered

### Getting Started
- Installation and setup
- First steps and basic concepts
- Project structure
- Command-line interface

### Data Management
- Collections and records
- Field types and validation
- Record relations (one-to-one, one-to-many, many-to-many)
- Querying and filtering
- Pagination and sorting

### Authentication
- User registration and login
- OAuth2 providers (Google, GitHub, etc.)
- Password reset and email verification
- Multi-factor authentication
- Role-based access control

### Security
- Security rules syntax
- Read/Write permissions
- Field-level security
- List access rules
- Best practices and examples

### Files & Media
- File upload and storage
- Image resizing and transformation
- File access permissions
- CDN integration
- Storage providers (local, S3, etc.)

### API Integration
- REST API reference
- JavaScript SDK
- Go SDK
- Dart/Flutter SDK
- Authentication flows

### Realtime
- Live subscriptions
- WebSocket connections
- Event handling
- Client-side updates

### Advanced Topics
- Custom Go extensions
- Event hooks and middlewares
- Database migrations
- Background jobs
- Email templates
- Custom endpoints
- Testing strategies

### Deployment
- Production setup
- Docker deployment
- Reverse proxy configuration
- SSL/TLS certificates
- Performance optimization
- Monitoring and logging

## Use Cases

This plugin is perfect for:

- **Learning PocketBase**: Comprehensive guides and examples
- **Building Applications**: Templates for common app types
- **Production Deployment**: Tested configurations and best practices
- **Custom Extensions**: Go development patterns and examples
- **Troubleshooting**: Detailed explanations and solutions

## Contributing

This plugin contains a curated collection of PocketBase knowledge. To contribute:

1. Review the existing documentation
2. Identify gaps or outdated information
3. Follow the existing structure and formatting
4. Test any code examples
5. Submit improvements

## Version History

- **v0.0.1**: Initial release
  - 40+ reference files
  - Complete API coverage
  - Go extensions documentation
  - Schema templates
  - Deployment guides

## License

MIT

## Support

For issues, questions, or contributions related to this plugin, please refer to the repository linked in the plugin.json manifest.

---

**Note**: This plugin provides comprehensive documentation and guidance for PocketBase development. For hands-on execution of PocketBase commands, consider complementary tools and the official PocketBase CLI.
