# 🚀 i18n Quick Start Guide

## Testing Locally

### Start dev server
```bash
pnpm dev
```

### Test each locale

```bash
# English (default, no prefix)
http://localhost:3000/community

# Vietnamese
http://localhost:3000/vi/community

# Spanish
http://localhost:3000/es/community

# French
http://localhost:3000/fr/community

# German
http://localhost:3000/de/community

# Chinese
http://localhost:3000/zh/community
```

### Test language switcher

1. Open any page
2. Click the language dropdown (flag icon in nav)
3. Select a language
4. URL should change to include locale prefix
5. Content should update to selected language

### Test automatic detection

1. **Clear cookies:** Chrome DevTools > Application > Cookies > Delete `NEXT_LOCALE`
2. **Set browser language:** Chrome Settings > Languages > Move Vietnamese to top
3. **Visit:** `http://localhost:3000/community`
4. **Should auto-redirect to:** `http://localhost:3000/vi/community`

---

## How It Works (30 Second Version)

```
User visits /community
         ↓
Middleware detects:
  - No locale in URL
  - Cookie says "vi"
         ↓
Redirects to /vi/community
         ↓
Server renders Vietnamese version
         ↓
Client hydrates with Vietnamese translations
         ↓
User clicks language switcher → "Español"
         ↓
Client navigates to /es/community
         ↓
Server renders Spanish version
```

---

## Using i18n in Your Code

### In Components

```typescript
import { useI18n } from '@/components/providers/I18nProvider';

function MyComponent() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div>
      <p>Current language: {locale}</p>
      <p>{t('home.welcome')}</p>
      <button onClick={() => setLocale('vi')}>
        Switch to Vietnamese
      </button>
    </div>
  );
}
```

### In Pages (Metadata)

```typescript
import { generateVibelogMetadata } from '@/lib/seo/metadata';
import { extractLocaleFromPath } from '@/lib/seo/hreflang';
import { headers } from 'next/headers';

export async function generateMetadata({ params }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';
  const locale = extractLocaleFromPath(pathname);

  return generateVibelogMetadata({
    title: 'My Page',
    teaser: 'Description',
    username: 'user',
    slug: 'my-page',
    locale, // 🔑 This adds hreflang tags
  });
}
```

---

## Adding Translations

### 1. Add to JSON file

Edit `locales/vi.json`:
```json
{
  "myFeature": {
    "title": "Tiêu đề của tôi",
    "description": "Mô tả của tôi"
  }
}
```

### 2. Use in component

```typescript
const { t } = useI18n();

<h1>{t('myFeature.title')}</h1>
<p>{t('myFeature.description')}</p>
```

### 3. With variables

JSON:
```json
{
  "greeting": "Hello {{name}}, you have {{count}} messages"
}
```

Component:
```typescript
{t('greeting', { name: 'John', count: 5 })}
// Output: "Hello John, you have 5 messages"
```

---

## Supported Languages

| Code | Language | Native Name | Flag |
|------|----------|-------------|------|
| `en` | English | English | 🌐 |
| `vi` | Vietnamese | Tiếng Việt | 🇻🇳 |
| `es` | Spanish | Español | 🇪🇸 |
| `fr` | French | Français | 🇫🇷 |
| `de` | German | Deutsch | 🇩🇪 |
| `zh` | Chinese | 中文 | 🇨🇳 |

---

## Common Tasks

### Check which locale is active

```typescript
const { locale } = useI18n();
console.log(locale); // 'vi', 'en', 'es', etc.
```

### Programmatically switch language

```typescript
const { setLocale } = useI18n();
setLocale('es'); // Switches to Spanish and navigates
```

### Check if translation exists

```typescript
const { t } = useI18n();
const translation = t('some.key');
// If key doesn't exist, returns the key itself
```

### Get current URL without locale

```typescript
import { stripLocaleFromPath } from '@/lib/seo/hreflang';

const pathname = '/vi/community';
const clean = stripLocaleFromPath(pathname); // '/community'
```

### Add locale to path

```typescript
import { addLocaleToPath } from '@/lib/seo/hreflang';

const path = '/community';
const localized = addLocaleToPath(path, 'vi'); // '/vi/community'
```

---

## Debugging

### Check middleware is working

```bash
# Should redirect to /vi/community if cookie says 'vi'
curl -i http://localhost:3000/community \
  -H "Cookie: NEXT_LOCALE=vi"
```

### Check hreflang tags

```bash
curl -s http://localhost:3000/vi/@user/slug | grep hreflang
```

Should show:
```html
<link rel="alternate" hreflang="en" href="https://vibelog.io/@user/slug" />
<link rel="alternate" hreflang="vi" href="https://vibelog.io/vi/@user/slug" />
...
```

### Check HTML lang attribute

```bash
curl -s http://localhost:3000/vi/community | grep '<html'
```

Should show:
```html
<html lang="vi" class="dark">
```

---

## Production Checklist

Before deploying:

- [ ] Test all 6 locales work
- [ ] Language switcher works on all pages
- [ ] hreflang tags present (view source)
- [ ] Canonical URLs correct
- [ ] `<html lang>` matches locale
- [ ] Translations complete (no missing keys)
- [ ] Cookie persistence works
- [ ] Browser detection works
- [ ] Build passes: `pnpm build`
- [ ] No TypeScript errors: `pnpm exec tsc --noEmit`

---

## Need Help?

- 📖 **Full docs:** [I18N_ARCHITECTURE.md](./I18N_ARCHITECTURE.md)
- 🐛 **Issues:** File a bug in GitHub
- 💬 **Questions:** Ask in team chat

---

**Built with 🔥 by Claude Code**
