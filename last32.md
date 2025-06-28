client/src/components/BookingWorkflow.tsx:462:6 - error TS1005: ')' expected.

462     };
         ~

client/src/lib/api/index.ts:14:3 - error TS1128: Declaration or statement expected.

14   } catch (error) {
     ~

client/src/lib/api/index.ts:14:5 - error TS1005: 'try' expected.

14   } catch (error) {
       ~~~~~

client/src/lib/api/index.ts:22:1 - error TS1128: Declaration or statement expected.

22 }
   ~

shared/src/fieldTransforms.ts:1:37 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './schema.js'?

1 import type { Trip, Activity } from './schema';
                                      ~~~~~~~~~~

shared/src/fieldTransforms.ts:10:9 - error TS2322: Type 'any[]' is not assignable to type 'T'.
  'T' could be instantiated with an arbitrary type which could be unrelated to 'any[]'.

10         return obj.map(item => snakeToCamel(item));
           ~~~~~~

shared/src/fieldTransforms.ts:28:9 - error TS2322: Type 'any[]' is not assignable to type 'T'.
  'T' could be instantiated with an arbitrary type which could be unrelated to 'any[]'.

28         return obj.map(item => camelToSnake(item));
           ~~~~~~

shared/src/types/api/index.ts:202:5 - error TS2698: Spread types may only be created from object types.

202     ...(options.details && { details: options.details }),
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

shared/src/types/auth/custom-request.ts:2:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './index.js'?

2 import type { AuthUser } from './index';
                                ~~~~~~~~~

shared/src/types/auth/index.ts:291:15 - error TS2305: Module '"./custom-request.js"' has no exported member 'CustomRequest'.

291 export type { CustomRequest as AuthCustomRequest } from './custom-request.js';
                  ~~~~~~~~~~~~~

shared/src/types/auth/jwt.ts:1:37 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

1 import type { User, UserRole } from '../user';
                                      ~~~~~~~~~

shared/src/types/index.ts:3:1 - error TS2308: Module './auth/index.js' has already exported a member named 'UserRole'. Consider explicitly re-exporting to resolve the ambiguity.

3 export * from './user/index.js';
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

shared/src/types/index.ts:23:15 - error TS2307: Cannot find module './ai/index.js' or its corresponding type declarations.

23 export * from './ai/index.js';
                 ~~~~~~~~~~~~~~~

shared/src/types/index.ts:26:15 - error TS2307: Cannot find module './collaboration/index.js' or its corresponding type declarations.

26 export * from './collaboration/index.js';
                 ~~~~~~~~~~~~~~~~~~~~~~~~~~

shared/src/types/index.ts:29:15 - error TS2307: Cannot find module './forms/index.js' or its corresponding type declarations.

29 export * from './forms/index.js';
                 ~~~~~~~~~~~~~~~~~~

shared/src/types/index.ts:32:15 - error TS2307: Cannot find module './map/index.js' or its corresponding type declarations.

32 export * from './map/index.js';
                 ~~~~~~~~~~~~~~~~

shared/utils/permissions.ts:9:8 - error TS2307: Cannot find module '../types/auth/permissions.js' or its corresponding type declarations.

9 } from '../types/auth/permissions.js'; // Added .js extension for ESM
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

shared/utils/permissions.ts:86:26 - error TS7006: Parameter 'c' implicitly has an 'any' type.

86       p.conditions?.some(c => this.evaluateCondition(c, context) === false)
                            ~

shared/utils/permissions.ts:92:43 - error TS7006: Parameter 'c' implicitly has an 'any' type.

92       !p.conditions || p.conditions.every(c => this.evaluateCondition(c, context))
                                             ~

shared/utils/schema-utils.ts:2:42 - error TS2307: Cannot find module '../types/core/base.js' or its corresponding type declarations.

2 import type { ID, ISO8601DateTime } from '../types/core/base.js';
                                           ~~~~~~~~~~~~~~~~~~~~~~~

shared/utils/schema-utils.ts:160:16 - error TS2664: Invalid module name in augmentation, module '../types/domain/user.js' cannot be found.

160 declare module '../types/domain/user.js' {
                   ~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/billing/invoices.ts:30:15 - error TS1005: ',' expected.

30     id: string;
                 ~

server/db/schema/billing/invoices.ts:31:19 - error TS1005: ',' expected.

31     amount: number;
                     ~

server/db/schema/billing/invoices.ts:32:21 - error TS1005: ',' expected.

32     currency: string;
                       ~

server/db/schema/billing/invoices.ts:33:24 - error TS1005: ',' expected.

33     description: string;
                          ~

server/db/schema/billing/invoices.ts:34:38 - error TS1005: ',' expected.

34     metadata: Record<string, unknown>;
                                        ~

server/db/schema/billing/invoices.ts:35:3 - error TS1136: Property assignment expected.

35   ?>>().default([]),
     ~

server/db/schema/billing/invoices.ts:35:4 - error TS1109: Expression expected.

35   ?>>().default([]),
      ~

server/db/schema/billing/invoices.ts:35:7 - error TS1109: Expression expected.

35   ?>>().default([]),
         ~

server/db/schema/billing/invoices.ts:35:20 - error TS1005: ':' expected.

35   ?>>().default([]),
                      ~

node_modules/@nestjs/terminus/index.ts:1:15 - error TS2307: Cannot find module './dist' or its corresponding type declarations.

1 export * from './dist';
                ~~~~~~~~

shared/interfaces.ts:133:31 - error TS2307: Cannot find module './types/auth/permissions.js' or its corresponding type declarations.

133 import type { UserRole } from './types/auth/permissions.js';
                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


Found 32 errors.