import type { SseClientOptions } from "./sse-client-compat.types";
import { SseTransport } from "./sse-transport";

/**
 * Backward-compatible wrapper used by use-business-events until Phase 2.
 */
export class SseClient {
  private readonly transport: SseTransport;

  constructor(options: SseClientOptions) {
    this.transport = new SseTransport(options);
  }

  connect(): void {
    this.transport.connect();
  }

  close(): void {
    this.transport.close();
  }
}
