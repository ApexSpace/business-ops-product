export type ServiceResourceType = "ROOM" | "EQUIPMENT" | "CONSUMABLE";

export type ResourceStatus = "ACTIVE" | "INACTIVE";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type ResourceGroup = {
  id: string;
  businessId: string;
  name: string;
  sortOrder: number;
  resourceCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ResourceListItem = {
  id: string;
  businessId: string;
  groupId: string | null;
  groupName: string | null;
  name: string;
  resourceType: ServiceResourceType;
  status: ResourceStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ResourcePickerItem = {
  id: string;
  name: string;
  resourceType: ServiceResourceType;
  groupName: string | null;
};

export type ResourceAvailabilitySlot = {
  id?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
};

export type ResourceScheduleException = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isUnavailable: boolean;
  reason: string | null;
};

export type LinkedService = {
  serviceId: string;
  serviceName: string;
  requirementId: string;
  label: string;
  quantity: number;
  source: "service" | "service_option";
  optionName: string | null;
};

export type ResourceWorkspace = {
  resource: ResourceListItem;
  availability: ResourceAvailabilitySlot[];
  scheduleExceptions: ResourceScheduleException[];
  linkedServices: LinkedService[];
};

export type ServiceResourceRequirement = {
  id: string;
  label: string;
  resourceType: ServiceResourceType;
  resourceId: string | null;
  resourceName: string | null;
  quantity: number;
  notes: string | null;
  sortOrder: number;
  linked: boolean;
};
