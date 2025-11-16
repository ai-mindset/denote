import { parseArgs } from "jsr:@std/cli@1.0.6";

export interface CliArgs {
  days: number;
  config: string;
  help: boolean;
}

export function parseCliArgs(): CliArgs {
  const args = parseArgs(Deno.args, {
    default: {
      days: 7,
      config: "./ai_config.json",
      help: false,
    },
    string: ["config"],
    boolean: ["help"],
    alias: {
      d: "days",
      c: "config",
      h: "help",
    },
  });

  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  return {
    days: Number(args.days),
    config: String(args.config),
    help: args.help,
  };
}

function printHelp() {
  console.log(`
RSS Feed Summarizer

Usage:
  deno run --allow-net --allow-read --allow-write main.ts [options]

Options:
  -c, --config <path>    Path to config JSON file (default: ./ai_config.json)
  -d, --days <number>    Number of days to look back (default: 7)
  -h, --help             Show this help message

Examples:
  deno run --allow-net --allow-read --allow-write main.ts --config=my_config.json
  deno run --allow-net --allow-read --allow-write main.ts -c custom.json -d 14
  `);
}
