export interface ContactTag {
  id: string;
  name: string;
}

export interface Contact {
  id: string;
  businessId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  companyName: string | null;
  email: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  phone: string | null;
  timezone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
  avatarUrl: string | null;
  source: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  label: string;
  tags: ContactTag[];
}
