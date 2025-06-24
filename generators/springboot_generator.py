# er2backend/generators/springboot_generator.py

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import uuid
import asyncio

# Import the new pipeline utilities
from .generator_utils import GenerationPipeline, GenerationContext

logger = logging.getLogger(__name__)
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "springboot"

def load_springboot_example_files() -> Dict[str, str]:
    """Loads all example files from the Spring Boot template directory."""
    examples = {}
    if not TEMPLATE_DIR.is_dir():
        logger.error(f"Spring Boot template directory NOT FOUND: {TEMPLATE_DIR}")
        return examples
    
    for ext_pattern in ["Example*.java", "example_*.java", "example_*.xml", "example_*.properties", "example_*.md"]:
        for file_path in TEMPLATE_DIR.glob(ext_pattern):
            try:
                examples[file_path.name] = file_path.read_text(encoding='utf-8')
            except Exception as e:
                logger.error(f"Error loading Spring Boot template file {file_path.name}: {e}")
    return examples

def get_java_type(schema_type: str) -> str:
    """Maps schema data types to Java data types."""
    type_mapping = {
        "string": "String", "integer": "Integer", "long": "Long", "boolean": "Boolean",
        "date": "java.time.LocalDate", "timestamp": "java.time.LocalDateTime",
        "double": "Double", "text": "String", "decimal": "java.math.BigDecimal", "uuid": "java.util.UUID"
    }
    return type_mapping.get(schema_type.lower(), "String")

# --- CONTEXT-AWARE PROMPT FUNCTIONS ---

def construct_entity_prompt(context: GenerationContext, entity_schema: Dict[str, Any]) -> str:
    entity_name_pascal = entity_schema['name']
    # CORRECTED: Added a fallback for base_package to prevent error on None.
    base_package_path = (context.base_package or 'com.example.placeholder').replace('.', '/')
    java_src_path = f"src/main/java/{base_package_path}"
    return f"""
You are an expert Java developer creating JPA entities.
Based on the JSON schema for the entity '{entity_name_pascal}', generate the complete Java class content for `{java_src_path}/model/{entity_name_pascal}.java`.

The class must be a JPA entity using Jakarta Persistence annotations.
- Use Lombok for boilerplate (`@Data`, `@Builder`, etc.).
- Define fields, `@Id`, `@GeneratedValue`, `@Column`, `@ManyToOne`, and `@OneToMany` relationships.
- For foreign keys, generate the relationship field (e.g., `private Author author;`) annotated with `@ManyToOne` and `@JoinColumn(name="author_id")`. Do not generate a separate primitive `author_id` field.
- For `@OneToMany`, the `mappedBy` attribute must refer to the field in the related entity that defines the `@ManyToOne` side. Assume this field is named after the current entity in lowercase.

Entity Schema:
```json
{json.dumps(entity_schema, indent=2)}
```

Example Style (`ExampleEntity.java`):
```java
{context.example_files['ExampleEntity.java']}
```

Generate ONLY the Java code for the `{entity_name_pascal}.java` file, starting with the package declaration.
"""

def construct_repository_prompt(context: GenerationContext, entity_schema: Dict[str, Any]) -> str:
    entity_name = entity_schema['name']
    pk_attr = next((attr for attr in entity_schema['attributes'] if attr.get('isPrimaryKey')), {'type': 'Long'})
    pk_java_type = get_java_type(pk_attr['type']).split('.')[-1]
    
    base_package_path = (context.base_package or 'com.example.placeholder').replace('.', '/')
    java_src_path = f"src/main/java/{base_package_path}"
    model_context = context.get_context_for_prompt([f"{java_src_path}/model/{entity_name}.java"])
    
    return f"""
Generate a Spring Data JPA Repository interface for the `{entity_name}` entity in package `{context.base_package}.repository`.
File name: `{java_src_path}/repository/{entity_name}Repository.java`.

The interface must extend `JpaRepository<{entity_name}, {pk_java_type}>` and be annotated with `@Repository`.
Include finder methods for any attributes marked as unique.

--- Generated Entity Context ---
{model_context}
--- End Context ---

Example Style (`ExampleRepository.java`):
```java
{context.example_files['ExampleRepository.java']}
```

Generate ONLY the Java code for `{entity_name}Repository.java`, starting with the package declaration.
"""

def construct_dto_prompt(context: GenerationContext, entity_schema: Dict[str, Any]) -> str:
    entity_name = entity_schema['name']
    base_package_path = (context.base_package or 'com.example.placeholder').replace('.', '/')
    java_src_path = f"src/main/java/{base_package_path}"
    return f"""
You are an expert Java developer creating DTOs.
Generate three DTO Java classes for the entity '{entity_name}' in package `{context.base_package}.dto`.
1.  `{entity_name}Response.java`: For API responses.
2.  `{entity_name}CreateRequest.java`: For creation, with Jakarta validation annotations.
3.  `{entity_name}UpdateRequest.java`: For updates, with optional fields.

Use Lombok. Map schema types to appropriate Java types.

Entity Schema:
```json
{json.dumps(entity_schema, indent=2)}
```

Example Style (`ExampleEntityDto.java`):
```java
{context.example_files['ExampleEntityDto.java']}
```

Generate ONLY the Java code for these DTO files. Use the '=== FILE: path/to/Filename.java ===' marker format for each class.
Example path: `{java_src_path}/dto/{entity_name}Response.java`
"""

def construct_service_prompt(context: GenerationContext, entity_schema: Dict[str, Any]) -> str:
    entity_name = entity_schema['name']
    base_package_path = (context.base_package or 'com.example.placeholder').replace('.', '/')
    java_src_path = f"src/main/java/{base_package_path}"
    
    # Provide context of all related files for this entity
    # CORRECTED: Use safe access with .get() in case DTOs were not generated
    dto_response_path = context.generated_files.get(f"{java_src_path}/dto/{entity_name}Response.java", "")
    dto_create_path = context.generated_files.get(f"{java_src_path}/dto/{entity_name}CreateRequest.java", "")
    dto_update_path = context.generated_files.get(f"{java_src_path}/dto/{entity_name}UpdateRequest.java", "")

    required_context_paths = [
        f"{java_src_path}/model/{entity_name}.java",
        f"{java_src_path}/repository/{entity_name}Repository.java",
        dto_response_path,
        dto_create_path,
        dto_update_path
    ]
    # Filter out empty paths before getting context
    required_context = context.get_context_for_prompt([p for p in required_context_paths if p])
    
    return f"""
Generate a Spring Boot Service class for the `{entity_name}` entity in package `{context.base_package}.service`.
It must inject `{entity_name}Repository` and handle CRUD logic, using the DTOs and Entity classes provided in the context.
Implement manual mapping logic between DTOs and Entities.

--- Generated Context Files ---
{required_context}
--- End Context ---

Example Style (`ExampleService.java`):
```java
{context.example_files['ExampleService.java']}
```

Generate ONLY the Java code for `{entity_name}Service.java`.
"""

def construct_controller_prompt(context: GenerationContext, entity_schema: Dict[str, Any]) -> str:
    entity_name = entity_schema['name']
    base_package_path = (context.base_package or 'com.example.placeholder').replace('.', '/')
    java_src_path = f"src/main/java/{base_package_path}"
    
    dto_response_path = context.generated_files.get(f"{java_src_path}/dto/{entity_name}Response.java", "")
    dto_create_path = context.generated_files.get(f"{java_src_path}/dto/{entity_name}CreateRequest.java", "")
    dto_update_path = context.generated_files.get(f"{java_src_path}/dto/{entity_name}UpdateRequest.java", "")
    
    required_context_paths = [
        f"{java_src_path}/service/{entity_name}Service.java",
        dto_response_path,
        dto_create_path,
        dto_update_path,
    ]
    required_context = context.get_context_for_prompt([p for p in required_context_paths if p])

    return f"""
Generate a Spring Boot REST Controller for the `{entity_name}` entity in package `{context.base_package}.controller`.
The controller must inject `{entity_name}Service` and define endpoints for all CRUD operations, returning `ResponseEntity` and using the DTOs provided in context.

--- Generated Context Files ---
{required_context}
--- End Context ---

Example Style (`ExampleController.java`):
```java
{context.example_files['ExampleController.java']}
```

Generate ONLY the Java code for `{entity_name}Controller.java`.
"""

# --- Main Orchestration Function ---
async def generate_springboot_project(schema_data: Dict[str, Any], output_base_dir: Path) -> Tuple[Path, Dict[str, Any]]:
    # 1. Initialization
    first_entity_name = schema_data.get('entities', [{}])[0].get('name', 'App')
    project_name = "".join(word.capitalize() for word in first_entity_name.replace("_", " ").split())
    artifact_id = f"{project_name.lower()}-service"
    group_id = "com.example.generated"
    base_package = f"{group_id}.{artifact_id.replace('-', '')}"
    project_output_dir = output_base_dir / artifact_id
    project_output_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Starting Spring Boot project generation: '{artifact_id}'")
    
    example_files = load_springboot_example_files()
    if not example_files: raise FileNotFoundError("Missing Spring Boot example files.")

    # 2. Create Context and Pipeline
    context = GenerationContext(schema_data, artifact_id, example_files, base_package)
    pipeline = GenerationPipeline(context)

    # 3. Define and Run Generation Steps
    java_src_root = f"src/main/java/{base_package.replace('.', '/')}"
    
    # Static files can be written directly
    pom_content = context.example_files['example_pom.xml'].replace('demo-app', artifact_id).replace('GeneratedSpringApp', f'{project_name} API')
    context.add_file("pom.xml", pom_content)
    context.add_file(f"src/main/resources/application.properties", context.example_files['example_application.properties'].replace('GeneratedSpringApp', artifact_id))
    context.add_file("README.md", context.example_files['example_readme.md'].replace('GeneratedSpringApp', f'{project_name} API'))

    main_app_class_name = f"{project_name}Application"
    main_app_prompt_args = {"context": context, "entity_schema": {}} # Placeholder, not entity specific
    if "ExampleApplication.java" in context.example_files:
        main_app_prompt_args["example_main_app_content"] = context.example_files['ExampleApplication.java']
    
    # We will assume a main application prompt constructor exists.
    # For now, let's assume it only needs base_package and app_name.
    # This part needs to be defined if we want to generate main class via LLM
    # For now, let's copy the example.
    main_app_content = context.example_files['ExampleApplication.java'].replace('com.example.generated', base_package).replace('ExampleApplication', main_app_class_name)
    context.add_file(f"{java_src_root}/{main_app_class_name}.java", main_app_content)
    
    for entity in context.schema_data.get('entities', []):
        entity_name = entity['name']
        
        # Models must be generated first
        await pipeline.run_step(
            f"Model for {entity_name}", 
            construct_entity_prompt, 
            {"context": context, "entity_schema": entity}, 
            f"{java_src_root}/model/{entity_name}.java"
        )
        
        # Then other components that depend on the model
        await pipeline.run_step(
            f"Repository for {entity_name}", 
            construct_repository_prompt, 
            {"context": context, "entity_schema": entity}, 
            f"{java_src_root}/repository/{entity_name}Repository.java"
        )
        
        await pipeline.run_step(
            f"DTOs for {entity_name}", 
            construct_dto_prompt, 
            {"context": context, "entity_schema": entity}, 
            f"{java_src_root}/dto/{entity_name}Dtos.java", # Placeholder path, response will contain actual paths
            is_multi_file=True
        )
        
        await pipeline.run_step(
            f"Service for {entity_name}", 
            construct_service_prompt, 
            {"context": context, "entity_schema": entity}, 
            f"{java_src_root}/service/{entity_name}Service.java"
        )
        
        await pipeline.run_step(
            f"Controller for {entity_name}", 
            construct_controller_prompt, 
            {"context": context, "entity_schema": entity}, 
            f"{java_src_root}/controller/{entity_name}Controller.java"
        )

    # 4. Write all generated files to disk
    for rel_filepath, content in context.generated_files.items():
        abs_filepath = project_output_dir / rel_filepath
        abs_filepath.parent.mkdir(parents=True, exist_ok=True)
        abs_filepath.write_text(content, encoding='utf-8')
        logger.info(f"Written file: {abs_filepath}")

    # 5. Generate final summary
    generation_summary = await pipeline.run_summary_step()

    logger.info(f"Spring Boot project '{artifact_id}' generated successfully at {project_output_dir}")
    return project_output_dir, generation_summary
