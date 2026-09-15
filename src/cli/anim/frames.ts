export const SPINNER_FRAMES = {
  braille: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  dots:    ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  pulse:   ["●", "◐", "◓", "◑", "◒"],
  arrows:  ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
} as const;

export type SpinnerStyle = keyof typeof SPINNER_FRAMES;