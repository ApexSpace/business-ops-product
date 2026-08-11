import type { FieldDefinition } from '../constants/data-io.constants';

export const CONTACT_FIELDS: FieldDefinition[] = [
  {
    key: 'id',
    label: 'Contact ID',
    aliases: ['id', 'contact_id', 'record_id', 'client_id'],
  },
  {
    key: 'firstName',
    label: 'First Name',
    aliases: ['first_name', 'first', 'given_name', 'fname'],
  },
  {
    key: 'lastName',
    label: 'Last Name',
    aliases: ['last_name', 'last', 'surname', 'family_name', 'lname'],
  },
  {
    key: 'fullName',
    label: 'Full Name',
    aliases: [
      'full_name',
      'name',
      'client_name',
      'customer_name',
      'contact_name',
    ],
  },
  {
    key: 'displayName',
    label: 'Display Name',
    aliases: ['display_name', 'preferred_name'],
  },
  {
    key: 'companyName',
    label: 'Company',
    aliases: ['company', 'company_name', 'business_name', 'organization'],
  },
  {
    key: 'email',
    label: 'Email',
    aliases: ['email', 'e_mail', 'email_address', 'client_email'],
  },
  {
    key: 'phone',
    label: 'Phone',
    aliases: [
      'phone',
      'mobile',
      'mobile_phone',
      'cell',
      'cellphone',
      'phone_number',
      'telephone',
    ],
  },
  {
    key: 'phoneCountryCode',
    label: 'Phone Country Code',
    aliases: ['phone_country_code', 'country_code', 'dial_code'],
  },
  {
    key: 'phoneNumber',
    label: 'Phone Number',
    aliases: ['phone_number_only', 'national_number'],
  },
  {
    key: 'timezone',
    label: 'Timezone',
    aliases: ['timezone', 'time_zone', 'tz'],
  },
  {
    key: 'address',
    label: 'Address',
    aliases: ['address', 'street', 'street_address', 'address1'],
  },
  {
    key: 'city',
    label: 'City',
    aliases: ['city', 'town'],
  },
  {
    key: 'state',
    label: 'State',
    aliases: ['state', 'province', 'region'],
  },
  {
    key: 'country',
    label: 'Country',
    aliases: ['country', 'country_code_name'],
  },
  {
    key: 'zip',
    label: 'ZIP / Postal Code',
    aliases: ['zip', 'zip_code', 'postal_code', 'postcode'],
  },
  {
    key: 'clientNotes',
    label: 'Notes',
    aliases: ['notes', 'client_notes', 'comments', 'memo'],
  },
  {
    key: 'source',
    label: 'Source',
    aliases: ['source', 'referral_source', 'lead_source'],
  },
  {
    key: 'tags',
    label: 'Tags',
    aliases: ['tags', 'labels', 'tag'],
  },
];

/** Extra aliases applied when user picks a provider preset */
export const CONTACT_PROVIDER_ALIASES: Record<
  string,
  Record<string, string[]>
> = {
  mangomint: {
    firstName: ['client_first_name'],
    lastName: ['client_last_name'],
    email: ['client_email'],
    phone: ['client_phone', 'client_mobile'],
    clientNotes: ['client_note', 'note'],
  },
  fresha: {
    firstName: ['first'],
    lastName: ['last'],
    phone: ['mobile_phone', 'mobile'],
    clientNotes: ['client_notes'],
  },
  square: {
    fullName: ['nickname'],
    phone: ['phone_number'],
    email: ['email_address'],
  },
  salesforce: {
    firstName: ['firstname'],
    lastName: ['lastname'],
    email: ['email'],
    phone: ['phone', 'mobilephone'],
    companyName: ['account'],
  },
  hubspot: {
    firstName: ['firstname'],
    lastName: ['lastname'],
    email: ['email'],
    phone: ['phone', 'mobilephone'],
    companyName: ['company'],
  },
  vagaro: {
    fullName: ['customer', 'customer_name'],
    phone: ['cellphone', 'homephone'],
  },
};
