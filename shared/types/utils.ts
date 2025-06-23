// Type utilities and helpers
/**
 * Make specific properties of a type required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
/**
 * Make specific properties of a type optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/**
 * Make specific properties of a type required and the rest optional
 */
export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;
/**
 * Make all properties mutable (remove readonly)
 */
export type Mutable<T> = {
    -readonly [P in keyof T]: T[P] extends object ? Mutable<T[P]> : T[P];
};
/**
 * Recursively make all properties required and not null
 */
export type DeepRequired<T> = T extends object ? {
    [P in keyof T]-?: NonNullable<DeepRequired<T[P]>>;
} : NonNullable<T>;
/**
 * Type for constructor functions
 */
export type Constructor<T = object> = new (...args: any[]) => T;
/**
 * Type for class constructors that might be abstract
 */
export type AbstractConstructor<T = object> = abstract new (...args: any[]) => T;
/**
 * Type for object with string keys and values of type T
 */
export type StringKeyObject<T> = {
    [key: string]: T;
};
/**
 * Type for object with string or number keys and values of type T
 */
export type KeyValueObject<T> = {
    [key: string | number]: T;
};
/**
 * Type for a dictionary with string keys and values of type T
 */
export type Dictionary<T> = {
    [key: string]: T;
};
/**
 * Type for a readonly dictionary
 */
export type ReadonlyDictionary<T> = {
    readonly [key: string]: T;
};
/**
 * Type for a function that takes no arguments and returns a value of type T
 */
export type Supplier<T> = () => T;
/**
 * Type for a function that takes a value of type T and returns void
 */
export type Consumer<T> = (value: T) => void;
/**
 * Type for a function that transforms a value of type T to type R
 */
export type Mapper<T, R> = (value: T) => R;
/**
 * Type for a function that takes a value of type T and returns a boolean
 */
export type Predicate<T> = (value: T) => boolean;
/**
 * Type for a function that compares two values of type T
 */
export type Comparator<T> = (a: T, b: T) => number;
/**
 * Type for a function that reduces two values of type T to a single value of type R
 */
export type Reducer<T, R> = (accumulator: R, current: T) => R;
/**
 * Type for a function that takes a value of type T and returns a Promise of type R
 */
export type AsyncMapper<T, R> = (value: T) => Promise<R>;
/**
 * Type for a function that takes a value of type T and returns a Promise of boolean
 */
export type AsyncPredicate<T> = (value: T) => Promise<boolean>;
/**
 * Type for a function that takes no arguments and returns a Promise of type T
 */
export type AsyncSupplier<T> = () => Promise<T>;
/**
 * Type for a function that takes a value of type T and returns a Promise of void
 */
export type AsyncConsumer<T> = (value: T) => Promise<void>;
/**
 * Type for a function that can be either synchronous or asynchronous
 */
export type MaybeAsync<T> = T | Promise<T>;
/**
 * Type for a function that can be called with or without a callback
 */
export type Callbackable<T, R> = {
    (): Promise<R>;
    (callback: (error: Error | null, result?: R) => void): void;
};
/**
 * Type for a function that can be called with or without a callback
 */
export type NodeStyleCallback<T> = (error: Error | null, result?: T) => void;
/**
 * Type for a function that can be called with a Node-style callback
 */
export type NodeStyleFunction<T> = (callback: NodeStyleCallback<T>) => void;
/**
 * Type for a function that can be called with a Node-style callback or returns a Promise
 */
export type PromisifiedFunction<T> = {
    (): Promise<T>;
    (callback: NodeStyleCallback<T>): void;
};
/**
 * Type for a constructor function that can be called with 'new' or as a function
 */
export type Newable<T, TArgs extends any[] = any[]> = {
    new (...args: TArgs): T;
    (...args: TArgs): T;
};
/**
 * Type for a class with a static create method
 */
export type Creatable<T, TArgs extends any[] = any[]> = {
    new (...args: TArgs): T;
    create(...args: TArgs): T;
};
/**
 * Type for a class with a static from method
 */
export type Fromable<T, TFrom, TArgs extends any[] = any[]> = {
    new (...args: TArgs): T;
    from(source: TFrom, ...args: any[]): T;
};
/**
 * Type for a class with a static of method
 */
export type Ofable<T, TArgs extends any[] = any[]> = {
    new (...args: TArgs): T;
    of(...args: TArgs): T;
};
/**
 * Type for a class with a static empty method
 */
export type Emptyable<T> = {
    new (): T;
    empty(): T;
};
/**
 * Type for a class with a static is method
 */
export type TypeGuard<T> = {
    (value: unknown): value is T;
};
/**
 * Type for a class with a static from method that acts as a type guard
 */
export type TypeGuardFrom<T, TFrom> = {
    (value: TFrom): value is TFrom & T;
};
/**
 * Type for a class with a static is method that acts as a type guard
 */
export type TypeGuardIs<T> = {
    is(value: unknown): value is T;
};
/**
 * Type for a class with a static from method that acts as a type guard
 */
export type TypeGuardFromMethod<T, TFrom> = {
    from(value: TFrom): value is TFrom & T;
};
/**
 * Type for a class with a static create method that acts as a type guard
 */
export type TypeGuardCreate<T, TArgs extends any[] = any[]> = {
    create(...args: TArgs): T;
    is(value: unknown): value is T;
};
/**
 * Type for a class with a static from method that acts as a type guard
 */
export type TypeGuardFromCreate<T, TFrom> = {
    from(source: TFrom, ...args: any[]): T;
    is(value: unknown): value is TFrom & T;
};
