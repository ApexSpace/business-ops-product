import {
  isValidBookingSlug,
  slugifyBookingSlug,
} from '@app/modules/operations/public-booking/utils/booking-slug.util';

export { isValidBookingSlug, slugifyBookingSlug };

export function slugifyGiftCardPublicSlug(input: string): string {
  return slugifyBookingSlug(input);
}
