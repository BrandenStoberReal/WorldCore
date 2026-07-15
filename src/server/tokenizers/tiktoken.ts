import { get_encoding, type TiktokenEncoding } from 'tiktoken';
import type { Tokenizer } from './index';

export class TiktokenTokenizer implements Tokenizer {
  private encoding: ReturnType<typeof get_encoding>;

  constructor(model: string) {
    const encodingName = this.getEncodingName(model);
    this.encoding = get_encoding(encodingName);
  }

  encode(text: string): number[] {
    return Array.from(this.encoding.encode(text));
  }

  decode(tokens: number[]): string {
    const decoder = new TextDecoder();
    return decoder.decode(this.encoding.decode(new Uint32Array(tokens)));
  }

  countTokens(text: string): number {
    return this.encoding.encode_ordinary(text).length;
  }

  private getEncodingName(model: string): TiktokenEncoding {
    if (/gpt-3\.5|gpt-4/i.test(model)) return 'cl100k_base';
    if (/gpt-4o/i.test(model)) return 'cl100k_base';
    if (/text-davinci/i.test(model)) return 'p50k_base';
    if (/text-embedding/i.test(model)) return 'cl100k_base';
    return 'cl100k_base';
  }
}
