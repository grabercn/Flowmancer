// frontend/src/types.ts

/**
 * Defines the structure for a single database attribute (a column in a table).
 * This type is used across the frontend for managing attribute state.
 */
export interface Attribute {
  id: string; // A unique client-side ID for React keys and state management.
  name: string;
  type: string;
  description?: string; // Optional description for the attribute.
  isPrimaryKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  isForeignKey: boolean;
  foreignKeyRelation?: { // Details for the foreign key relationship.
    referencesEntity: string; // Name of the entity it references.
    referencesField: string; // Name of the field it references.
  };
}

/**
 * Defines the structure for a single database entity (a table), including its
 * position on the canvas for UI state.
 */
// Represents a backend database entity OR a frontend UI component
export interface Entity {
  id: string;
  name: string;
  attributes: Attribute[];
  ui: {
    x: number;
    y: number;
  };
  // Optional properties for frontend components
  componentType?: string; // e.g., 'button', 'card'
  props?: { [key: string]: any };
  backendDescription?: string; // Instructions for AI code generation
}

/**
 * Defines the structure for an explicit relationship between two entities.
 * This is derived from Foreign Keys and helps with drawing lines and backend logic.
 */
export interface Relationship {
  from_entity: string;
  to_entity: string;
  type: "1:1" | "1:N" | "M:N";
  foreign_key_in_to_entity: string;
}

/**
 * Defines the structure for the backend summary, which includes generated API endpoints
 * and data types. This is typically returned by the backend after code generation.
 */
export interface BackendSummary {
  endpoints: {
    method: string;
    path: string;
    description: string;
  }[];
  types: {
    typeName: string;
    description: string;
  }[];
}

/**
 * This represents the complete schema payload that will be sent to the backend API.
 * It matches the Pydantic model (`FullSchema`) in the FastAPI backend.
 * UI-specific properties like `id`, `x`, `y` are stripped out.
 */
export interface ApiSchema {
  entities: {
    name: string;
    attributes: {
      name: string;
      type: string;
      pk: boolean;
      nn: boolean;
      un: boolean;
      fk: boolean;
      references_entity?: string;
      references_field?: string;
    }[];
  }[];
  relationships: Relationship[];
}

/**
 * Defines the structure for the complete design data that can be saved/loaded
 * from a JSON file, preserving the UI state.
 */
export interface DesignData {
    entities: Entity[];
    entityCounter: number;
}

/*
 * Defines the structure for the frontend design, including all components
 * and the counter for generating new component names.
 */
export interface FrontendSchema {
  components: Entity[];
  componentCounter: number;
}

/**
 * Defines the structure for the complete design data that can be saved/loaded
 * from a .flowmancer file, preserving the entire UI and data state.
 */
export interface FlowmancerSaveData {
  type: 'flowmancer';
  version: string; // e.g., '1.1'
  savedAt: string; // ISO timestamp
  
  // Backend Design Data
  designData: {
    entities: Entity[];
    entityCounter: number;
  };
  backendSummary: string;
  
  // Frontend Design Data (Optional) 
  frontendSchema?: FrontendSchema;
}