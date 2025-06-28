declare module 'ml-naivebayes' {
  export class GaussianNB {
    constructor(options?: Record<string, unknown>);
    train(X: number[][], y: number[]): void;
    predict(X: number[][]): number[];
    toJSON(): unknown;
  }
}
