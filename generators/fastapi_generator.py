import json
import logging
import os
from pathlib import Path
from typing import Dict, Any, List 
import tempfile 
import uuid
import asyncio

# Use absolute import from the package root
from generators.generator_utils import call_gemini_api, parse_llm_output_to_files

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "fastapi"

def load_example_files() -> Dict[str, str]:
    """Loads all example files from the FastAPI template directory."""
    examples = {}
    logger.info(f"Attempting to load example files from: {TEMPLATE_DIR}")
    if not TEMPLATE_DIR.is_dir():
        logger.error(f"FastAPI template directory NOT FOUND: {TEMPLATE_DIR}")
        return examples
    
    found_files_log = []

    # Load .py example files
    for file_path in TEMPLATE_DIR.glob("example_*.py"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                key_name = file_path.name.replace("example_", "")
                examples[key_name] = f.read()
                found_files_log.append(f"Loaded '{file_path.name}' as key '{key_name}'")
        except Exception as e:
            logger.error(f"Error loading Python template file {file_path.name}: {e}")
            
    # Load .txt and .md examples
    for ext_pattern in ["example_*.txt", "example_*.md"]:
        for file_path in TEMPLATE_DIR.glob(ext_pattern):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    key_name = file_path.name.replace("example_", "")
                    examples[key_name] = f.read()
                    found_files_log.append(f"Loaded '{file_path.name}' as key '{key_name}'")
            except Exception as e:
                logger.error(f"Error loading non-Python template file {file_path.name}: {e}")
    
    if found_files_log:
        logger.info("Successfully loaded and keyed the following example files:")
        for log_entry in found_files_log:
            logger.info(f"  - {log_entry}")
    else:
        logger.warning(f"No example files were found or loaded from {TEMPLATE_DIR}.")
    
    logger.info(f"Final keys in examples dictionary: {list(examples.keys())}")
    return examples

# --- Prompt Construction Functions (Copied from previous version) ---
def construct_models_prompt(schema_data: Dict[str, Any], example_models_content: str) -> str: 
    schema_json_str = json.dumps(schema_data, indent=2) 
    return f""" 
You are an expert Python developer specializing in SQLAlchemy. 
Based on the following JSON schema, generate the content for `models.py`. 
This file should contain all SQLAlchemy model definitions. 
Ensure correct `ForeignKey` constraints and `relationship` attributes are defined for all relationships implied by the schema's foreign keys. 
Use `sqlalchemy.Integer` for schema types 'Integer' and 'Long'. 
Use `sqlalchemy.String` for 'String'. 
Use `sqlalchemy.Boolean` for 'Boolean'. 
Use `sqlalchemy.DateTime` for 'Date' and 'Timestamp'. 
Use `sqlalchemy.Float` for 'Double'. 
Use `sqlalchemy.Text` for 'Text'. 
Use `sqlalchemy.Numeric` for 'Decimal'. 
For 'UUID', use `sqlalchemy.String(36)` and ensure `default=uuid.uuid4, index=True` is set if it's a primary key. Import `uuid` module. 
Apply `nullable=False` for attributes with `nn: true`. 
Apply `unique=True` for attributes with `un: true`. 
All models should inherit from a `Base` declarative base. 

Input JSON Schema: 
```json 
{schema_json_str} 
``` 

Example `models.py` structure and style: 
```python 
{example_models_content} 
``` 

Generate ONLY the content for the `models.py` file. 
Start directly with the file content (e.g., imports). Do not use any introductory phrases or explanations. 
""" 

def construct_schemas_prompt(schema_data: Dict[str, Any], example_schemas_content: str, generated_models_content: str) -> str: 
    schema_json_str = json.dumps(schema_data, indent=2) 
    return f""" 
You are an expert Python developer specializing in Pydantic V2. 
Based on the following JSON schema, generate the content for `schemas.py`. 
This file should contain all Pydantic V2 models for request/response validation (e.g., `EntityBase`, `EntityCreate`, `EntityUpdate`, `Entity`). 
Use `model_config = {{"from_attributes": True}}`. 
Represent relationships using nested Pydantic models where appropriate, especially for read schemas. 
Map schema types (String, Integer, Long, Boolean, Date, Timestamp, Double, Text, Decimal, UUID) to appropriate Pydantic types (e.g., `str`, `int`, `bool`, `datetime.date`, `datetime.datetime`, `float`, `decimal.Decimal`, `uuid.UUID`). Import `datetime`, `decimal`, `uuid` as needed. 

Input JSON Schema: 
```json 
{schema_json_str} 
``` 

Reference generated `models.py` content (for relationship context if needed, but primarily focus on the JSON schema): 
```python 
{generated_models_content[:1500]}  
``` 

Example `schemas.py` structure and style: 
```python 
{example_schemas_content} 
``` 

Generate ONLY the content for the `schemas.py` file. 
Start directly with the file content. Do not use any introductory phrases. 
""" 

def construct_crud_prompt(schema_data: Dict[str, Any], example_crud_content: str, generated_models_content: str, generated_schemas_content: str) -> str: 
    schema_json_str = json.dumps(schema_data, indent=2) 
    return f""" 
You are an expert Python developer. 
Based on the JSON schema, the generated `models.py`, and `schemas.py`, generate the content for `crud.py`. 
This file should contain CRUD (Create, Read, Update, Delete) functions for ALL entities defined in the schema. 
Each entity should have at least: 
- `get_<entity>(db: Session, <entity_id_name>: <id_type>)` 
- `get_<entity>_by_<unique_field>(db: Session, <unique_field>: str)` (if unique fields like email/username exist) 
- `get_<entities>(db: Session, skip: int = 0, limit: int = 100)` 
- `create_<entity>(db: Session, <entity_param_name>: schemas.<EntityCreate>)` 
- `update_<entity>(db: Session, db_<entity_name>: models.<Entity>, <entity_update_param>: schemas.<EntityUpdate>)` (optional, if update schemas are distinct) 
- `delete_<entity>(db: Session, db_<entity_name>: models.<Entity>)` (optional) 

Input JSON Schema: 
```json 
{schema_json_str} 
``` 

Generated `models.py` (for reference): 
```python 
{generated_models_content[:1500]}  
``` 

Generated `schemas.py` (for reference): 
```python 
{generated_schemas_content[:1500]} 
``` 

Example `crud.py` structure and style: 
```python 
{example_crud_content} 
``` 

Generate ONLY the content for the `crud.py` file. 
Start directly with the file content. 
""" 

def construct_router_prompt(entity: Dict[str, Any], all_entities_names: List[str], example_router_content: str, generated_models_content: str, generated_schemas_content: str, generated_crud_content: str) -> str: 
    entity_name = entity['name'] 
    entity_name_lower = entity_name.lower() 
    pk_attr = next((attr for attr in entity['attributes'] if attr.get('pk')), None) 
    pk_name = pk_attr['name'] if pk_attr else 'id' 
    pk_type_str = "int" 
    if pk_attr: 
        if pk_attr['type'] in ["String", "UUID"]: pk_type_str = "str" 
        elif pk_attr['type'] in ["Integer", "Long"]: pk_type_str = "int" 
     
    plural_entity_name = entity_name + "s" if not entity_name.endswith("s") else entity_name + "es" if entity_name.endswith("s") else entity_name + "s" 

    return f""" 
You are an expert Python developer creating FastAPI routers. 
Generate the content for a router file for the `{entity_name}` entity. 
The file should be named `routers/{entity_name_lower}_router.py`. 
It should define an `APIRouter` instance and include endpoints for all CRUD operations for the `{entity_name}` entity. 
Use the CRUD functions from `crud.py` (e.g., `crud.create_{entity_name_lower}(...)`) and Pydantic schemas from `schemas.py` (e.g., `schemas.{entity_name}Create`, `schemas.{entity_name}`). 
The router prefix should be `/{plural_entity_name.lower()}` and tag should be `"{plural_entity_name}"`. 
Path parameter for single entity GET should be `{{ {entity_name_lower}_{pk_name} }}` with type hint `{pk_type_str}`. 

Entity Schema: 
```json 
{json.dumps(entity, indent=2)} 
``` 

Reference `models.py`: 
```python 
{generated_models_content[:1000]} 
``` 
Reference `schemas.py`: 
```python 
{generated_schemas_content[:1000]} 
``` 
Reference `crud.py`: 
```python 
{generated_crud_content[:1000]} 
``` 

Example structure for a router file (this example might be for a different entity, adapt it for `{entity_name}`): 
```python 
{example_router_content} 
``` 

Generate ONLY the content for the `routers/{entity_name_lower}_router.py` file. 
Start directly with the file content. 
""" 

def construct_main_app_prompt(entity_names: List[str], example_main_content: str, generated_routers_info: Dict[str, str]) -> str: 
    router_imports = [] 
    router_includes = [] 
    for entity_name in entity_names: 
        router_name = f"{entity_name.lower()}_router" 
        plural_entity_name = entity_name + "s" if not entity_name.endswith("s") else entity_name + "es" if entity_name.endswith("s") else entity_name + "s" 
        router_imports.append(f"from .routers import {router_name}") 
        router_includes.append(f'app.include_router({router_name}.router, prefix="/{plural_entity_name.lower()}", tags=["{plural_entity_name}"])') 
     
    router_imports_str = "\n".join(router_imports) 
    router_includes_str = "\n    ".join(router_includes) 

    generated_routers_preview = "\n".join(f"# Preview of routers/{fname}:\n{content[:200]}...\n" for fname, content in generated_routers_info.items()) 

    return f""" 
You are an expert Python developer creating a FastAPI `main.py` file. 
Generate the content for `main.py`. 
The application should initialize the database using SQLAlchemy (e.g., `models.Base.metadata.create_all(bind=engine)`). 
It must import and include routers for the following entities: {', '.join(entity_names)}. 
The router imports should look like: 
{router_imports_str} 
And router inclusions like: 
    {router_includes_str} 

Reference generated router previews (these are just snippets to understand their structure): 
{generated_routers_preview} 

Example `main.py` structure and style: 
```python 
{example_main_content} 
``` 

Generate ONLY the content for the `main.py` file. 
Start directly with the file content. 
""" 

# --- Main Orchestration Function --- 
async def generate_fastapi_project(
    schema_data: Dict[str, Any], 
    output_base_dir: Path
) -> Path:
    project_name_prefix = "fastapi_app"
    if schema_data.get('entities') and schema_data['entities'][0].get('name'):
        first_entity_name = schema_data['entities'][0]['name'].lower().replace(" ", "_").replace("-", "_")
        project_name_prefix = f"fastapi_{first_entity_name}"
    else:
        first_entity_name = "generic_app" 
    
    project_name = f"{project_name_prefix}_{uuid.uuid4().hex[:6]}"
    project_output_dir = output_base_dir / project_name
    project_output_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Starting FastAPI project generation: '{project_name}' in '{project_output_dir}'")

    example_files = load_example_files() # This now has more logging

    required_keys = ['models.py', 'schemas.py', 'crud.py', 'router.py', 'main.py', 'database.py', 'requirements.txt', 'readme.md']
    missing_keys = [k for k in required_keys if k not in example_files]

    if missing_keys:
        logger.error(f"One or more critical example template files are missing. Expected keys: {required_keys}. Found keys: {list(example_files.keys())}. Missing: {missing_keys}")
        raise FileNotFoundError(f"Missing critical FastAPI example template files: {', '.join(missing_keys)}")

    generated_files_content: Dict[str, str] = {}

    async def _generate_single_file_content(target_filename: str, prompt: str) -> str:
        logger.info(f"Requesting LLM content for {target_filename}...")
        llm_response = await call_gemini_api(
            prompt, 
            temperature=0.3, 
            max_output_tokens=8192,
        ) 
        
        if llm_response.startswith("Error:"):
            logger.error(f"LLM provider returned error for {target_filename}: {llm_response}")
            return f"# LLM Generation Error for {target_filename}:\n# {llm_response}"
        
        parsed_files = parse_llm_output_to_files(llm_response)
        
        if target_filename in parsed_files:
            return parsed_files[target_filename]
        
        non_error_parsed_files = {k: v for k, v in parsed_files.items() if not k.startswith("llm_")}
        if len(non_error_parsed_files) == 1:
            logger.warning(f"LLM returned a single file with a different name/path than expected '{target_filename}'. Using its content: {list(non_error_parsed_files.keys())[0]}")
            return list(non_error_parsed_files.values())[0]

        if not parsed_files or all(k.startswith("llm_") for k in parsed_files): 
            if llm_response and not llm_response.startswith("Error:"):
                 logger.warning(f"LLM response for {target_filename} not in '=== FILE: ... ===' format or no specific file found. Using raw response as content.")
                 return llm_response
        
        logger.error(f"Could not extract targeted content for {target_filename} from LLM response. Parsed files: {list(parsed_files.keys())}. Raw response (truncated): {llm_response[:300]}")
        return f"# Failed to extract targeted content for {target_filename}. Review LLM response. Raw (truncated):\n# {llm_response[:500]}"

    models_prompt = construct_models_prompt(schema_data, example_files['models.py'])
    models_content = await _generate_single_file_content('models.py', models_prompt)
    if models_content.startswith("# LLM Generation Error") or models_content.startswith("# Failed to extract"):
        raise Exception(f"Failed to generate models.py: {models_content}")
    generated_files_content['models.py'] = models_content

    schemas_prompt = construct_schemas_prompt(schema_data, example_files['schemas.py'], models_content)
    schemas_content = await _generate_single_file_content('schemas.py', schemas_prompt)
    if schemas_content.startswith("# LLM Generation Error") or schemas_content.startswith("# Failed to extract"):
        raise Exception(f"Failed to generate schemas.py: {schemas_content}")
    generated_files_content['schemas.py'] = schemas_content

    crud_prompt = construct_crud_prompt(schema_data, example_files['crud.py'], models_content, schemas_content)
    crud_content = await _generate_single_file_content('crud.py', crud_prompt)
    if crud_content.startswith("# LLM Generation Error") or crud_content.startswith("# Failed to extract"):
        raise Exception(f"Failed to generate crud.py: {crud_content}")
    generated_files_content['crud.py'] = crud_content
    
    entity_names = [e['name'] for e in schema_data.get('entities', [])]
    generated_routers_info = {} 
    routers_dir = project_output_dir / "routers" 
    routers_dir.mkdir(exist_ok=True)

    for entity in schema_data.get('entities', []):
        entity_name_lower = entity['name'].lower()
        router_target_filename = f"routers/{entity_name_lower}_router.py" 
        router_prompt = construct_router_prompt(entity, entity_names, example_files['router.py'], models_content, schemas_content, crud_content)
        single_router_content = await _generate_single_file_content(router_target_filename, router_prompt)
        
        if single_router_content.startswith("# LLM Generation Error") or single_router_content.startswith("# Failed to extract"):
            logger.error(f"Failed to generate {router_target_filename}: {single_router_content}")
            generated_files_content[router_target_filename] = f"# FAILED TO GENERATE ROUTER: {entity['name']}\n{single_router_content}"
            generated_routers_info[f"{entity_name_lower}_router.py"] = f"# FAILED: {single_router_content}" 
        else:
            generated_files_content[router_target_filename] = single_router_content
            generated_routers_info[f"{entity_name_lower}_router.py"] = single_router_content

    generated_files_content['database.py'] = example_files['database.py'] 

    main_app_prompt = construct_main_app_prompt(entity_names, example_files['main.py'], generated_routers_info)
    main_app_content = await _generate_single_file_content('main.py', main_app_prompt)
    if main_app_content.startswith("# LLM Generation Error") or main_app_content.startswith("# Failed to extract"):
        raise Exception(f"Failed to generate main.py: {main_app_content}")
    generated_files_content['main.py'] = main_app_content
    
    # generate the requirements.txt and README.md files
    generated_files_content['requirements.txt'] = example_files['requirements.txt']
    generated_files_content['README.md'] = example_files['readme.md']

    file_count = 0
    for rel_filepath_str, content in generated_files_content.items():
        if content.startswith("# LLM Generation Error") or content.startswith("# FAILED TO GENERATE"):
            logger.warning(f"Content for {rel_filepath_str} indicates a generation error. Writing error message to file.")
        
        if ".." in rel_filepath_str or Path(rel_filepath_str).is_absolute():
            logger.warning(f"Skipping potentially unsafe or absolute filepath: {rel_filepath_str}")
            continue
        
        abs_filepath = (project_output_dir / rel_filepath_str).resolve()
        if not str(abs_filepath).startswith(str(project_output_dir.resolve())):
            logger.warning(f"Security: Skipping filepath trying to escape project directory: '{rel_filepath_str}'")
            continue

        try:
            abs_filepath.parent.mkdir(parents=True, exist_ok=True)
            with open(abs_filepath, "w", encoding="utf-8") as f:
                f.write(content)
            logger.info(f"Written file: {abs_filepath}")
            if not (content.startswith("# LLM Generation Error") or content.startswith("# FAILED TO GENERATE")):
                file_count +=1 
        except Exception as e:
            logger.error(f"Error writing generated file {abs_filepath}: {e}", exc_info=True)

    if file_count == 0: 
        logger.error(f"No valid application files were successfully generated and written for project {project_name}.")
        raise Exception(f"FastAPI project generation resulted in zero valid application files for {project_name}. Check logs and error placeholder files in the output directory.")

    logger.info(f"FastAPI project '{project_name}' ({file_count} valid files) generated at {project_output_dir}")
    return project_output_dir


async def main_test_refactored(): 
    logging.basicConfig(level=logging.DEBUG, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    test_schema = {
        "entities": [
            {
                "name": "User",
                "attributes": [
                    {"name": "id", "type": "Integer", "pk": True, "nn": True, "un": False, "fk": False},
                    {"name": "username", "type": "String", "pk": False, "nn": True, "un": True, "fk": False},
                    {"name": "email", "type": "String", "pk": False, "nn": True, "un": True, "fk": False},
                ]
            },
            {
                "name": "Post",
                "attributes": [
                    {"name": "id", "type": "Integer", "pk": True, "nn": True, "un": False, "fk": False},
                    {"name": "title", "type": "String", "pk": False, "nn": True, "un": False, "fk": False},
                    {"name": "content", "type": "Text", "pk": False, "nn": False, "un": False, "fk": False},
                    {"name": "user_id", "type": "Integer", "pk": False, "nn": True, "un": False, "fk": True, "references_entity": "User", "references_field": "id"}
                ]
            }
        ],
        "relationships": [{"from_entity": "User", "to_entity": "Post", "type": "1:N", "foreign_key_in_to_entity": "user_id"}]
    }
    
    temp_output_base_dir = Path(tempfile.gettempdir()) / "er2backend_llm_refactored_projects_fastapi"
    temp_output_base_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Refactored FastAPI test generation output to subdirs in: {temp_output_base_dir}")

    try:
        generated_project_path = await generate_fastapi_project(
            test_schema, 
            temp_output_base_dir
        )
        logger.info(f"Refactored FastAPI Test: Project generated at: {generated_project_path}")
    except Exception as e:
        logger.error(f"Error during refactored FastAPI standalone test: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main_test_refactored())
