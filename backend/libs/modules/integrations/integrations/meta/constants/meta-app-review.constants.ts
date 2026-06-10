/**
 * Meta App Review — why each permission is requested.
 * Reference in manage UI and screen recordings for App Review.
 */
export const META_APP_REVIEW_PERMISSION_NOTES: Record<
  string,
  { title: string; purpose: string }[]
> = {
  whatsapp: [
    {
      title: 'whatsapp_business_management',
      purpose:
        'Connect the customer WhatsApp Business Account (WABA) and list phone numbers for messaging.',
    },
    {
      title: 'whatsapp_business_messaging',
      purpose:
        'Send and receive customer WhatsApp messages through the unified inbox (future).',
    },
    {
      title: 'business_management',
      purpose:
        'Complete Embedded Signup onboarding and access business-owned WABA resources.',
    },
  ],
  facebook: [
    {
      title: 'pages_show_list',
      purpose:
        'List Facebook Pages the customer manages so they can choose which Page to use.',
    },
    {
      title: 'pages_messaging',
      purpose: 'Receive and respond to Facebook Page Messenger conversations.',
    },
    {
      title: 'pages_manage_metadata',
      purpose:
        'Read Page metadata (name, category, picture) for resource selection in settings.',
    },
  ],
  instagram: [
    {
      title: 'instagram_basic',
      purpose:
        'List Instagram professional accounts linked to the customer Pages.',
    },
    {
      title: 'instagram_manage_messages',
      purpose: 'Receive and respond to Instagram Direct messages.',
    },
    {
      title: 'pages_show_list',
      purpose: 'Discover Pages linked to Instagram business accounts.',
    },
  ],
};
