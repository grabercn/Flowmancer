# er2backend/generators/fastapi_generator.py

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple
import uuid
import asyncio

# Import the new pipeline utilities
from .generator_utils import GenerationPipeline, GenerationContext, call_gemini_api

logger = logging.getLogger(__name__)
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "fastapi"

def load_example_files() -> Dict[str, str]:
    """Loads all example files from the FastAPI template directory."""
    examples = {}
    if not TEMPLATE_DIR.is_dir():
        logger.error(f"FastAPI template directory NOT FOUND: {TEMPLATE_DIR}")
        return examples
    
    for ext_pattern in ["example_*.py", "example_*.txt", "example_*.md"]:
        for file_path in TEMPLATE_DIR.glob(ext_pattern):
            try:
                key_name = file_path.name.replace("example_", "")
                examples[key_name] = file_path.read_text(encoding='utf-8')
            except Exception as e:
                logger.error(f"Error loading FastAPI template file {file_path.name}: {e}")
    return examples

# --- CONTEXT-AWARE PROMPT FUNCTIONS ---

def construct_models_prompt(context: GenerationContext) -> str:
    return f"""
You are an expert Python developer specializing in SQLAlchemy.
Based on the following JSON schema, generate the complete content for a single `models.py` file.

The file must contain all SQLAlchemy model class definitions.
- All models must inherit from a `Base` class created with `declarative_base()`.
- For foreign keys (e.g., `user_id`), generate the relationship using `relationship(back_populates="...")` and the `ForeignKey` correctly.
- Map data types as follows: Integer/Long -> `Integer`, String/Text -> `String`, Boolean -> `Boolean`, Date/Timestamp -> `DateTime`, UUID -> `String(36)`.
- Apply `nullable=False` for `isNotNull: true` and `unique=True` for `isUnique: true`.

Input JSON Schema:
```json
{json.dumps(context.schema_data, indent=2)}
```

Example Style (`models.py`):
```python
{context.example_files['models.py']}
```

Generate ONLY the Python code for the `models.py` file.
"""

def construct_schemas_prompt(context: GenerationContext) -> str:
    models_context = context.get_context_for_prompt(["models.py"])
    return f"""
You are an expert Python developer specializing in Pydantic V2.
Based on the JSON schema and the provided `models.py` content, generate the complete content for a single `schemas.py` file.

The file must contain Pydantic V2 models for each entity, typically including `EntityBase`, `EntityCreate`, `EntityUpdate`, and a main `Entity` schema for responses.
- The main response schema (e.g., `User`) should include nested relationship schemas (e.g., `posts: List[Post] = []`).
- Use `model_config = {{"from_attributes": True}}` for schemas that map from ORM models.
- Map data types: Integer/Long -> `int`, String/Text -> `str`, Boolean -> `bool`, Date -> `datetime.date`, Timestamp -> `datetime.datetime`, UUID -> `uuid.UUID`.

Input JSON Schema:
```json
{json.dumps(context.schema_data, indent=2)}
```

--- Generated `models.py` for Context ---
{models_context}
--- End Context ---

Example Style (`schemas.py`):
```python
{context.example_files['schemas.py']}
```

Generate ONLY the Python code for the `schemas.py` file.
"""

def construct_crud_prompt(context: GenerationContext) -> str:
    models_context = context.get_context_for_prompt(["models.py"])
    schemas_context = context.get_context_for_prompt(["schemas.py"])
    return f"""
You are an expert Python developer.
Based on the JSON schema and the generated `models.py` and `schemas.py`, generate the complete content for a single `crud.py` file.

The file must contain CRUD functions for ALL entities.
- Each entity should have functions like `get_<entity>`, `get_<entities>`, `create_<entity>`, etc.
- Use the exact class names and types from the provided context files.

--- Generated `models.py` Context ---
{models_context}
--- End Context ---

--- Generated `schemas.py` Context ---
{schemas_context}
--- End Context ---

Example Style (`crud.py`):
```python
{context.example_files['crud.py']}
```

Generate ONLY the Python code for `crud.py`.
"""

def construct_router_prompt(context: GenerationContext, entity: Dict[str, Any]) -> str:
    entity_name = entity['name']
    all_context = context.get_context_for_prompt(["models.py", "schemas.py", "crud.py"])
    return f"""
You are an expert Python developer creating FastAPI routers.
Generate the complete content for a router file for the `{entity_name}` entity.
The router must:
- Use `APIRouter`.
- Define endpoints for all CRUD operations for `{entity_name}`.
- Use the exact function names from `crud.py` and class names from `schemas.py`.
- Correctly define path parameters and dependency injection for the database session.

Entity Schema to implement:
```json
{json.dumps(entity, indent=2)}
```

--- Full Context (models.py, schemas.py, crud.py) ---
{all_context}
--- End Context ---

Example Style (`router.py`):
```python
{context.example_files['router.py']}
```

Generate ONLY the Python code for this router file.
"""

def construct_main_app_prompt(context: GenerationContext) -> str:
    all_routers_context = context.get_context_for_prompt([f for f in context.generated_files if f.startswith("routers/")])
    entity_names = [e['name'] for e in context.schema_data['entities']]
    return f"""
You are an expert Python developer creating a FastAPI `main.py`.
Generate the `main.py` file. It must:
- Create the FastAPI `app` instance.
- Initialize the database via `models.Base.metadata.create_all(bind=engine)`.
- Import and include the `APIRouter` for each entity: {', '.join(entity_names)}.

Use the following generated router files for context on variable and file names:
--- Generated Routers Context ---
{all_routers_context}
--- End Context ---

Example Style (`main.py`):
```python
{context.example_files['main.py']}
```

Generate ONLY the Python code for `main.py`.
"""


# --- Main Orchestration Function ---
async def generate_fastapi_project(schema_data: Dict[str, Any], output_base_dir: Path) -> Tuple[Path, Dict[str, Any]]:
    # 1. Initialization
    project_name = f"fastapi_project_{uuid.uuid4().hex[:6]}"
    project_output_dir = output_base_dir / project_name
    project_output_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Starting FastAPI project generation: '{project_name}'")
    
    example_files = load_example_files()
    if not example_files: raise FileNotFoundError("Missing FastAPI example files.")

    # 2. Create Context and Pipeline
    context = GenerationContext(schema_data, project_name, example_files)
    pipeline = GenerationPipeline(context)

    # 3. Define and Run Generation Steps
    try:
        await pipeline.run_step(
            step_name="models.py",
            prompt_template=construct_models_prompt,
            prompt_args={"context": context},
            target_path="models.py"
        )
        await pipeline.run_step(
            step_name="schemas.py",
            prompt_template=construct_schemas_prompt,
            prompt_args={"context": context},
            target_path="schemas.py"
        )
        await pipeline.run_step(
            step_name="crud.py",
            prompt_template=construct_crud_prompt,
            prompt_args={"context": context},
            target_path="crud.py"
        )

        for entity in context.schema_data.get('entities', []):
            entity_name_lower = entity['name'].lower()
            await pipeline.run_step(
                step_name=f"routers/{entity_name_lower}_router.py",
                prompt_template=construct_router_prompt,
                prompt_args={"context": context, "entity": entity},
                target_path=f"routers/{entity_name_lower}_router.py"
            )
        
        await pipeline.run_step(
            step_name="main.py",
            prompt_template=construct_main_app_prompt,
            prompt_args={"context": context},
            target_path="main.py"
        )
    except Exception as e:
        logger.error(f"A critical error occurred during file generation: {e}", exc_info=True)
        raise
        
    # 4. Add static files
    context.add_file("database.py", context.example_files["database.py"])
    context.add_file("requirements.txt", context.example_files["requirements.txt"])
    context.add_file("README.md", context.example_files["readme.md"])

    # 5. Write all generated files to disk
    for rel_filepath, content in context.generated_files.items():
        abs_filepath = project_output_dir / rel_filepath
        abs_filepath.parent.mkdir(parents=True, exist_ok=True)
        abs_filepath.write_text(content, encoding='utf-8')
        logger.info(f"Written file: {abs_filepath}")

    # 6. Generate final summary
    generation_summary = await pipeline.run_summary_step()

    logger.info(f"FastAPI project '{project_name}' generated successfully at {project_output_dir}")
    return project_output_dir, generation_summary
