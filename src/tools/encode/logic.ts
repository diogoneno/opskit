import { base64DecodeText, base64EncodeText, bytesToHex, hexToBytes, utf8Decode, utf8Encode } from '../../lib/bytes';

export type Codec = 'base64' | 'base64url' | 'url' | 'hex';
export type Result = { ok: true; output: string } | { ok: false; error: string };

export function encode(text: string, codec: Codec): string {
  switch (codec) {
    case 'base64':
      return base64EncodeText(text);
    case 'base64url':
      return base64EncodeText(text, true);
    case 'url':
      return encodeURIComponent(text);
    case 'hex':
      return bytesToHex(utf8Encode(text));
  }
}

export function decode(text: string, codec: Codec): string {
  switch (codec) {
    case 'base64':
    case 'base64url':
      return base64DecodeText(text);
    case 'url':
      return decodeURIComponent(text.replace(/\+/g, ' '));
    case 'hex':
      return utf8Decode(hexToBytes(text));
  }
}

export function run(text: string, codec: Codec, mode: 'encode' | 'decode'): Result {
  try {
    return { ok: true, output: mode === 'encode' ? encode(text, codec) : decode(text, codec) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
