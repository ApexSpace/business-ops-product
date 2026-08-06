/**
 * Build a forest of comment trees from a flat list.
 * Prefers parentCommentId; falls back to parentExternalCommentId so rows
 * that only have the external parent link still nest correctly.
 */
export type CommentForestNode<T> = T & { replies: CommentForestNode<T>[] };

export function buildCommentForest<
  T extends {
    id: string;
    parentCommentId: string | null;
    externalCommentId?: string;
    parentExternalCommentId?: string | null;
  },
>(comments: T[]): CommentForestNode<T>[] {
  type Node = CommentForestNode<T>;
  const byId = new Map<string, Node>();
  const byExternal = new Map<string, Node>();

  for (const comment of comments) {
    const node: Node = { ...comment, replies: [] };
    byId.set(comment.id, node);
    if (comment.externalCommentId) {
      byExternal.set(comment.externalCommentId, node);
    }
  }

  const roots: Node[] = [];
  for (const node of byId.values()) {
    let parent: Node | undefined;
    if (node.parentCommentId) {
      parent = byId.get(node.parentCommentId);
    }
    if (
      !parent &&
      node.parentExternalCommentId &&
      node.parentExternalCommentId !== node.externalCommentId
    ) {
      parent = byExternal.get(node.parentExternalCommentId);
    }

    if (parent && parent.id !== node.id) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: Node[]) => {
    nodes.sort((a, b) => {
      const aTime =
        'externalCreatedAt' in a && a.externalCreatedAt instanceof Date
          ? a.externalCreatedAt.getTime()
          : 0;
      const bTime =
        'externalCreatedAt' in b && b.externalCreatedAt instanceof Date
          ? b.externalCreatedAt.getTime()
          : 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.id.localeCompare(b.id);
    });
    for (const child of nodes) sortNodes(child.replies);
  };
  sortNodes(roots);

  return roots;
}
