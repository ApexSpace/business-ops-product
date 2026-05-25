export class ContactTagSummaryDto {
  id!: string;
  name!: string;
}

export class ContactResponseDto {
  id!: string;
  businessId!: string;
  firstName!: string | null;
  lastName!: string | null;
  displayName!: string | null;
  companyName!: string | null;
  email!: string | null;
  phoneCountryCode!: string | null;
  phoneNumber!: string | null;
  phone!: string | null;
  timezone!: string | null;
  address!: string | null;
  city!: string | null;
  state!: string | null;
  country!: string | null;
  zip!: string | null;
  avatarUrl!: string | null;
  source!: string | null;
  createdById!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  label!: string;
  tags!: ContactTagSummaryDto[];
}
