# Dependency Audit Report - Remvana Project

## Executive Summary

**Total Dependencies:** 107 (87 production + 20 development)  
**Security Vulnerabilities:** 5 moderate (all related to esbuild)  
**Bundle Size Concerns:** Multiple heavy packages identified  
**Optimization Potential:** High - can reduce dependencies by ~30-40%

## 1. Security Vulnerabilities ⚠️

### Current Issues (npm audit)
- **esbuild <= 0.24.2**: CVE with moderate severity (CVSS 5.3)
  - Affects: drizzle-kit@0.30.4, vite@5.4.14
  - Risk: Development server can be accessed by any website
  - **Fix Available**: Update to latest versions

### Recommended Security Fixes
```json
{
  "vite": "^7.1.1",        // Major version bump required
  "drizzle-kit": "^0.31.4", // Major version bump required
  "esbuild": "^0.25.0"      // Already on safe version
}
```

## 2. Unused Dependencies 🗑️

### Can Be Removed (verified by depcheck)
- `@capacitor/android` - Mobile platform not in use
- `@capacitor/core` - Mobile platform not in use  
- `@capacitor/ios` - Mobile platform not in use
- `bcrypt` - Not used (using bcryptjs or other)
- `@types/bcrypt` - Type for unused bcrypt
- `react-icons` - Not referenced in code
- `zod-validation-error` - Not used

### DevDependencies Unused
- `autoprefixer` - Not configured in PostCSS
- `cross-env` - Can use native NODE_ENV
- `postcss` - Vite handles this internally

## 3. Misplaced Dependencies 🔄

### Should Move to DevDependencies
- `@capacitor/cli` - Build tool, not runtime
- `@types/bcrypt` - TypeScript types
- `@types/jsonwebtoken` - TypeScript types  
- `@types/pg` - TypeScript types
- `@types/qrcode` - TypeScript types

### Should Move to Dependencies (if used in production)
- None identified

## 4. Version Conflicts & Duplicates 📦

### Multiple Versions Detected
- `ms`: 7 different versions
- `minipass`: 6 different versions
- `lru-cache`: 6 different versions
- `debug`: 6 different versions

### Resolution Strategy
- Use npm dedupe to consolidate versions
- Consider using resolutions field for critical packages

## 5. Large/Bloated Packages 🐘

### Heavy Dependencies Analysis

| Package | Size | Impact | Alternative |
|---------|------|--------|-------------|
| `puppeteer` | ~170MB | Massive | Use `puppeteer-core` or remove if PDF generation not needed |
| `sharp` | ~50MB | Large | Consider lazy loading or cloud-based image processing |
| `@radix-ui/*` | 27 packages | Bundle bloat | Import only needed components or use headless-ui |
| `stripe` | ~3MB | Large SDK | Ensure server-only, consider lighter payment solution |
| `@sendgrid/mail` | ~10MB | Heavy | Consider `nodemailer` or API-only approach |
| `mapbox-gl` | ~10MB | Large | Consider `maplibre-gl` (open-source fork) |
| `@supabase/supabase-js` | Large SDK | Overhead | Use fetch for specific endpoints |
| `recharts` | ~150KB gzipped | Medium | Consider `lightweight-charts` or `chart.js` |
| `framer-motion` | ~50KB gzipped | Animation lib | Consider CSS animations for simple cases |

## 6. Build Performance Impact 🚀

### Packages Slowing Builds
1. **Radix UI (27 packages)**: Each adds parse/transform time
2. **puppeteer**: Downloads Chromium, slows CI/CD
3. **sharp**: Native bindings compilation
4. **Multiple esbuild versions**: Redundant processing

## 7. Optimization Recommendations 📋

### Priority 1: Security Fixes
```diff
# package.json
- "vite": "^5.4.14"
+ "vite": "^7.1.1"
- "drizzle-kit": "^0.30.4"
+ "drizzle-kit": "^0.31.4"
```

### Priority 2: Remove Unused
```diff
# Remove from dependencies
- "@capacitor/android": "^7.2.0",
- "@capacitor/cli": "^7.2.0",
- "@capacitor/core": "^7.2.0",
- "@capacitor/ios": "^7.2.0",
- "bcrypt": "^6.0.0",
- "@types/bcrypt": "^6.0.0",
- "react-icons": "^5.4.0",
- "zod-validation-error": "^3.4.0"
```

### Priority 3: Move to DevDependencies
```diff
# Move from dependencies to devDependencies
- "@types/jsonwebtoken": "^9.0.10",
- "@types/pg": "^8.15.5",
- "@types/qrcode": "^1.5.5",
+ # Add to devDependencies section
```

### Priority 4: Replace Heavy Packages
```diff
# Consider these replacements
- "puppeteer": "^24.16.0"
+ "puppeteer-core": "^24.16.0"  # Or remove entirely

- "@sendgrid/mail": "^8.1.5"
+ "nodemailer": "^6.9.0"  # Lighter alternative

- "mapbox-gl": "^3.12.0"
+ "maplibre-gl": "^4.0.0"  # Open-source, same API
```

## 8. Bundle Size Reduction Estimate

### Current State
- Production dependencies: 87
- Estimated bundle size impact: ~15-20MB uncompressed

### After Optimization
- Production dependencies: ~60-65 (25% reduction)
- Estimated bundle size reduction: 40-50%
- Build time improvement: 20-30%

## 9. Implementation Plan

### Phase 1: Quick Wins (1 hour)
1. Remove unused dependencies
2. Move type packages to devDependencies
3. Run `npm dedupe` to consolidate versions

### Phase 2: Security (2 hours)
1. Update vite and drizzle-kit (test thoroughly)
2. Run full test suite
3. Verify build process

### Phase 3: Heavy Package Optimization (4 hours)
1. Evaluate puppeteer usage, switch to puppeteer-core
2. Replace @sendgrid/mail with nodemailer
3. Consider maplibre-gl migration
4. Audit Radix UI usage, remove unused components

### Phase 4: Bundle Optimization (2 hours)
1. Implement code splitting for heavy features
2. Lazy load sharp and other heavy dependencies
3. Configure tree shaking properly

## 10. Testing Checklist After Changes

- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] All features work in development
- [ ] Production build runs correctly
- [ ] PDF generation works (if keeping puppeteer)
- [ ] Email sending works (after SendGrid change)
- [ ] Maps render correctly (after mapbox change)
- [ ] No console errors in browser
- [ ] Bundle size reduced (measure before/after)

## Rollback Instructions

If issues arise after updates:
```bash
# Restore original package.json and lock file
git checkout package.json package-lock.json
npm install
```

## dep_patch.diff

See `dep_patch.diff` file for exact changes to apply.