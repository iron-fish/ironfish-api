/* eslint-disable */
// @ts-ignore
const replace = (exp) => (rep) => (str) => str.replace(exp, rep);
// @ts-ignore
const split = (delim) => (str) => str.split(delim);
// @ts-ignore
const join = (delim) => (arr) => arr.join(delim);
// @ts-ignore
function map(fn) {
  // @ts-ignore
  return (list) => list.map(fn);
}

// @ts-ignore
function pipe(...fns) {
  // @ts-ignore
  return (x) => fns.reduce((run, step) => step(run), x);
}

// @ts-ignore
const replaceArg = (x, given) => (y) =>
  replace(new RegExp(`\\$${x}`, 'g'))(given)(y);

// @ts-ignore
export const formatForUseInPSQL = (query, args) =>
  pipe(
    split('\n'),
    // @ts-ignore
    map(pipe(...args.map((x, i) => replaceArg(i + 1, x)))),
    join('\n'),
  )(query);
