# Shared Type Definitions

This directory contains the canonical TypeScript types used across the project.
Legacy definitions in `shared/types` are being phased out in favour of these
files.

## Breaking Change
- Auth related types have moved from `shared/types/auth` to
  `shared/src/types/auth`. Aliases remain for now but will be removed in a future
  release.
