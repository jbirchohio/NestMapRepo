declare module 'ml-naivebayes' {
  export class GaussianNB {
    constructor(options?: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */);
    train(X: number[][], y: number[]): void;
    predict(X: number[][]): number[];
    toJSON(): any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
  }
}
