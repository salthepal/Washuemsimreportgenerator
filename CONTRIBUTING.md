# Contributing to WashU EM Sim Safety Intelligence Platform

Thank you for your interest in contributing to the WashU Emergency Medicine Simulation & Safety Intelligence Platform!

## Overview

This is an internal tool for Washington University Emergency Medicine. Contributions are limited to authorized personnel within the department.

## Getting Started

### Prerequisites
- Node.js 18+
- Git
- Access to WashU Supabase project
- Google Gemini API key

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in credentials
4. Run development server: `npm run dev`

## Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled, all types must be explicit
- **React**: Functional components with hooks only
- **Formatting**: Use Prettier defaults (handled by IDE)
- **Naming Conventions**:
  - Components: PascalCase (e.g., `ReportViewer`)
  - Files: kebab-case (e.g., `generate-report.tsx`)
  - Hooks: camelCase with `use` prefix (e.g., `useDarkMode`)
  - Constants: UPPER_SNAKE_CASE (e.g., `API_BASE`)

### Component Structure

```tsx
// 1. Imports
import { useState, useEffect } from 'react';
import { ComponentProps } from './types';

// 2. Interfaces/Types
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

// 3. Component
export function MyComponent({ title, onAction }: MyComponentProps) {
  // 3a. State
  const [data, setData] = useState<Type>([]);
  
  // 3b. Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // 3c. Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 3d. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### File Organization

```
src/app/
├── components/           # React components
│   ├── ui/              # Reusable UI components (shadcn)
│   └── [feature].tsx    # Feature-specific components
├── constants/           # App-wide constants
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
└── App.tsx              # Main app component
```

### State Management

- Use local state (`useState`) for component-specific data
- Use context sparingly, prefer prop drilling for small apps
- Use `useLocalStorage` hook for persistent preferences
- Backend state managed through API fetch/update patterns

### API Conventions

All API calls should:
1. Use the `API_BASE` and `API_HEADERS` constants
2. Include error handling with user-friendly messages
3. Log errors to console for debugging
4. Show toast notifications for user feedback

```tsx
try {
  const response = await fetch(`${API_BASE}/endpoint`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to process request');
  }
  
  const result = await response.json();
  toast.success('Operation completed successfully');
  return result;
} catch (error) {
  console.error('Error in operation:', error);
  toast.error('Operation failed. Please try again.');
  throw error;
}
```

### Accessibility Requirements

- All interactive elements must be keyboard accessible
- ARIA labels required for icon-only buttons
- Color contrast must meet WCAG AA standards
- Focus indicators must be visible in both light and dark modes

### Dark Mode

- Use Tailwind's `dark:` prefix for dark mode styles
- Test all new features in both light and dark modes
- Follow existing patterns in `theme.css` for color tokens

## Branching Strategy

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code improvements
- `docs/description` - Documentation updates

### Workflow
1. Create feature branch from `main`
2. Make changes with clear commit messages
3. Test thoroughly (both light/dark modes)
4. Create pull request with detailed description
5. Address review feedback
6. Merge after approval

## Commit Message Guidelines

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(lst-tracker): add location filtering
fix(dashboard): correct active LST count calculation
refactor(generate-report): optimize filtered data logic
docs(readme): update deployment instructions
```

## Testing Checklist

Before submitting a PR, verify:

### Functionality
- [ ] Feature works as intended
- [ ] No console errors or warnings
- [ ] API calls handle errors gracefully
- [ ] Loading states shown appropriately

### UI/UX
- [ ] Responsive on mobile and desktop
- [ ] Dark mode styling correct
- [ ] Animations smooth (no jank)
- [ ] Accessibility standards met

### Code Quality
- [ ] TypeScript compiles without errors
- [ ] No unused imports or variables
- [ ] Comments added for complex logic
- [ ] Follows established patterns

### Integration
- [ ] Works with existing features
- [ ] Doesn't break other functionality
- [ ] Database operations tested
- [ ] Export features functional

## Feature Development Process

### 1. Planning
- Discuss with team lead
- Review existing similar features
- Plan data structure and API needs
- Design UI mockup if needed

### 2. Implementation
- Create feature branch
- Build component structure
- Implement business logic
- Add error handling
- Style with Tailwind + dark mode

### 3. Integration
- Connect to backend APIs
- Update types/interfaces
- Add to appropriate tab
- Update tour steps if needed

### 4. Testing
- Test all user flows
- Verify mobile responsiveness
- Check dark mode
- Test edge cases and errors

### 5. Documentation
- Update README if needed
- Add inline code comments
- Update CHANGELOG.md
- Document any new environment variables

## Backend Development

### Edge Functions
Located in `/supabase/functions/server/`

**Rules:**
- Never import from outside server directory
- Use `npm:` prefix for Node packages
- Use `node:` prefix for Node built-ins
- All routes prefixed with `/make-server-7fe18c53`
- CORS headers must be open
- Log errors with `console.log`

**Example Route:**
```typescript
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';

const app = new Hono();
app.use('*', cors());

app.post('/make-server-7fe18c53/my-endpoint', async (c) => {
  try {
    const body = await c.req.json();
    // Process request
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in my-endpoint:', error);
    return c.json({ error: 'Failed to process' }, 500);
  }
});

Deno.serve(app.fetch);
```

### Database
- Use KV store functions from `kv_store.tsx`
- No direct SQL modifications in code
- Schema changes via Supabase UI only
- Always handle missing keys gracefully

## Deployment

### Staging (Development)
- Commits to `develop` branch auto-deploy to staging URL
- Test all changes on staging before merging to main

### Production
- Only merge to `main` after thorough testing
- Deployment automatically triggered by GitHub Actions
- Monitor deployment in Actions tab
- Verify production site after deployment

## Code Review Guidelines

### For Reviewers
- Check code quality and patterns
- Verify dark mode compatibility
- Test functionality locally
- Ensure accessibility standards
- Provide constructive feedback

### For Authors
- Respond to all comments
- Make requested changes
- Re-request review after updates
- Be open to suggestions

## Security Considerations

### Never commit:
- API keys or secrets
- Supabase service role key
- Personal identifiable information (PII)
- Real patient or session data

### Always:
- Use environment variables for secrets
- Validate user inputs
- Sanitize HTML content
- Use prepared statements for queries

## Getting Help

- Review existing code for patterns
- Check DEPLOYMENT.md for setup issues
- Ask team lead for architectural questions
- Refer to component library docs (Radix UI, Tailwind)

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Components](https://www.radix-ui.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Gemini API Docs](https://ai.google.dev/docs)

---

**Questions?** Contact the development team lead.

**Version**: 1.0.0  
**Last Updated**: April 2, 2026
