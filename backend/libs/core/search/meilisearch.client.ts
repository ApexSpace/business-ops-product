import { Injectable, Logger } from '@nestjs/common';

/** Optional Meilisearch client — active only when SEARCH_PROVIDER=meilisearch */
@Injectable()
export class MeilisearchClient {
  private readonly logger = new Logger(MeilisearchClient.name);
  private readonly enabled =
    (process.env.SEARCH_PROVIDER ?? 'postgres') === 'meilisearch';

  isEnabled(): boolean {
    return this.enabled && Boolean(process.env.MEILISEARCH_URL);
  }

  async upsertDocument(
    index: string,
    document: Record<string, unknown>,
  ): Promise<void> {
    if (!this.isEnabled()) return;
    const url = process.env.MEILISEARCH_URL;
    const key = process.env.MEILISEARCH_API_KEY;
    try {
      await fetch(`${url}/indexes/${index}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { Authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify([document]),
      });
    } catch (err) {
      this.logger.warn(
        `Meilisearch upsert failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
