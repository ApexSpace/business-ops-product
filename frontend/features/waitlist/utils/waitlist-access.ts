/**
 * Waitlist staff chrome (toolbar + summary poll) requires both:
 * - plan entitlement `appointments.waitlist` (BE `@RequireCapability`)
 * - staff permission `appointments.manage_waitlist` (OWNER/ADMIN implied)
 */
export function canShowWaitlistChrome(args: {
  hasWaitlistCapability: boolean;
  canManageWaitlist: boolean;
}): boolean {
  return args.hasWaitlistCapability && args.canManageWaitlist;
}
