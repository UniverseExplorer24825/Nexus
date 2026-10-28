/**
 * Domain types for Resource Management & Discovery
 */

export type ResourceCategory =
  | "laboratory_equipment"
  | "makerspace_tool"
  | "computing_cluster"
  | "specialized_space"
  | "testing_facility"
  | "other";

export type ResourceCondition = "new" | "excellent" | "good" | "fair" | "maintenance_required";

export interface ResourceItem {
  id: string;
  name: string;
  category: ResourceCategory;
  description: string;
  institutionId: string;
  institutionName: string;
  location: string;
  isAvailable: boolean;
  requiresTraining: boolean;
  hourlyRate?: number;
  condition: ResourceCondition;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceFilterParams {
  category?: ResourceCategory;
  institutionId?: string;
  isAvailable?: boolean;
  searchQuery?: string;
}
