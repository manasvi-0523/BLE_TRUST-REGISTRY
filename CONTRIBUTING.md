# Contributing to BLE Trust Registry

Thank you for your interest in contributing to the BLE Trust Registry project! This document provides guidelines for contributing to this research prototype.

## Project Overview

This is an academic research project exploring behavioral anomaly detection for Bluetooth Low Energy devices. Contributions are welcome in the areas of:

- Algorithm improvements
- Feature engineering enhancements
- Documentation and examples
- Bug fixes and testing
- Performance optimizations

## Getting Started

### Prerequisites

- Python 3.9+
- Windows 10/11 (for full BLE scanning support)
- Git for version control

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/manasvi-0523/BLE_mirror.git
cd BLE_mirror

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

## How to Contribute

### 1. Fork and Clone

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/BLE_mirror.git
cd BLE_mirror
git remote add upstream https://github.com/manasvi-0523/BLE_mirror.git
```

### 2. Create a Branch

Create a new branch for your feature or bug fix:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

### 3. Make Your Changes

- Write clear, commented code
- Follow Python PEP 8 style guidelines
- Add docstrings to functions and classes
- Update documentation if needed

### 4. Test Your Changes

```bash
# Run baseline mode to test scanning
python main.py --mode baseline --cycles 2

# Run monitor mode to test detection
python main.py --mode monitor --cycles 2

# Test the dashboard
python dashboard.py

# Test attack simulation
python attack_simulator.py
```

### 5. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "Add feature: brief description

- Detailed point 1
- Detailed point 2
- References #issue_number (if applicable)"
```

**Commit message format:**
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- First line should be 50 characters or less
- Add detailed description after a blank line if needed

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title describing the change
- Description of what changed and why
- Reference to related issues
- Screenshots/logs if applicable

## Reporting Bugs

When reporting bugs, include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Numbered steps to reproduce
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**:
   - OS version
   - Python version
   - BLE adapter details
6. **Logs**: Relevant error messages or logs

## Suggesting Enhancements

For feature requests, include:

1. **Use Case**: What problem does this solve?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other solutions considered
4. **Impact**: Who benefits from this?

## Areas for Contribution

### High Priority
- Cross-platform BLE scanning support (Linux/macOS)
- Real-time monitoring improvements
- Advanced ML model exploration (LSTM, Autoencoders)
- MAC address randomization handling

### Documentation
- Code examples and tutorials
- Architecture documentation
- API documentation
- Video demonstrations

### Testing
- Unit tests for core modules
- Integration tests for workflow
- Property-based testing for edge cases
- Performance benchmarks

### Features
- Additional behavioral features
- Alert notification system (email/webhook)
- Device trust scoring system
- Merkle tree blockchain verification

## Code Review Process

1. All contributions require review
2. Reviewers check for:
   - Code quality and style
   - Test coverage
   - Documentation
   - Security implications
3. Address review feedback promptly
4. Maintainers will merge when approved

## Coding Standards

### Python Style
- Follow PEP 8
- Use type hints where appropriate
- Maximum line length: 100 characters
- Use descriptive variable names

### Documentation
- Docstrings for all public functions/classes
- Inline comments for complex logic
- Update README.md when adding features
- Keep documentation up to date

### Git Workflow
- Keep commits atomic (one logical change per commit)
- Rebase on main branch before submitting PR
- Squash commits if requested
- No merge commits in feature branches

## Security

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email the maintainers directly
3. Provide detailed description
4. Wait for response before disclosure

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

## Acknowledgments

Contributions of all kinds are appreciated:
- Code contributions
- Bug reports
- Feature suggestions
- Documentation improvements
- Testing and feedback

## Contact

- **Project Lead**: Team NEXUS ONLINE
- **Institution**: Don Bosco Institute of Technology, Bengaluru
- **Faculty Supervisor**: Dr. Sheeba
- **GitHub**: [@manasvi-0523](https://github.com/manasvi-0523)

---

Thank you for contributing to BLE Trust Registry.
