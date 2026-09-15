import { AppointmentCancellationsProvider } from './appointment-cancellations.provider';
import { ArAgingProvider } from './ar-aging.provider';
import { AutomationRunsProvider } from './automation-runs.provider';
import { BiAppointmentsProvider } from './bi-appointments.provider';
import { BiForecastProvider } from './bi-forecast.provider';
import { BiSalesProvider } from './bi-sales.provider';
import { BookingConversionProvider } from './booking-conversion.provider';
import { CashflowProvider } from './cashflow.provider';
import { ClientAccountBalancesProvider } from './client-account-balances.provider';
import { ClientAccountDepositsProvider } from './client-account-deposits.provider';
import { ClientAccountUsageProvider } from './client-account-usage.provider';
import { ClientRetentionProvider } from './client-retention.provider';
import { ConversationVolumeProvider } from './conversation-volume.provider';
import { CostOfGoodsProvider } from './cost-of-goods.provider';
import { DepositsCollectedProvider } from './deposits-collected.provider';
import { DepositsUsedProvider } from './deposits-used.provider';
import { EstimateConversionProvider } from './estimate-conversion.provider';
import { FormSubmissionsProvider } from './form-submissions.provider';
import { GiftCardBalancesProvider } from './gift-card-balances.provider';
import { GiftCardSalesDetailsProvider } from './gift-card-sales-details.provider';
import { GiftCardSalesProvider } from './gift-card-sales.provider';
import { GiftCardUsageProvider } from './gift-card-usage.provider';
import { LeadPipelineFunnelProvider } from './lead-pipeline-funnel.provider';
import { MembershipPaymentsProvider } from './membership-payments.provider';
import { MembershipsCancellationsProvider } from './memberships-cancellations.provider';
import { MembershipServiceUsageProvider } from './membership-service-usage.provider';
import { MembershipsStartedProvider } from './memberships-started.provider';
import { OffersSummaryProvider } from './offers-summary.provider';
import { OffersUsageProvider } from './offers-usage.provider';
import { OutstandingPackagesProvider } from './outstanding-packages.provider';
import { PackageSalesDetailsProvider } from './package-sales-details.provider';
import { PackageSalesProvider } from './package-sales.provider';
import { PackageUsageProvider } from './package-usage.provider';
import { PaymentDetailsProvider } from './payment-details.provider';
import { PaymentSummaryProvider } from './payment-summary.provider';
import { ProductInventoryChangesProvider } from './product-inventory-changes.provider';
import { ProductInventoryProvider } from './product-inventory.provider';
import { ProductLowStockProvider } from './product-low-stock.provider';
import { ProductSalesProvider } from './product-sales.provider';
import { ProductStockUsageProvider } from './product-stock-usage.provider';
import { RefundDetailsProvider } from './refund-details.provider';
import { RefundSummaryProvider } from './refund-summary.provider';
import { SalesByTimePeriodProvider } from './sales-by-time-period.provider';
import { SalesSummaryProvider } from './sales-summary.provider';
import { ServiceProductSalesByStaffProvider } from './service-product-sales-by-staff.provider';
import { ServiceSalesProvider } from './service-sales.provider';
import { StaffUtilizationProvider } from './staff-utilization.provider';
import { TimeClockProvider } from './time-clock.provider';
import { WaitlistConversionProvider } from './waitlist-conversion.provider';
import { WorkItemsThroughputProvider } from './work-items-throughput.provider';

export const ALL_REPORT_PROVIDERS = [
  AppointmentCancellationsProvider,
  ArAgingProvider,
  AutomationRunsProvider,
  BiAppointmentsProvider,
  BiForecastProvider,
  BiSalesProvider,
  BookingConversionProvider,
  CashflowProvider,
  ClientAccountBalancesProvider,
  ClientAccountDepositsProvider,
  ClientAccountUsageProvider,
  ClientRetentionProvider,
  ConversationVolumeProvider,
  CostOfGoodsProvider,
  DepositsCollectedProvider,
  DepositsUsedProvider,
  EstimateConversionProvider,
  FormSubmissionsProvider,
  GiftCardBalancesProvider,
  GiftCardSalesDetailsProvider,
  GiftCardSalesProvider,
  GiftCardUsageProvider,
  LeadPipelineFunnelProvider,
  MembershipPaymentsProvider,
  MembershipsCancellationsProvider,
  MembershipServiceUsageProvider,
  MembershipsStartedProvider,
  OffersSummaryProvider,
  OffersUsageProvider,
  OutstandingPackagesProvider,
  PackageSalesDetailsProvider,
  PackageSalesProvider,
  PackageUsageProvider,
  PaymentDetailsProvider,
  PaymentSummaryProvider,
  ProductInventoryChangesProvider,
  ProductInventoryProvider,
  ProductLowStockProvider,
  ProductSalesProvider,
  ProductStockUsageProvider,
  RefundDetailsProvider,
  RefundSummaryProvider,
  SalesByTimePeriodProvider,
  SalesSummaryProvider,
  ServiceProductSalesByStaffProvider,
  ServiceSalesProvider,
  StaffUtilizationProvider,
  TimeClockProvider,
  WaitlistConversionProvider,
  WorkItemsThroughputProvider,
] as const;

export type ReportProviderClass = (typeof ALL_REPORT_PROVIDERS)[number];
