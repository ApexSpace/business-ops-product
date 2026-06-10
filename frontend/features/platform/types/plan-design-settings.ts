export type PlanDesignTheme = "light" | "dark" | "custom";
export type PlanDesignLayout = "cards" | "compact" | "comparison";
export type PlanDesignColumns = "auto" | "2" | "3" | "4";
export type PlanDesignCardWidth =
  | "auto"
  | "narrow"
  | "medium"
  | "wide"
  | "full";
export type PlanCardShadow = "none" | "sm" | "md" | "lg";
export type PlanButtonStyle = "solid" | "outline" | "soft";
export type PlanFeatureIconStyle = "check" | "dot" | "plus" | "none";
export type PlanFeatureIconSize = "sm" | "md" | "lg";
export type PlanTextAlignment = "left" | "center" | "right";

export type PlanGroupDesignSettings = {
  theme?: PlanDesignTheme;
  layout?: PlanDesignLayout;
  columns?: PlanDesignColumns;
  cardWidth?: PlanDesignCardWidth;
  sectionBackgroundColor?: string;
  sectionTextColor?: string;
  sectionMutedTextColor?: string;
  accentColor?: string;
  fontFamily?: string;
  headingFontSize?: string;
  bodyFontSize?: string;
  cardBackgroundColor?: string;
  cardTextColor?: string;
  cardBorderColor?: string;
  cardBorderRadius?: string;
  cardShadow?: PlanCardShadow;
  buttonStyle?: PlanButtonStyle;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
  buttonBorderRadius?: string;
  featureIconStyle?: PlanFeatureIconStyle;
  featureIconColor?: string;
  featureIconBackgroundColor?: string;
  featureIconSize?: PlanFeatureIconSize;
  showMonthlyYearlyToggle?: boolean;
  showPlanGroupTitle?: boolean;
  showPlanGroupDescription?: boolean;
  showSetupFee?: boolean;
  showTrialDays?: boolean;
  showCapabilities?: boolean;
  showTierFeatures?: boolean;
  showBadges?: boolean;
  showDescriptions?: boolean;
  showFeatureComparison?: boolean;
  tierNameAlignment?: PlanTextAlignment;
  priceAlignment?: PlanTextAlignment;
  descriptionAlignment?: PlanTextAlignment;
  ctaAlignment?: PlanTextAlignment;
  tierNameBold?: boolean;
  tierNameItalic?: boolean;
  descriptionBold?: boolean;
  descriptionItalic?: boolean;
  priceBold?: boolean;
  priceItalic?: boolean;
  featureListBold?: boolean;
  /** Vertical gap between feature list items, in `em` units. */
  featureListGap?: number;
  ctaBold?: boolean;
};

export type PlanTierDesignSettings = {
  cardBackgroundColor?: string;
};

export type ResolvedPlanGroupDesignSettings = Required<PlanGroupDesignSettings>;

export type ResolvedTierCardStyles = {
  cardBackgroundColor: string;
  cardTextColor: string;
  cardBorderColor: string;
  cardBorderRadius: string;
  cardShadow: string;
  badgeBackgroundColor: string;
  badgeTextColor: string;
  buttonBackgroundColor: string;
  buttonTextColor: string;
  buttonBorderRadius: string;
  buttonStyle: PlanButtonStyle;
  featureIconStyle: PlanFeatureIconStyle;
  featureIconColor: string;
  featureIconBackgroundColor: string;
  featureIconSize: PlanFeatureIconSize;
  featureListBold: boolean;
};
