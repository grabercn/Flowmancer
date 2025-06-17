// frontend/src/services/apiService.ts

import type { Entity, Relationship, ApiSchema } from '../types';

// The API prefix defined in your FastAPI backend (engine.py)
const API_BASE_URL = 'http://127.0.0.1:8000/api'; 

/**
 * Transforms the frontend Entity state into the format required by the backend API.
 * This involves stripping UI-only properties (id, ui.x, ui.y) and renaming
 * boolean flags to match the Pydantic model (e.g., isPrimaryKey -> pk).
 * @param entities - The array of Entity objects from the UI state.
 * @returns An array of entities suitable for the API payload.
 */
function prepareEntitiesForApi(entities: Entity[]): ApiSchema['entities'] {
  return entities.map(entity => {
    // For each entity, map its attributes to the API format
    const apiAttributes = entity.attributes.map(attr => ({
      name: attr.name,
      type: attr.type,
      pk: attr.isPrimaryKey,
      nn: attr.isNotNull,
      un: attr.isUnique,
      fk: attr.isForeignKey,
      // Only include foreign key details if it is an FK
      references_entity: attr.foreignKeyRelation?.referencesEntity,
      references_field: attr.foreignKeyRelation?.referencesField,
    }));

    return {
      name: entity.name,
      attributes: apiAttributes,
    };
  });
}

/**
 * Derives an explicit list of relationships from the foreign keys defined in the entities.
 * This helps the backend and LLM to clearly understand the connections.
 * @param entities - The array of Entity objects from the UI state.
 * @returns An array of Relationship objects.
 */
function deriveRelationshipsFromFks(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];
    entities.forEach(entity => {
        entity.attributes.forEach(attr => {
            if (attr.isForeignKey && attr.foreignKeyRelation?.referencesEntity) {
                const relExists = relationships.some(
                    r => r.from_entity === attr.foreignKeyRelation!.referencesEntity && 
                         r.to_entity === entity.name &&
                         r.foreign_key_in_to_entity === attr.name
                );
                if (!relExists) {
                    relationships.push({
                        from_entity: attr.foreignKeyRelation.referencesEntity,
                        to_entity: entity.name,
                        type: "1:N", // Default assumption for a simple FK relationship
                        foreign_key_in_to_entity: attr.name,
                    });
                }
            }
        });
    });
    return relationships;
}

/**
 * Sends a design prompt to the Gemini API to generate a design.
 * @param prompt - The design prompt to send to the Gemini API.
 * @returns An object containing the generated design entities.
 * @throws An error with a user-friendly message if the API call fails.
 */
export async function askGeminiForDesign(prompt: string, geminiApiKey: string, geminiModel: string): Promise<{
  entities: Entity[] 
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-ai-schema`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, gemini_api_key: geminiApiKey, gemini_model: geminiModel }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API call failed:", error);
    if (error instanceof Error) {
      throw new Error(error.message || 'An unknown network error occurred.');
    }
    // Fallback for non-Error objects being thrown.
    throw new Error('An unexpected error occurred during the API call.');
  }
}

/**
 * Sends the complete schema to the backend API to generate the code.
 * @param entities - The current state of all entities from the UI.
 * @param targetStack - The selected backend stack (e.g., "fastapi", "springboot").
 * @returns An object containing the download URL for the generated ZIP file.
 * @throws An error with a user-friendly message if the API call fails.
 */
export async function generateBackendCode(entities: Entity[], targetStack: string, geminiApiKey: string, geminiModel: string): Promise<{ download_url: string }> {
  const apiEntities = prepareEntitiesForApi(entities);
  const relationships = deriveRelationshipsFromFks(entities);

  const payload: { schema_data: ApiSchema, target_stack: string, gemini_api_key: string, gemini_model: string } = {
    gemini_api_key: geminiApiKey,
    gemini_model: geminiModel,
    schema_data: {
      entities: apiEntities,
      relationships: relationships,
    },
    target_stack: targetStack,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Attempt to parse the JSON body, which will be present for both success and FastAPI's error responses.
    const responseData = await response.json();

    if (!response.ok) {
      // If the server returned an error (e.g., 4xx, 5xx), FastAPI's HTTPException
      // will provide error details in a 'detail' field.
      const errorMessage = responseData.detail || `Server responded with status: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    // If successful, the response should contain the download_url.
    if (!responseData.download_url) {
        throw new Error("API response was successful but did not include a download URL.");
    }
    
    return responseData;

  } catch (error) {
    // This block catches network errors (e.g., server is down) or errors thrown from a non-ok response above.
    console.error("API call failed:", error);
    
    if (error instanceof Error) {
        // Re-throw the error with its message so the UI component can catch it and display it.
        throw new Error(error.message || 'An unknown network error occurred.');
    }

    // Fallback for non-Error objects being thrown.
    throw new Error('An unexpected error occurred during the API call.');
  }
}
