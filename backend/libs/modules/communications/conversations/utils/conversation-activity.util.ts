export const CONVERSATION_ACTIVITY_TYPES = {
  CONTACT_BLOCKED: 'CONTACT_BLOCKED',
  CONTACT_UNBLOCKED: 'CONTACT_UNBLOCKED',
  MARKED_SPAM: 'MARKED_SPAM',
  UNMARKED_SPAM: 'UNMARKED_SPAM',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED',
} as const;

export type ConversationActivityType =
  (typeof CONVERSATION_ACTIVITY_TYPES)[keyof typeof CONVERSATION_ACTIVITY_TYPES];

export const CONVERSATION_ACTIVITY_LABELS: Record<
  ConversationActivityType,
  string
> = {
  CONTACT_BLOCKED: 'You blocked this contact',
  CONTACT_UNBLOCKED: 'You unblocked this contact',
  MARKED_SPAM: 'Conversation marked as spam',
  UNMARKED_SPAM: 'Conversation marked as not spam',
  CLOSED: 'Conversation closed',
  REOPENED: 'Conversation reopened',
};
