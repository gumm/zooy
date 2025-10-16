# Contributing to Zooy

Thank you for your interest in contributing to Zooy! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards other contributors

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- npm
- Git

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/zooy.git
   cd zooy
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the project:
   ```bash
   npm run build
   ```

### Project Structure

```
zooy/
├── src/                    # Source code
│   ├── main.js            # Main export
│   ├── ui/                # UI components and handlers
│   ├── dom/               # DOM utilities
│   └── user/              # User management
├── docs/                   # Documentation
│   ├── architecture/      # Architecture docs
│   ├── migration/         # Migration guides
│   └── guides/            # Usage guides
├── chunks/                # Build output (generated)
└── main.js                # Entry point (generated)
```

## Development Workflow

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards (see below)

3. Build and test:
   ```bash
   npm run build
   npm test
   ```

4. Lint your code:
   ```bash
   npm run lint
   ```

5. Fix any linting issues:
   ```bash
   npm run lint:fix
   ```

### Coding Standards

- **ES Modules**: Use `import`/`export` syntax
- **Private Properties**: Use ES private fields (`#property`) for private class members
- **JSDoc Comments**: Document all public APIs
- **Naming Conventions**:
  - Classes: PascalCase
  - Functions/Methods: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Private fields: `#camelCase`

**Example:**
```javascript
/**
 * Example component demonstrating coding standards.
 *
 * @class
 */
export class ExampleComponent {
  /** @type {string} */
  #privateProperty;

  /**
   * Create an example component.
   *
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    this.#privateProperty = config.value;
  }

  /**
   * Public method with JSDoc.
   *
   * @param {string} input - Input parameter
   * @returns {string} Processed output
   */
  publicMethod(input) {
    return this.#processInput(input);
  }

  /**
   * Private method.
   *
   * @private
   */
  #processInput(input) {
    return input.toUpperCase();
  }
}
```

### Component Library Architecture

When working with component libraries:

- **Registry-based**: Use `ComponentLibraryRegistry` for all library integrations
- **Lazy Loading**: Component libraries should be dynamically imported
- **No Hard Dependencies**: Panel and View should remain library-agnostic
- **Caching**: Use the registry's cache system for dynamic imports

See `docs/architecture/ARCHITECTURE_NOTES.md` for detailed architecture documentation.

### Handler Collections

When adding or modifying panel event handlers:

- Group related handlers into collections (e.g., `SearchHandlers`, `FormHandlers`)
- Export handler collections from `src/ui/handlers/index.js`
- Document handler purpose and expected event data structure
- Keep handlers library-agnostic when possible
- Place library-specific handlers in library directories (e.g., `mdc/`, `carbon/`)

## Testing

- Write tests for new features
- Ensure existing tests pass before submitting PR
- Run tests with: `npm test`

## Documentation

### Code Documentation

- Add JSDoc comments to all public APIs
- Include parameter types, return types, and descriptions
- Add usage examples for complex features

### Project Documentation

When adding new features:

- Update relevant documentation in `docs/`
- Add migration notes if introducing breaking changes
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format

## Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(handlers): add FormValidationHandlers collection

Adds a new collection of form validation handlers including
real-time validation and custom error messaging.

Closes #123
```

```
fix(carbon): resolve icon loading race condition

Ensures icon sprite is loaded before components attempt
to use icons.
```

## Pull Requests

### Before Submitting

- [ ] Code follows project coding standards
- [ ] All tests pass
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Commit messages follow convention

### PR Guidelines

1. **Title**: Use conventional commit format
2. **Description**:
   - Explain what changes were made and why
   - Reference related issues
   - Include screenshots/demos for UI changes
3. **Small PRs**: Keep changes focused and reviewable
4. **One Feature**: One PR per feature/fix

### Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Once approved, your PR will be merged

## Versioning

Zooy follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Incompatible API changes
- **MINOR** version: New functionality (backwards-compatible)
- **PATCH** version: Bug fixes (backwards-compatible)

Version bumps are handled by maintainers during release.

## Getting Help

- **Documentation**: Check `docs/` directory first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Architecture**: See `docs/architecture/` for design decisions

## License

By contributing to Zooy, you agree that your contributions will be licensed under the Apache License 2.0.

---

Thank you for contributing to Zooy!
