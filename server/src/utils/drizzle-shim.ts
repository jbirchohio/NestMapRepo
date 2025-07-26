// drizzle-shim.ts
//
// Shim to access internal Drizzle ORM v0.39.3 helpers that
// are not re-exported via package.json "exports".

// @ts-expect-error Internal import bypass
import { eq, and, or, not, inArray, notInArray, gt, gte, lt, lte, ne, desc, asc, isNull, isNotNull, like, notLike } from "drizzle-orm/sql/operators";

// @ts-expect-error Internal import bypass
import { sql, raw, placeholder } from "drizzle-orm/sql/sql";

import { count, countDistinct, avg, avgDistinct, sum, sumDistinct, max, min } from "drizzle-orm/sql/functions";

export type { InferSelectModel } from "drizzle-orm/table";

// Re-export
export {
  eq,
  and,
  or,
  not,
  inArray,
  notInArray,
  gt,
  gte,
  lt,
  lte,
  ne,
  desc,
  asc,
  isNull,
  isNotNull,
  like,
  notLike,
  sql,
  raw,
  placeholder,
  count,
  countDistinct,
  avg,
  avgDistinct,
  sum,
  sumDistinct,
  max,
  min
};

