import type { Database, ResourceStatus, ResourceType } from "@/types/database.types";

export type DbResource = Database["public"]["Tables"]["resources"]["Row"];
export type DbResourceInsert = Database["public"]["Tables"]["resources"]["Insert"];
export type DbResourceUpdate = Database["public"]["Tables"]["resources"]["Update"];
export type DbAvailability = Database["public"]["Tables"]["resource_availability"]["Row"];
export type DbInstitution = Database["public"]["Tables"]["institutions"]["Row"];
export type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];

export type { ResourceStatus, ResourceType };
export type DbResourceType = ResourceType;
export type ResourceSortOption = "newest" | "title_asc" | "deposit_asc" | "deposit_desc";

export const RESOURCE_CATEGORIES = [
  "Analytical & Testing",
  "Fabrication & CNC",
  "Computing & Server Hardware",
  "Cleanrooms & Specialized Spaces",
  "Optics & Imaging",
  "Electronics & Embedded Kits",
  "Biochemical & Life Sciences",
  "Other",
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number] | string;

export const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: "equipment", label: "Scientific Equipment & Device" },
  { value: "laboratory", label: "Laboratory / Testing Facility" },
  { value: "workspace", label: "Makerspace / Fabrication Bench" },
  { value: "meeting_room", label: "Conference / Seminar Room" },
  { value: "classroom", label: "Classroom / Studio" },
  { value: "other", label: "Other Shared Asset" },
];

export interface AvailabilityWindow {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "09:00"
  endTime: string; // "17:00"
}

export interface ResourceWithRelations extends DbResource {
  institution?: DbInstitution | null;
  owner?: Pick<DbProfile, "id" | "full_name" | "avatar_url" | "role" | "verification_status"> | null;
  availability?: DbAvailability[];
}

export interface ResourceFilterParams {
  query?: string;
  category?: string;
  resourceType?: string;
  institutionId?: string;
  status?: ResourceStatus;
  sort?: "newest" | "title_asc" | "deposit_asc" | "deposit_desc";
  page?: number;
  limit?: number;
}
