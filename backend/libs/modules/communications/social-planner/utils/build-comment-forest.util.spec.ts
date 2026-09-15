import { buildCommentForest } from './build-comment-forest.util';

describe('buildCommentForest', () => {
  it('nests reply-to-reply under the parent reply', () => {
    const roots = buildCommentForest([
      { id: 'c1', parentCommentId: null, message: 'Hello' },
      { id: 'c2', parentCommentId: 'c1', message: 'thanks brother' },
      { id: 'c3', parentCommentId: null, message: 'Good one' },
      { id: 'c4', parentCommentId: 'c3', message: 'thanks g' },
      { id: 'c5', parentCommentId: 'c4', message: 'goood one this one' },
    ]);

    expect(roots).toHaveLength(2);
    expect(roots[0]!.message).toBe('Hello');
    expect(roots[0]!.replies).toHaveLength(1);
    expect(roots[0]!.replies[0]!.message).toBe('thanks brother');
    expect(roots[0]!.replies[0]!.replies).toHaveLength(0);

    expect(roots[1]!.message).toBe('Good one');
    expect(roots[1]!.replies[0]!.message).toBe('thanks g');
    expect(roots[1]!.replies[0]!.replies).toHaveLength(1);
    expect(roots[1]!.replies[0]!.replies[0]!.message).toBe(
      'goood one this one',
    );
  });

  it('treats orphans as roots when parent is missing', () => {
    const roots = buildCommentForest([
      { id: 'child', parentCommentId: 'missing', message: 'orphan' },
    ]);
    expect(roots).toHaveLength(1);
    expect(roots[0]!.id).toBe('child');
  });

  it('nests via parentExternalCommentId when parentCommentId is null', () => {
    const roots = buildCommentForest([
      {
        id: 'c3',
        externalCommentId: 'ext-good',
        parentCommentId: null,
        parentExternalCommentId: null,
        message: 'Good one',
      },
      {
        id: 'c4',
        externalCommentId: 'ext-thanks',
        parentCommentId: null,
        parentExternalCommentId: 'ext-good',
        message: 'thanks g',
      },
      {
        id: 'c5',
        externalCommentId: 'ext-deep',
        parentCommentId: null,
        parentExternalCommentId: 'ext-thanks',
        message: 'goood one this one',
      },
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0]!.replies[0]!.replies[0]!.message).toBe(
      'goood one this one',
    );
  });
});
