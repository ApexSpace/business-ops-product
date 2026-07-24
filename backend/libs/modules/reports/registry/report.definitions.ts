import type { ReportDefinition } from '../contracts/report-document';

const DATE_RANGE: ReportDefinition['filters'][number] = {
  key: 'dateRange',
  label: 'Date range',
  type: 'date_range',
  defaultValue: 'today',
};

function def(
  partial: Omit<ReportDefinition, 'filters'> & {
    filters?: ReportDefinition['filters'];
  },
): ReportDefinition {
  const { filters, ...rest } = partial;
  return {
    syncMaxDateSpanDays: 31,
    ...rest,
    filters: filters ?? [DATE_RANGE],
  };
}

/**
 * Full catalog of Mangomint-parity + CodeSol reports.
 * Deferred entries stay in the registry for documentation / future providers.
 */
export const REPORT_DEFINITIONS: ReportDefinition[] = [
  // —— Staff ——
  def({
    key: 'service_product_sales_by_staff',
    category: 'staff',
    title: 'Service & Product Sales By Staff',
    description:
      'Shows the quantities and sales totals for services and products sold by each staff member.',
    requiredModuleKey: 'payments',
    footnotes: [
      'The total sales amount does not account for any refunds that were issued.',
    ],
    exportFormats: ['pdf'],
    filters: [
      DATE_RANGE,
      {
        key: 'staffIds',
        label: 'Staff',
        type: 'staff_multi',
        defaultValue: [],
      },
      {
        key: 'groupProductsBy',
        label: 'Group products by',
        type: 'group_by',
        options: [
          { value: 'category', label: 'Category' },
          { value: 'product', label: 'Product' },
        ],
        defaultValue: 'category',
      },
    ],
  }),
  def({
    key: 'time_clock',
    category: 'staff',
    title: 'Time Clock',
    description: 'Shows the clocked-in hours for staff members.',
    requiredModuleKey: 'time_clock',
    filters: [
      DATE_RANGE,
      {
        key: 'sortBy',
        label: 'Sort by',
        type: 'sort_by',
        options: [
          { value: 'day', label: 'Day' },
          { value: 'staff', label: 'Staff' },
        ],
        defaultValue: 'day',
      },
    ],
  }),
  def({
    key: 'days_off',
    category: 'staff',
    title: 'Days Off By Staff',
    description: 'Shows days off for staff members during the given date range.',
    deferred: true,
    deferredReason:
      'Requires a first-class Days Off / staff leave module (CalendarException approximation is Phase 5).',
  }),

  // —— Sales ——
  def({
    key: 'sales_summary',
    category: 'sales',
    title: 'Sales Summary',
    description:
      'Shows the quantities and sales totals of services and products for each day.',
    requiredModuleKey: 'payments',
    footnotes: [
      'The service sales include the value of applied packages.',
      'The adjusted total is the gross total of sales minus any refunds issued within the specified time period.',
    ],
    filters: [
      DATE_RANGE,
      {
        key: 'onlySpecificStaff',
        label: 'Only include sales for specific staff',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'staffIds',
        label: 'Staff',
        type: 'staff_multi',
        visibleWhen: { key: 'onlySpecificStaff', equals: true },
        defaultValue: [],
      },
    ],
  }),
  def({
    key: 'service_sales',
    category: 'sales',
    title: 'Service Sales',
    description: 'Shows the quantities and sales totals of services.',
    requiredModuleKey: 'payments',
    filters: [
      DATE_RANGE,
      {
        key: 'filterRefundsBy',
        label: 'Filter refunds by',
        type: 'select',
        options: [
          { value: 'sale_date', label: 'Sale Date' },
          { value: 'refund_date', label: 'Refund Date' },
        ],
        defaultValue: 'sale_date',
      },
      {
        key: 'includeDailyDetails',
        label: 'Include details for each day',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'includeCustomizationDetails',
        label: 'Include service customization details',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    footnotes: [
      'The sales total includes the value of applied packages.',
      'The sales amount does not account for any refunds that were issued.',
    ],
  }),
  def({
    key: 'product_sales',
    category: 'sales',
    title: 'Product Sales',
    description: 'Shows the quantities and sales totals of products.',
    requiredModuleKey: 'payments',
    filters: [
      DATE_RANGE,
      {
        key: 'groupBy',
        label: 'Group by',
        type: 'group_by',
        options: [
          { value: 'brand', label: 'Brand' },
          { value: 'category', label: 'Category' },
        ],
        defaultValue: 'brand',
      },
      {
        key: 'sortBy',
        label: 'Sort by',
        type: 'sort_by',
        options: [
          { value: 'total_sales', label: 'Total Sales' },
          { value: 'name', label: 'Name' },
          { value: 'quantity', label: 'Quantity' },
        ],
        defaultValue: 'total_sales',
      },
      {
        key: 'includeDailyDetails',
        label: 'Include details for each day',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'filterRefundsBy',
        label: 'Filter refunds by',
        type: 'select',
        options: [
          { value: 'sale_date', label: 'Sale Date' },
          { value: 'refund_date', label: 'Refund Date' },
        ],
        defaultValue: 'sale_date',
      },
    ],
    footnotes: [
      'The sales amount does not account for any refunds that were issued.',
    ],
  }),
  def({
    key: 'sales_by_time_period',
    category: 'sales',
    title: 'Sales by Time Period',
    description:
      'Shows the service and product totals by day, week or month.',
    requiredModuleKey: 'payments',
    filters: [
      DATE_RANGE,
      {
        key: 'groupBy',
        label: 'Group by',
        type: 'group_by',
        options: [
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
        ],
        defaultValue: 'month',
      },
    ],
    syncMaxDateSpanDays: 366,
  }),

  // —— Refunds ——
  def({
    key: 'refund_summary',
    category: 'refunds',
    title: 'Refund Summary',
    description: 'Shows daily totals and quantities of all refund types.',
    requiredModuleKey: 'payments',
    filters: [
      DATE_RANGE,
      {
        key: 'filterRefundsBy',
        label: 'Filter refunds by',
        type: 'select',
        options: [
          { value: 'refund_date', label: 'Refund Date' },
          { value: 'sale_date', label: 'Sale Date' },
        ],
        defaultValue: 'refund_date',
      },
    ],
    footnotes: [
      'The quantity of refunds shows how many individual items were refunded, not how many refund transactions there were.',
    ],
  }),
  def({
    key: 'refund_details',
    category: 'refunds',
    title: 'Refund Details',
    description:
      'Shows all refund details, including refund amount and method, for each refund transaction.',
    requiredModuleKey: 'payments',
    filters: [DATE_RANGE],
  }),

  // —— Offers ——
  def({
    key: 'offers_usage',
    category: 'offers',
    title: 'Offers Usage',
    description: 'Shows the details of offer usages.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
    filters: [
      DATE_RANGE,
      {
        key: 'offerId',
        label: 'Select offer',
        type: 'entity_select',
        defaultValue: null,
      },
    ],
  }),
  def({
    key: 'offers_summary',
    category: 'offers',
    title: 'Offers Summary',
    description: 'Shows daily summary of the offers being used.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
  }),

  // —— Client account ——
  def({
    key: 'client_account_usage',
    category: 'client_account',
    title: 'Client Account Balance Usage',
    description: 'Shows the details of client account balance usages.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf', 'xlsx'],
  }),
  def({
    key: 'client_account_balances',
    category: 'client_account',
    title: 'Client Account Balances',
    description: 'Shows current account balances.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf', 'xlsx'],
    filters: [
      {
        key: 'asOfDate',
        label: 'Show balance at end of day',
        type: 'single_date',
        defaultValue: null,
      },
    ],
  }),
  def({
    key: 'client_account_deposits',
    category: 'client_account',
    title: 'Client Account Balance Deposits',
    description: 'Shows the details of client account balance deposits.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf', 'xlsx'],
    filters: [
      DATE_RANGE,
      {
        key: 'filterRefundsBy',
        label: 'Filter refunds by',
        type: 'select',
        options: [
          { value: 'sale_date', label: 'Sale Date' },
          { value: 'refund_date', label: 'Refund Date' },
        ],
        defaultValue: 'sale_date',
      },
    ],
  }),

  // —— Gift cards ——
  def({
    key: 'gift_card_usage',
    category: 'gift_cards',
    title: 'Gift Card Usage',
    description: 'Shows the details of gift cards usages.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
  }),
  def({
    key: 'gift_card_balances',
    category: 'gift_cards',
    title: 'Gift Card Balances',
    description: 'Shows outstanding gift card balances.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf', 'xlsx'],
    filters: [
      {
        key: 'asOfDate',
        label: 'Show balance at end of day',
        type: 'single_date',
        defaultValue: null,
      },
    ],
  }),
  def({
    key: 'gift_card_sales',
    category: 'gift_cards',
    title: 'Gift Card Sales',
    description: 'Shows the quantities and sales totals of gift cards.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
    filters: [
      DATE_RANGE,
      {
        key: 'includeDailyDetails',
        label: 'Include details for each day',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'filterRefundsBy',
        label: 'Filter refunds by',
        type: 'select',
        options: [
          { value: 'sale_date', label: 'Sale Date' },
          { value: 'refund_date', label: 'Refund Date' },
        ],
        defaultValue: 'sale_date',
      },
    ],
  }),
  def({
    key: 'gift_card_sales_details',
    category: 'gift_cards',
    title: 'Gift Card Sales Details',
    description:
      'Shows details for gift card sales, such as the name of the gift card promotion.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf', 'xlsx'],
  }),

  // —— Packages ——
  def({
    key: 'package_usage',
    category: 'packages',
    title: 'Package Usage',
    description: 'Shows the details of package usages.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
    filters: [
      DATE_RANGE,
      {
        key: 'filterRefundsBy',
        label: 'Filter refunds by',
        type: 'select',
        options: [
          { value: 'sale_date', label: 'Sale Date' },
          { value: 'refund_date', label: 'Refund Date' },
        ],
        defaultValue: 'sale_date',
      },
    ],
  }),
  def({
    key: 'outstanding_packages',
    category: 'packages',
    title: 'Outstanding Packages',
    description: 'Shows the list of outstanding package credits.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf', 'xlsx'],
    filters: [
      {
        key: 'asOfDate',
        label: 'Show credits at end of day',
        type: 'single_date',
        defaultValue: null,
      },
    ],
  }),
  def({
    key: 'package_sales',
    category: 'packages',
    title: 'Package Sales',
    description: 'Shows the quantities and sales totals of packages.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
    filters: [
      DATE_RANGE,
      {
        key: 'includeDailyDetails',
        label: 'Include details for each day',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'filterRefundsBy',
        label: 'Filter refunds by',
        type: 'select',
        options: [
          { value: 'sale_date', label: 'Sale Date' },
          { value: 'refund_date', label: 'Refund Date' },
        ],
        defaultValue: 'sale_date',
      },
    ],
  }),
  def({
    key: 'package_sales_details',
    category: 'packages',
    title: 'Package Sales Details',
    description: 'Shows details for each sale of a package.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf', 'xlsx'],
  }),

  // —— Memberships ——
  def({
    key: 'membership_payments',
    category: 'memberships',
    title: 'Membership Payments',
    description:
      'Shows payments for new memberships and membership renewals.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
    filters: [
      DATE_RANGE,
      {
        key: 'includeDailyDetails',
        label: 'Include details for each day',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'filterRefundsBy',
        label: 'Filter refunds by',
        type: 'select',
        options: [
          { value: 'sale_date', label: 'Sale Date' },
          { value: 'refund_date', label: 'Refund Date' },
        ],
        defaultValue: 'sale_date',
      },
    ],
  }),
  def({
    key: 'membership_service_usage',
    category: 'memberships',
    title: 'Membership Credit Usage',
    description: 'Shows the details of membership services used.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
    filters: [
      DATE_RANGE,
      {
        key: 'filterRefundsBy',
        label: 'Filter refunds by',
        type: 'select',
        options: [
          { value: 'sale_date', label: 'Sale Date' },
          { value: 'refund_date', label: 'Refund Date' },
        ],
        defaultValue: 'sale_date',
      },
    ],
  }),
  def({
    key: 'memberships_started',
    category: 'memberships',
    title: 'Memberships Started',
    description:
      'Shows new memberships that were started within the selected time period.',
    requiredModuleKey: 'payments',
  }),
  def({
    key: 'memberships_cancellations',
    category: 'memberships',
    title: 'Memberships Cancellations',
    description: 'Shows canceled memberships within the selected time period.',
    requiredModuleKey: 'payments',
  }),

  // —— Payments ——
  def({
    key: 'payment_summary',
    category: 'payments',
    title: 'Payment Summary',
    description:
      'Shows quantities and totals of payments by payment method. Also includes membership usage and package usage.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
  }),
  def({
    key: 'payment_details',
    category: 'payments',
    title: 'Payment Details',
    description:
      'Shows the payment details, such as payment amount and payment method, for each sale.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf', 'xlsx'],
  }),
  def({
    key: 'cash_drawer_activity',
    category: 'payments',
    title: 'Cash Drawer Activity',
    description:
      'Shows all cash payments, refunds, cash drawer pay-ins/pay-outs, and manual adjustments.',
    deferred: true,
    deferredReason: 'Requires a Cash Drawer module.',
  }),
  def({
    key: 'deposits_collected',
    category: 'payments',
    title: 'Deposits Collected',
    description:
      'Shows deposit payments collected in online booking or Express Booking™.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf', 'xlsx'],
  }),
  def({
    key: 'deposits_used',
    category: 'payments',
    title: 'Deposits Used',
    description:
      'Shows used deposit payments, based on their associated sale date, when the sale is closed.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf', 'xlsx'],
  }),

  // —— Inventory ——
  def({
    key: 'cost_of_goods',
    category: 'inventory',
    title: 'Cost of Goods Sold',
    description: 'Shows costs and profits of products.',
    requiredModuleKey: 'products',
    exportFormats: ['pdf'],
    filters: [
      DATE_RANGE,
      {
        key: 'groupBy',
        label: 'Group by',
        type: 'group_by',
        options: [
          { value: 'category', label: 'Category' },
          { value: 'brand', label: 'Brand' },
        ],
        defaultValue: 'category',
      },
    ],
    footnotes: [
      'This report only includes products that have purchase costs associated with it.',
    ],
  }),
  def({
    key: 'product_inventory',
    category: 'inventory',
    title: 'Product Inventory',
    description: 'Shows the stock of products at the end of the selected day.',
    requiredModuleKey: 'products',
    exportFormats: ['pdf', 'xlsx'],
    filters: [
      {
        key: 'groupBy',
        label: 'Group by',
        type: 'group_by',
        options: [
          { value: 'category', label: 'Category' },
          { value: 'brand', label: 'Brand' },
        ],
        defaultValue: 'category',
      },
      {
        key: 'asOfDate',
        label: 'Show inventory at end of day',
        type: 'single_date',
        defaultValue: null,
      },
    ],
  }),
  def({
    key: 'product_inventory_changes',
    category: 'inventory',
    title: 'Product Inventory Changes',
    description: 'Shows product inventory changes.',
    requiredModuleKey: 'products',
    exportFormats: ['pdf', 'xlsx'],
    filters: [
      DATE_RANGE,
      {
        key: 'brand',
        label: 'Filter by brand',
        type: 'entity_select',
        defaultValue: 'all',
      },
    ],
  }),
  def({
    key: 'product_stock_usage',
    category: 'inventory',
    title: 'Product Stock & Usage',
    description:
      'Shows end stock quantities based on sold products, professional use products, and service usage.',
    requiredModuleKey: 'products',
    exportFormats: ['pdf', 'xlsx'],
    filters: [
      DATE_RANGE,
      {
        key: 'groupBy',
        label: 'Group by',
        type: 'group_by',
        options: [
          { value: 'category', label: 'Category' },
          { value: 'brand', label: 'Brand' },
        ],
        defaultValue: 'category',
      },
      {
        key: 'brand',
        label: 'Filter by brand',
        type: 'entity_select',
        defaultValue: 'all',
      },
    ],
  }),

  // —— Business ——
  def({
    key: 'cashflow',
    category: 'business',
    title: 'Cashflow',
    description:
      'Shows gross and net totals for cashflow. Includes all cash-equivalent forms of payment and ignores non-cash payments like gift cards, packages, etc.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
    footnotes: [
      'Incoming cashflow includes all cash and card payments.',
    ],
  }),
  def({
    key: 'bi_appointments',
    category: 'business',
    title: 'Business Intelligence: Appointments',
    description:
      'Provides insights into appointment metrics, such as booked percentage (productivity), pre-bookings, walk-ins and staff requests.',
    requiredModuleKey: 'appointments',
    exportFormats: ['pdf'],
    footnotes: [
      'Prebooking: An appointment that has a future appointment for the same client created within 24 hours of the appointment start, or any time before the appointment start.',
      'Walk-in: An appointment that was created within 1 hour before to 1 hour after the appointment start time.',
    ],
    filters: [
      DATE_RANGE,
      {
        key: 'staffIds',
        label: 'Staff',
        type: 'staff_multi',
        defaultValue: [],
      },
      {
        key: 'includeProcessingTimeAsBooked',
        label: 'Include processing time as booked time',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'includeTimeBlocksAsAvailable',
        label: 'Include time blocks as available time',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  }),
  def({
    key: 'bi_sales',
    category: 'business',
    title: 'Business Intelligence: Sales',
    description:
      'Provides insights into sales metrics, such as average retail product total per sale by each staff member.',
    requiredModuleKey: 'payments',
    exportFormats: ['pdf'],
    filters: [
      DATE_RANGE,
      {
        key: 'staffIds',
        label: 'Staff',
        type: 'staff_multi',
        defaultValue: [],
      },
    ],
  }),
  def({
    key: 'bi_forecast',
    category: 'business',
    title: 'Business Intelligence: Forecast',
    description:
      'Provides insights into future business metrics, such as productivity and appointments booked.',
    requiredModuleKey: 'appointments',
    exportFormats: ['pdf'],
    filters: [
      DATE_RANGE,
      {
        key: 'onlySpecificStaff',
        label: 'Only for specific staff members',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'includePendingExpressBookings',
        label: 'Include pending Express Bookings',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'staffIds',
        label: 'Staff',
        type: 'staff_multi',
        visibleWhen: { key: 'onlySpecificStaff', equals: true },
        defaultValue: [],
      },
    ],
  }),
  def({
    key: 'client_retention',
    category: 'business',
    title: 'Client Retention',
    description:
      'Specifies how many clients from the selected time period visited again within 30, 60, 90, or 180 days.',
    requiredModuleKey: 'appointments',
    exportFormats: ['pdf'],
    syncMaxDateSpanDays: 366,
    footnotes: [
      'Initial appointment: The client’s first appointment in the selected time period.',
      'New client: A client who did not have any appointments (with any staff member) before their initial appointment.',
      'Existing client: A client who had at least one appointment (with any staff member) before their initial appointment.',
      'Retained client: A client who had at least one appointment (with any staff member) within 30, 60, 90, or 180 days after their initial appointment.',
      'If a client’s initial appointment was with more than one staff member, the client is included in each staff member’s total. All Selected Staff counts each client once.',
    ],
    filters: [
      {
        key: 'dateRange',
        label: 'Time period',
        type: 'date_range',
        dateRangeMode: 'months',
        defaultValue: null,
      },
      {
        key: 'staffIds',
        label: 'Team members',
        type: 'staff_multi',
        defaultValue: [],
      },
    ],
  }),
  def({
    key: 'appointment_cancellations',
    category: 'business',
    title: 'Appointment Cancellations',
    description:
      'Shows client and appointment details for canceled appointments.',
    requiredModuleKey: 'appointments',
    exportFormats: ['pdf', 'xlsx'],
    footnotes: [
      'To see additional client and appointment information please download the Excel report.',
    ],
    filters: [
      DATE_RANGE,
      {
        key: 'cancellationType',
        label: 'Cancellation type',
        type: 'select',
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'All' },
          { value: 'normal', label: 'Normal Cancellation' },
          { value: 'late', label: 'Late Cancellation' },
          { value: 'no_show', label: 'No Show' },
          { value: 'deleted', label: 'Deleted' },
          {
            value: 'expired_express',
            label: 'Expired Express Booking',
          },
        ],
      },
    ],
  }),

  // —— Deferred payroll ——
  def({
    key: 'payroll',
    category: 'staff',
    title: 'Payroll',
    description: 'Staff compensation report for the selected pay period.',
    deferred: true,
    deferredReason:
      'Requires Payroll / commission / tips / hourly compensation models.',
  }),

  // —— CodeSol-only ——
  def({
    key: 'ar_aging',
    category: 'codesol',
    title: 'AR Aging / Overdue Invoices',
    description: 'Unpaid and partially paid invoices grouped by age buckets.',
    requiredModuleKey: 'payments',
  }),
  def({
    key: 'estimate_conversion',
    category: 'codesol',
    title: 'Estimate Conversion',
    description: 'Estimates converted to invoices and win rate.',
    requiredModuleKey: 'payments',
  }),
  def({
    key: 'lead_pipeline_funnel',
    category: 'codesol',
    title: 'Lead Pipeline Funnel',
    description: 'Lead stage conversion and counts for the selected period.',
    requiredModuleKey: 'leads',
  }),
  def({
    key: 'work_items_throughput',
    category: 'codesol',
    title: 'Work Items Throughput',
    description: 'Work items created and completed by status and assignee.',
    requiredModuleKey: 'work_items',
  }),
  def({
    key: 'conversation_volume',
    category: 'codesol',
    title: 'Conversation Volume & Response',
    description: 'Inbox message volume by channel for the selected period.',
    requiredModuleKey: 'conversations',
  }),
  def({
    key: 'form_submissions',
    category: 'codesol',
    title: 'Form Submissions',
    description: 'Form submission counts by form.',
    requiredModuleKey: 'settings',
    requiredCapabilityKey: 'forms.list',
  }),
  def({
    key: 'booking_conversion',
    category: 'codesol',
    title: 'Online / Express Booking Conversion',
    description: 'Booking links and express bookings conversion funnel.',
    requiredModuleKey: 'appointments',
  }),
  def({
    key: 'waitlist_conversion',
    category: 'codesol',
    title: 'Waitlist Conversion',
    description: 'Waitlist entries converted to appointments.',
    requiredModuleKey: 'appointments',
  }),
  def({
    key: 'automation_runs',
    category: 'codesol',
    title: 'Automation Runs',
    description: 'Automation run success and failure counts by workflow.',
    requiredModuleKey: 'settings',
    requiredCapabilityKey: 'automations.list',
  }),
  def({
    key: 'product_low_stock',
    category: 'codesol',
    title: 'Product Low Stock',
    description: 'Products at or below their desired stock quantity.',
    requiredModuleKey: 'products',
  }),
  def({
    key: 'staff_utilization',
    category: 'codesol',
    title: 'Staff Utilization',
    description: 'Booked appointment hours vs available calendar hours.',
    requiredModuleKey: 'appointments',
  }),
];

export const REPORT_CATEGORY_LABELS: Record<
  ReportDefinition['category'],
  string
> = {
  staff: 'Staff',
  sales: 'Sales',
  refunds: 'Refunds',
  offers: 'Offers',
  client_account: 'Client Account Balances',
  gift_cards: 'Gift Cards',
  packages: 'Packages',
  memberships: 'Memberships',
  payments: 'Payments',
  inventory: 'Inventory',
  business: 'Business',
  codesol: 'CodeSol Insights',
};

export function getReportDefinition(
  key: string,
): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((r) => r.key === key);
}
