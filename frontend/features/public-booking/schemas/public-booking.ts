export interface PublicBookingFormSettings {
  requireEmail: boolean;
  requirePhone: boolean;
  showNotes: boolean;
  showBookForSomeoneElse: boolean;
  cancellationPolicyText: string | null;
  cancellationPolicyHtml?: string | null;
  cancellationPolicySms?: string | null;
  requirePolicyAgreement: boolean;
}

export interface PublicBookingRulesSummary {
  minimumNoticeMinutes: number;
  maxBookingDays: number;
  allowMultipleServices: boolean;
  allowDuplicateServices: boolean;
  singleStaffOnly: boolean;
  waitlistEnabled: boolean;
}

export interface PublicBookingBusiness {
  slug: string;
  businessName: string;
  title: string;
  description: string | null;
  timezone: string;
  logoUrl: string | null;
  brandColor: string | null;
  websiteUrl: string | null;
  locationType: string;
  locationSummary: string | null;
  formSettings: PublicBookingFormSettings;
  confirmationMessage: string;
  redirectUrl: string | null;
  buttonText: string;
  embedEnabled: boolean;
  bookingRules: PublicBookingRulesSummary;
  giftCardUrl: string | null;
  packageUrl: string | null;
}

/** @deprecated */
export type PublicBookingCalendar = PublicBookingBusiness & {
  name: string;
  durationMinutes: number;
  color: string | null;
};

export interface PublicBookingCatalogService {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  durationMinutes: number;
  clientOccupancyMinutes: number;
  categoryId: string;
  categoryName: string;
  requireHomeAddress?: boolean;
  paymentRequired?: boolean;
  servicePrice?: string | null;
}

export interface PublicBookingCatalogCategory {
  id: string;
  name: string;
  services: PublicBookingCatalogService[];
}

export interface PublicBookingStaff {
  id: string;
  name: string;
  avatarUrl: string | null;
  gender: string | null;
  price: string | null;
  durationMinutes: number;
  clientOccupancyMinutes: number;
  availabilityLabel: string;
  isAnyone?: boolean;
}

export interface PublicBookingSlot {
  startAt: string;
  endAt: string;
  label: string;
  available: boolean;
  staffId?: string;
  serviceLines?: PublicBookingChainedSlotLine[];
}

export interface PublicBookingChainedSlotLine {
  serviceId: string;
  staffId: string;
  startAt: string;
  endAt: string;
}

export interface PublicBookingServiceLineSelection {
  service: PublicBookingCatalogService;
  staff: PublicBookingStaff;
}

export interface PublicBookingDayAvailability {
  date: string;
  slots: PublicBookingSlot[];
}

export interface PublicBookingConfirmation {
  appointmentId: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: string;
  businessName: string;
  serviceName: string | null;
  staffName: string | null;
  serviceLines: PublicBookingConfirmationServiceLine[];
  confirmationMessage: string;
  redirectUrl: string | null;
  locationSummary: string | null;
  collectPhotosEnabled: boolean;
  photoUploadPrompt: string | null;
  uploadToken: string | null;
}

export interface PublicBookingConfirmationServiceLine {
  serviceId: string;
  serviceName: string;
  staffId: string | null;
  staffName: string | null;
  startAt: string;
  endAt: string;
  price: string | null;
}
