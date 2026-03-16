import '@testing-library/jest-dom';
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';

if (!globalThis.ReadableStream) {
  // @ts-expect-error - jsdom types don't include Node's web streams
  globalThis.ReadableStream = ReadableStream;
}
if (!globalThis.WritableStream) {
  // @ts-expect-error - jsdom types don't include Node's web streams
  globalThis.WritableStream = WritableStream;
}
if (!globalThis.TransformStream) {
  // @ts-expect-error - jsdom types don't include Node's web streams
  globalThis.TransformStream = TransformStream;
}
