import { mapGraphComment } from './facebook-engagement.adapter';
import {
  extractMetaWebhookEventId,
  hasMetaSocialCommentChanges,
} from '@app/modules/integrations/integrations/meta/utils/meta-webhook-event-id.util';

describe('mapGraphComment', () => {
  it('prefers name then username for author', () => {
    expect(
      mapGraphComment({
        id: 'c1',
        message: 'hi',
        from: { username: 'gothic' },
        like_count: 2,
      }).authorName,
    ).toBe('gothic');

    expect(
      mapGraphComment({
        id: 'c2',
        message: 'hello',
        from: { name: 'Ada', username: 'ada' },
      }).authorName,
    ).toBe('Ada');
  });

  it('maps nested replies with parent id', () => {
    const mapped = mapGraphComment({
      id: 'parent',
      message: 'top',
      comments: {
        data: [{ id: 'child', message: 'reply', from: { name: 'Bob' } }],
      },
    });
    expect(mapped.replies).toHaveLength(1);
    expect(mapped.replies[0].parentExternalCommentId).toBe('parent');
    expect(mapped.replies[0].message).toBe('reply');
  });

  it('maps Instagram text/timestamp/replies fields', () => {
    const mapped = mapGraphComment({
      id: 'ig1',
      text: 'hello ig',
      timestamp: '2026-08-03T12:00:00+0000',
      from: { username: 'gothic' },
      replies: {
        data: [{ id: 'ig2', text: 'nested', from: { username: 'reply_user' } }],
      },
    });
    expect(mapped.message).toBe('hello ig');
    expect(mapped.createdTime).toBe('2026-08-03T12:00:00+0000');
    expect(mapped.authorName).toBe('gothic');
    expect(mapped.replies[0].message).toBe('nested');
  });

  it('maps reply-to-reply nesting from Graph', () => {
    const mapped = mapGraphComment({
      id: 'top',
      text: 'Good one',
      replies: {
        data: [
          {
            id: 'mid',
            text: 'thanks g',
            replies: {
              data: [{ id: 'deep', text: 'goood one this one' }],
            },
          },
        ],
      },
    });
    expect(mapped.replies[0]!.replies).toHaveLength(1);
    expect(mapped.replies[0]!.replies[0]!.message).toBe('goood one this one');
    expect(mapped.replies[0]!.replies[0]!.parentExternalCommentId).toBe('mid');
  });
});

describe('meta webhook comment helpers', () => {
  it('detects feed and instagram comment changes', () => {
    expect(
      hasMetaSocialCommentChanges({
        object: 'page',
        entry: [{ changes: [{ field: 'feed', value: { item: 'comment' } }] }],
      }),
    ).toBe(true);

    expect(
      hasMetaSocialCommentChanges({
        object: 'instagram',
        entry: [{ changes: [{ field: 'comments', value: { id: '1' } }] }],
      }),
    ).toBe(true);

    expect(
      hasMetaSocialCommentChanges({
        object: 'page',
        entry: [{ messaging: [{ message: { mid: 'm1' } }] }],
      }),
    ).toBe(false);
  });

  it('extracts comment event ids for dedupe', () => {
    expect(
      extractMetaWebhookEventId({
        entry: [
          {
            changes: [
              {
                field: 'feed',
                value: { comment_id: '123', item: 'comment' },
              },
            ],
          },
        ],
      }),
    ).toBe('comment:123');

    expect(
      extractMetaWebhookEventId({
        entry: [
          {
            changes: [
              {
                field: 'comments',
                value: { id: 'ig1', media: { id: 'm1' } },
              },
            ],
          },
        ],
      }),
    ).toBe('ig-comment:ig1');
  });
});
