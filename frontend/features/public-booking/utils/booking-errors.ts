import { ApiClientError } from "@/lib/api/errors";

export type BookingErrorView = {
  title: string;
  message: string;
};

export function getBookingErrorView(error: unknown): BookingErrorView {
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      if (error.code === "PUBLIC_BOOKING_DISABLED") {
        return {
          title: "Bookings paused",
          message:
            "This calendar is not currently accepting appointments. Please contact the business directly.",
        };
      }
      return {
        title: "Booking page unavailable",
        message:
          "This booking page could not be found or is no longer available.",
      };
    }
    if (error.status === 409 || error.code === "BOOKING_SLOT_UNAVAILABLE") {
      return {
        title: "Time no longer available",
        message:
          "Someone else may have booked this slot. Please choose another time.",
      };
    }
  }

  return {
    title: "Something went wrong",
    message: "We could not complete your booking. Please try again in a moment.",
  };
}
