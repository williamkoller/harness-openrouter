export const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  italic: "\x1b[3m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

export const paint = {
  dim: (s: string) => `${c.dim}${s}${c.reset}`,
  bold: (s: string) => `${c.bold}${s}${c.reset}`,
  cyan: (s: string) => `${c.cyan}${s}${c.reset}`,
  green: (s: string) => `${c.green}${s}${c.reset}`,
  yellow: (s: string) => `${c.yellow}${s}${c.reset}`,
  magenta: (s: string) => `${c.magenta}${s}${c.reset}`,
  red: (s: string) => `${c.red}${s}${c.reset}`,
  gray: (s: string) => `${c.gray}${s}${c.reset}`,
  italic: (s: string) => `${c.italic}${s}${c.reset}`,
};