# Development Guidelines

> **Core Principle:** Always check for and reuse existing components before building new ones.

## Component Reuse Checklist

Before building any new UI component, **ALWAYS**:

1. **Search for existing components** in:
   - `/components/ui/` - UI primitives (buttons, inputs, sheets, etc.)
   - `/components/` - Feature components
   - Look for similar patterns in other files

2. **Check what libraries are being used**:
   - Radix UI (@radix-ui/\*) for accessible primitives
   - Lucide React for icons
   - Existing utility functions in `/lib/`

3. **Follow existing patterns**:
   - If modals exist, use the same pattern
   - If dropdowns exist, use the same pattern
   - Match the styling and structure

## Existing UI Components

### Dialog/Modal

- **Location:** `@radix-ui/react-dialog` (see `components/ui/AppSheet.tsx`)
- **Pattern:** See `components/VibelogEditModal.tsx`
- **Usage:** Fixed overlay with backdrop blur, centered content

```tsx
// Modal pattern (simple)
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
  <div className="rounded-xl border border-border/50 bg-card p-6">
    {/* content */}
  </div>
</div>

// Or use AppSheet for side panels
<AppSheet open={open} onOpenChange={setOpen} title="Title">
  {children}
</AppSheet>
```

### Dropdowns

- **Check:** `components/ExportButton.tsx` for dropdown pattern
- **Pattern:** Relative container with absolute positioned menu

```tsx
<div className="relative" ref={dropdownRef}>
  <button onClick={() => setOpen(!open)}>Toggle</button>
  {open && (
    <div className="absolute top-full z-50 mt-2 rounded-xl border bg-card">{/* menu items */}</div>
  )}
</div>
```

### UI Primitives

Available in `/components/ui/`:

- `button.tsx` - Button component
- `input.tsx` - Input component
- `textarea.tsx` - Textarea component
- `label.tsx` - Label component
- `toast.tsx` / `toaster.tsx` / `use-toast.tsx` - Toast notifications
- `tooltip.tsx` - Tooltips
- `accordion.tsx` - Accordion
- `AppSheet.tsx` - Side panel/sheet (uses Radix Dialog)

### Icons

- **Library:** `lucide-react`
- **Pattern:** Import from lucide-react

```tsx
import { Edit, Trash2, MoreVertical } from 'lucide-react';
```

### Common Patterns

#### Dropdown Menu with Click Outside

```tsx
const menuRef = useRef<HTMLDivElement>(null);
const [isOpen, setIsOpen] = useState(false);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };
  if (isOpen) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [isOpen]);
```

#### Confirmation Dialog

See `VibelogEditModal.tsx` for the pattern - use fixed overlay with z-50+

## Styling Conventions

### Tailwind Classes

- **Borders:** `border-border/50`, `border-border/30`
- **Backgrounds:** `bg-card`, `bg-background`, `bg-muted`
- **Text:** `text-foreground`, `text-muted-foreground`
- **Accent:** `text-electric`, `bg-electric`
- **Destructive:** `text-destructive`, `bg-destructive`
- **Blur:** `backdrop-blur-sm`
- **Shadows:** `shadow-xl`, `shadow-2xl`
- **Z-index:** `z-50` for dropdowns, `z-[100]` for top-level modals

### Responsive Design

- Use responsive prefixes: `sm:`, `md:`, `lg:`
- Mobile-first approach
- Example: `gap-2 sm:gap-3`, `p-3 sm:p-4`

### Animations

- **Transitions:** `transition-all`, `transition-colors`, `transition-transform`
- **Durations:** `duration-200` (default)
- **Hover:** `hover:scale-105`, `hover:bg-muted/50`
- **Active:** `active:scale-95`

## File Organization

```
/components
  /ui           - Reusable UI primitives (buttons, inputs, etc.)
  /mic          - Microphone recording related
  /conversation - Chat/conversation features
  /providers    - Context providers
  /common       - Common components (toasts, etc.)
  [feature].tsx - Feature-specific components

/lib
  export.ts     - Export utilities
  storage.ts    - Storage utilities
  [feature].ts  - Feature utilities

/app
  [route]       - Next.js app routes
```

## Process for New Features

1. **Research First**
   - Search codebase for similar features
   - Check what components/utilities exist
   - Look for established patterns

2. **Reuse & Compose**
   - Use existing components
   - Compose small components into larger ones
   - Only create new when nothing exists

3. **Match Existing Style**
   - Follow naming conventions
   - Use same Tailwind classes
   - Match component structure

4. **Document & Extract**
   - If you create reusable logic, extract to `/lib/`
   - If you create reusable UI, consider moving to `/components/ui/`
   - Add comments for complex logic

## Anti-Patterns to Avoid

❌ **DON'T:**

- Build custom dialogs when Radix Dialog is available
- Create new dropdown patterns when one exists
- Reinvent hover states, transitions, or animations
- Use inline styles when Tailwind classes exist
- Duplicate utility functions
- Skip checking for existing components

✅ **DO:**

- Search before building
- Reuse existing patterns
- Follow established conventions
- Ask "Does this already exist?"
- Compose existing components
- Extract reusable logic

## Testing New Features

Before committing:

- [ ] Check mobile responsiveness
- [ ] Test hover/active states
- [ ] Test keyboard navigation (if applicable)
- [ ] Verify accessibility (aria labels, etc.)
- [ ] Test dark mode (if theme switching exists)
- [ ] Ensure consistent with existing UI

---

**Remember:** Time spent searching for existing components is time saved from rebuilding and maintaining duplicate code. When in doubt, search first!
