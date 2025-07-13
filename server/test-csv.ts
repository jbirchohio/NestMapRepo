import { stringify } from 'csv-stringify';

const data = [['a', 'b'], ['c', 'd']];
const output = stringify(data);

console.log(output);
