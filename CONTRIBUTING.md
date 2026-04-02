# Contributing to WashU EM Sim Intelligence Platform

Thank you for your interest in contributing to the WashU Emergency Medicine Simulation & Safety Intelligence Platform! This document provides guidelines for contributing to the project.

## 🎯 Project Overview

This is an internal tool for Washington University Emergency Medicine simulation programs. Contributions should align with the core mission: streamlining post-session report generation and latent safety threat (LST) tracking.

## 🚀 Getting Started

### Development Setup

1. **Fork and clone the repository**
```bash
git clone https://github.com/yourusername/washusimintelligence.git
cd washusimintelligence
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase backend** (see README.md for detailed instructions)

4. **Run the development server**
```bash
npm run dev
```

## 📝 Development Guidelines

### Code Style

- **TypeScript**: Use strict mode, provide proper types for all functions and components
- **React**: Functional components with hooks, avoid class components
- **Formatting**: Follow existing code style (2-space indentation, semicolons)
- **Naming**: 
  - Components: PascalCase (`GenerateReport.tsx`)
  - Functions: camelCase (`generateReport()`)
  - Files: kebab-case for utilities (`text-sanitizer.tsx`)

### Component Guidelines

- **Accessibility**: All components must meet WCAG AA standards
- **Dark Mode**: Test all UI changes in both light and dark themes
- **Responsive**: Ensure mobile and tablet compatibility
- **Reusability**: Use existing components from `/src/app/components/ui/` before creating new ones

### State Management

- **Local State**: Use `useState` for component-specific state
- **Persistence**: Use `useLocalStorage` hook for settings and preferences
- **Server State**: Fetch from Supabase backend, cache where appropriate
- **Forms**: Use `react-hook-form` for complex forms with validation

### Backend Guidelines

- **Edge Functions**: All server code goes in `/supabase/functions/server/`
- **KV Store**: Use the provided utilities in `kv_store.tsx` for database operations
- **Security**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend
- **Error Handling**: Provide detailed error messages with context

## 🧪 Testing

Before submitting a pull request:

1. **Build Check**: Ensure `npm run build` completes without errors
2. **Dark Mode**: Test all changes in both light and dark themes
3. **Accessibility**: Verify keyboard navigation and screen reader compatibility
4. **Responsive**: Test on desktop, tablet, and mobile viewports
5. **Performance**: Check that skeleton loading states work correctly

## 🔧 Making Changes

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `perf/description` - Performance improvements

### Commit Messages

Follow conventional commit format:

```
type(scope): brief description

Detailed explanation (if needed)

- Bullet points for changes
- Reference issues: #123
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples**:
- `feat(lst-tracker): add bulk status update capability`
- `fix(generate): resolve AI prompt timeout for large documents`
- `docs(readme): update deployment instructions for GitHub Pages`

### Pull Request Process

1. **Create a branch** from `main`
2. **Make your changes** following the guidelines above
3. **Test thoroughly** (see Testing section)
4. **Commit with descriptive messages**
5. **Push to your fork** and create a pull request
6. **Fill out the PR template** with:
   - Description of changes
   - Screenshots (for UI changes)
   - Testing performed
   - Related issues

### Pull Request Template

```markdown
## Description
Brief description of what this PR accomplishes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing Performed
- [ ] Light/dark mode tested
- [ ] Responsive design verified
- [ ] Accessibility checked
- [ ] Build successful
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Closes #[issue number]
```

## 🚫 What NOT to Do

- **Don't modify protected files**:
  - `/src/app/components/figma/ImageWithFallback.tsx`
  - `/supabase/functions/server/kv_store.tsx`
  - `/utils/supabase/info.tsx`
  - `/pnpm-lock.yaml`

- **Don't create database migrations** in code files (use Supabase UI)
- **Don't expose API keys** or sensitive credentials
- **Don't break existing functionality** without discussion
- **Don't ignore accessibility requirements**
- **Don't skip dark mode testing**

## 🎨 Design System

### Colors

Use WashU brand colors consistently:
- **PMS 200 (Red)**: `#A51417` - Primary brand color
- **PMS 350 (Green)**: `#007A33` - Accent color

Apply via Tailwind CSS classes or theme variables in `/src/styles/theme.css`

### Components

Prefer existing components from:
- `/src/app/components/ui/` - Radix UI primitives
- `/src/app/components/` - Custom application components

If creating new components:
- Follow Radix UI patterns for accessible primitives
- Support dark mode with theme-aware colors
- Provide TypeScript interfaces for props

## 📚 Documentation

When adding features:

1. **Update README.md** if user-facing functionality changes
2. **Add JSDoc comments** for complex functions
3. **Update keyboard shortcuts** in `tour.ts` if adding shortcuts
4. **Document API changes** if modifying backend routes

## 🐛 Reporting Issues

When reporting bugs, include:

- **Description**: Clear explanation of the issue
- **Steps to Reproduce**: Detailed steps to replicate
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Browser, OS, device type
- **Screenshots**: If applicable
- **Console Errors**: Any error messages from browser console

## 💡 Feature Requests

When suggesting features:

- **Use Case**: Explain the clinical workflow need
- **Proposed Solution**: Describe your idea
- **Alternatives**: Other approaches considered
- **Priority**: Impact on clinical workflows (High/Medium/Low)

## 🔐 Security

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. **Contact** the development team directly
3. **Provide** detailed information about the vulnerability
4. **Wait** for confirmation before disclosing publicly

## 📄 License

By contributing, you agree that your contributions will be licensed under the same proprietary license as the project (Washington University School of Medicine).

## 🙏 Recognition

Contributors will be acknowledged in release notes and project documentation.

## 📞 Contact

For questions or discussions:
- **Issues**: Open a GitHub issue for bugs and features
- **Development Team**: Contact WashU EM for direct communication
- **Pull Requests**: Tag maintainers for review

---

Thank you for contributing to better simulation education and patient safety at WashU Emergency Medicine!
