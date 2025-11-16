export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
};

export class PrettyConsole {
  static header(text: string) {
    console.log(`\n${colors.bright}${colors.cyan}╔${"═".repeat(text.length + 2)}╗${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║ ${text} ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}╚${"═".repeat(text.length + 2)}╝${colors.reset}\n`);
  }

  static section(text: string) {
    console.log(`\n${colors.bright}${colors.blue}▶ ${text}${colors.reset}`);
  }

  static success(text: string) {
    console.log(`${colors.green}✓ ${text}${colors.reset}`);
  }

  static info(text: string) {
    console.log(`${colors.cyan}ℹ ${text}${colors.reset}`);
  }

  static progress(current: number, total: number, text: string) {
    const percent = Math.round((current / total) * 100);
    const bar = "█".repeat(Math.floor(percent / 5)) + "░".repeat(20 - Math.floor(percent / 5));
    console.log(`${colors.magenta}[${bar}] ${percent}%${colors.reset} ${text}`);
  }

  static summary(items: Array<[string, string | number]>) {
    console.log();
    for (const [key, value] of items) {
      console.log(`  ${colors.dim}${key}:${colors.reset} ${colors.bright}${value}${colors.reset}`);
    }
    console.log();
  }
}
