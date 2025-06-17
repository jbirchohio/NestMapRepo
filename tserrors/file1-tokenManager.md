# TypeScript Errors in tokenManager.ts

**File Path:** `C:/Users/jbirc/Desktop/NestleIn/NestMapRepo/client/src/utils/tokenManager.ts`

**Total Errors:** 50

## Error Types:

### Property 'instance' does not exist on type 'typeof TokenManager'
```typescript
// Line 62, Character 25
TokenManager.instance;

// Line 66, Character 18
TokenManager.instance = null;
```

### Variable is declared but never used
```typescript
// Line 69, Character 11
'loadTokens' is declared but its value is never read.
```

### Property 'accessToken' does not exist on type 'TokenManager'
```typescript
// Line 74, Character 14
this.accessToken = tokens.accessToken;
```

### Cannot find name 'handleError'
```typescript
// Line 78, Character 7
handleError(error);
```

This file has the most TypeScript errors in the codebase (50 errors). The main issues appear to be related to:

1. Incorrect static property access
2. Unused variables/methods
3. Missing properties on the TokenManager class
4. Undefined references (like handleError)

The TokenManager class likely needs a significant refactoring to fix these type issues.
