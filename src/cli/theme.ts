export const c = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m", italic: "\x1b[3m",
  cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m",
  magenta: "\x1b[35m", red: "\x1b[31m", gray: "\x1b[90m",
};

const wrap = (code: string) => (s: string) => `${code}${s}${c.reset}`;

export const paint = {
  dim: wrap(c.dim), bold: wrap(c.bold), italic: wrap(c.italic),
  cyan: wrap(c.cyan), green: wrap(c.green), yellow: wrap(c.yellow),
  magenta: wrap(c.magenta), red: wrap(c.red), gray: wrap(c.gray),
};