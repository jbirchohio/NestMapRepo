declare module 'ml-naivebayes' {
  export class GaussianNB {
    constructor(options?: any);
    train(X: number[][], y: number[]): void;
    predict(X: number[][]): number[];
    toJSON(): any;
  }
}
