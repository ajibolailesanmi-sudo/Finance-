import type { MessageParser, ParseContext, ParsedMessage } from "./types.js";

/** Use the primary parser (Claude); if it fails for any reason, fall back to the keyword parser. */
export class FallbackParser implements MessageParser {
  readonly name: string;

  constructor(
    private readonly primary: MessageParser,
    private readonly backup: MessageParser,
    private readonly log: (msg: string) => void = (m) => console.warn(m),
  ) {
    this.name = `${primary.name}+${backup.name}`;
  }

  async parse(text: string, ctx: ParseContext): Promise<ParsedMessage> {
    try {
      return await this.primary.parse(text, ctx);
    } catch (err) {
      this.log(`[parser] ${this.primary.name} failed, using ${this.backup.name}: ${(err as Error).message}`);
      return this.backup.parse(text, ctx);
    }
  }
}

export type { MessageParser, ParseContext, ParsedMessage } from "./types.js";
