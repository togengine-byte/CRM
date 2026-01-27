# Settings.tsx Refactoring Plan

## Current State Analysis

**Total Lines:** 1,969
**Target:** ~500-700 lines in main file

## File Structure

### Existing Components (already defined inside Settings.tsx)
1. **DeveloperLogsSettings** (lines 74-204) - 130 lines
2. **SupplierWeightsSettings** (lines 207-413) - 206 lines  
3. **EmailNotificationSettings** (lines 416-522) - 106 lines
4. **PricelistSettings** (lines 545-809) - 264 lines
5. **StaffManagementSettings** (lines 811-1311) - 500 lines

### Main Component Content (lines 1314-1969)
- **Validation Profiles Tab** - embedded in main component (~260 lines)
- **General Tab** - simple placeholder (~20 lines)
- **Security Tab** - simple placeholder (~15 lines)
- **Portals Tab** - embedded in main component (~130 lines)

## Refactoring Plan

### Phase 1: Extract Existing Components to Separate Files
These components are already self-contained, just need to move to separate files:

| Component | Lines | Target File |
|-----------|-------|-------------|
| DeveloperLogsSettings | 130 | `components/settings/DeveloperLogsSettings.tsx` |
| SupplierWeightsSettings | 206 | `components/settings/SupplierWeightsSettings.tsx` |
| EmailNotificationSettings | 106 | `components/settings/EmailNotificationSettings.tsx` |
| PricelistSettings | 264 | `components/settings/PricelistSettings.tsx` |
| StaffManagementSettings | 500 | `components/settings/StaffManagementSettings.tsx` |

### Phase 2: Extract Embedded Tab Content

| Tab Content | Lines | Target File |
|-------------|-------|-------------|
| ValidationProfilesTab | ~260 | `components/settings/ValidationProfilesSettings.tsx` |
| PortalsTab | ~130 | `components/settings/PortalsSettings.tsx` |

### Shared Dependencies

**Constants to extract:**
```typescript
// components/settings/constants.ts
export const PERMISSION_LIST = [...]
```

**Types to extract:**
```typescript
// components/settings/types.ts
export interface Permission {...}
export interface ValidationProfile {...}
```

## Execution Order

### Stage 1: Create folder structure and extract constants
1. Create `client/src/components/settings/` folder
2. Create `types.ts` with shared types
3. Create `constants.ts` with PERMISSION_LIST

### Stage 2: Extract DeveloperLogsSettings (simplest)
- Self-contained component
- No external dependencies
- Test after extraction

### Stage 3: Extract EmailNotificationSettings
- Uses useAuthContext
- Uses trpc
- Test after extraction

### Stage 4: Extract SupplierWeightsSettings
- Uses useAuthContext
- Uses trpc
- Uses Slider component
- Test after extraction

### Stage 5: Extract PricelistSettings
- Uses trpc
- Self-contained CRUD
- Test after extraction

### Stage 6: Extract StaffManagementSettings (largest)
- Uses PERMISSION_LIST constant
- Uses useAuthContext
- Multiple dialogs
- Test after extraction

### Stage 7: Extract ValidationProfilesSettings
- Currently embedded in main component
- Needs to extract form state and mutations
- Test after extraction

### Stage 8: Extract PortalsSettings
- Currently embedded in main component
- Uses setLocation
- Test after extraction

### Stage 9: Clean up main Settings.tsx
- Import all extracted components
- Keep only tab structure and routing
- Final testing

## Expected Final Structure

```
client/src/
├── components/
│   └── settings/
│       ├── index.ts                      # Re-exports
│       ├── types.ts                      # Shared types
│       ├── constants.ts                  # PERMISSION_LIST
│       ├── DeveloperLogsSettings.tsx     # 130 lines
│       ├── SupplierWeightsSettings.tsx   # 206 lines
│       ├── EmailNotificationSettings.tsx # 106 lines
│       ├── PricelistSettings.tsx         # 264 lines
│       ├── StaffManagementSettings.tsx   # 500 lines
│       ├── ValidationProfilesSettings.tsx# 260 lines
│       └── PortalsSettings.tsx           # 130 lines
└── pages/
    └── Settings.tsx                      # ~200 lines (tabs only)
```

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking imports | TypeScript will catch |
| Missing dependencies | Test after each stage |
| State management issues | Keep state in same component |
| trpc context issues | Import trpc in each file |

## Notes

- Each stage must pass TypeScript check
- Test manually after each stage
- Commit after each successful stage
- Do NOT touch supplier rating feature
