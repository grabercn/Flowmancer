# er2backend/generators/dotnet_generator.py

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple
import uuid
import asyncio
import os
import re
import shutil

# Import the new pipeline utilities
from .generator_utils import GenerationPipeline, GenerationContext

logger = logging.getLogger(__name__)
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "dotnet"

def load_dotnet_example_files() -> Dict[str, str]:
    """Loads all example files from the .NET template directory."""
    examples = {}
    if not TEMPLATE_DIR.is_dir():
        logger.error(f".NET template directory NOT FOUND: {TEMPLATE_DIR}")
        return examples
    
    for ext_pattern in ["Example*.cs", "example*.csproj", "example*.json", "example*.md"]:
        for file_path in TEMPLATE_DIR.glob(ext_pattern):
            try:
                examples[file_path.name] = file_path.read_text(encoding='utf-8')
            except Exception as e:
                logger.error(f"Error loading .NET template file {file_path.name}: {e}")
    return examples

def get_csharp_type(schema_type: str) -> str:
    """Maps schema data types to C# data types."""
    type_mapping = {
        "string": "string", "integer": "int", "long": "long", "boolean": "bool",
        "date": "DateTime", "datetime": "DateTime", "timestamp": "DateTime",
        "double": "double", "decimal": "decimal", "text": "string", "uuid": "Guid"
    }
    return type_mapping.get(schema_type.lower(), "string")

# --- CONTEXT-AWARE PROMPT FUNCTIONS ---

def construct_model_prompt(context: GenerationContext, entity_schema: Dict[str, Any]) -> str:
    entity_name_pascal = "".join(word.capitalize() for word in entity_schema['name'].replace("_", " ").split())
    return f"""
You are an expert C# developer creating EF Core models for a .NET Web API.
Based on the following schema for the entity '{entity_name_pascal}', generate the complete C# class content.

The class must be a POCO for use with Entity Framework Core.
- Add `[Key]` for the primary key. `[Required]` for non-nullable fields. `[StringLength]` for strings.
- For foreign keys (e.g., `authorId`), generate BOTH the primitive FK property (`public int AuthorId {{ get; set; }}`) AND the navigation property (`public Author Author {{ get; set; }}`).
- For one-to-many relationships, add `public ICollection<Book> Books {{ get; set; }} = new List<Book>();`.

Entity Schema:
```json
{json.dumps(entity_schema, indent=2)}
```

Example Style:
```csharp
{context.example_files['ExampleModel.cs']}
```

Generate ONLY the C# code for `{entity_name_pascal}.cs`, including the namespace `{context.project_name}.Models`.
"""

def construct_datacontext_prompt(context: GenerationContext) -> str:
    entities = context.schema_data.get('entities', [])
    entity_names = ["".join(word.capitalize() for word in e['name'].replace("_", " ").split()) for e in entities]
    dbset_properties = "\n".join([f"        public DbSet<{name}> {name}s {{ get; set; }}" for name in entity_names])
    
    models_context = context.get_context_for_prompt([f for f in context.generated_files if f.startswith(f"{context.project_name}/Models/")])

    return f"""
Generate the `DataContext.cs` file for an EF Core DbContext in namespace `{context.project_name}.Data`.
It must inherit from `DbContext` and include these `DbSet` properties:
{dbset_properties}

Use the following generated model files as CRITICAL context for class names and namespaces.
--- Generated Models Context ---
{models_context}
--- End Context ---

Example Style:
```csharp
{context.example_files['ExampleDataContext.cs']}
```

Generate ONLY the C# code for `DataContext.cs`.
"""

def construct_dto_prompt(context: GenerationContext, entity_schema: Dict[str, Any]) -> str:
    entity_name_pascal = "".join(word.capitalize() for word in entity_schema['name'].replace("_", " ").split())
    return f"""
You are a C# developer creating DTOs as C# records.
Generate two DTO records for the entity '{entity_name_pascal}' inside the `{context.project_name}.DTOs` namespace.
1. A request DTO, named `{entity_name_pascal}Dto`, for creation/updates. It should contain all non-PK, non-navigation properties. Use data annotations like `[Required]`.
2. A response DTO, named `{entity_name_pascal}ResponseDto`, containing all properties, including the primary key.

Entity Schema:
```json
{json.dumps(entity_schema, indent=2)}
```

Generate ONLY the C# code for these DTOs. Use the '=== FILE: path/to/Filename.cs ===' marker format for each.
Example file path: `{context.project_name}/DTOs/{entity_name_pascal}Dto.cs`
"""

def construct_controller_prompt(context: GenerationContext, entity_schema: Dict[str, Any]) -> str:
    entity_name_pascal = "".join(word.capitalize() for word in entity_schema['name'].replace("_", " ").split())
    plural_name = entity_name_pascal + "s"
    pk_attr = next((attr for attr in entity_schema['attributes'] if attr.get('isPrimaryKey')), {'type': 'int', 'name': 'id'})
    pk_type = get_csharp_type(pk_attr['type'])
    pk_name_pascal = "".join(word.capitalize() for word in pk_attr['name'].replace("_", " ").split())
    
    # Provide the full context of already generated files
    full_context = context.get_context_for_prompt(list(context.generated_files.keys()))
    
    return f"""
You are an expert C# developer creating API controllers for a .NET Web API.
Generate a C# API Controller for the entity '{entity_name_pascal}'.
File name: `{context.project_name}/Controllers/{plural_name}Controller.cs`.

The controller must:
- Use `[ApiController]` and `[Route("api/[controller]")]`.
- Inject `{context.project_name}.Data.DataContext`.
- Implement full async CRUD endpoints (GET all, GET by ID, POST, PUT, DELETE).
- Use `ActionResult<T>` and return correct HTTP status codes.
- Use DTOs for requests and responses. Use `{entity_name_pascal}Dto` for POST/PUT and `{entity_name_pascal}ResponseDto` for GET.
- Perform manual mapping between DTOs and Models.
- The primary key is named `{pk_name_pascal}` of type `{pk_type}`. You MUST use this exact name and type.

Use these generated files for CRITICAL CONTEXT on namespaces, class names, and properties.
--- Full Generated Context ---
{full_context}
--- End Context ---

Example Style:
```csharp
{context.example_files['ExampleController.cs']}
```

Generate ONLY the C# code for `{plural_name}Controller.cs`.
"""

def construct_program_cs_prompt(context: GenerationContext) -> str:
    return f"""
Generate the `Program.cs` file for a modern .NET 8 Web API.
It must:
- Add services: Controllers, DbContext (using an In-Memory database), and Swagger.
- Add a CORS policy named "AllowAll".
- Configure the HTTP pipeline to use Swagger, HTTPS Redirection, CORS, and map controllers.
The namespace for the DataContext is `{context.project_name}.Data`.

Example Style:
```csharp
{context.example_files['ExampleProgram.cs']}
```

Generate ONLY the C# code for `Program.cs`.
"""

def construct_csproj_prompt(context: GenerationContext) -> str:
    return f"""
Generate the content for a `.csproj` file for a .NET 8.0 Web API.
It must include `PackageReference` items for:
`Microsoft.AspNetCore.OpenApi`, `Microsoft.EntityFrameworkCore`, `Microsoft.EntityFrameworkCore.InMemory`,
`Microsoft.EntityFrameworkCore.Tools`, and `Swashbuckle.AspNetCore`.

Example Style:
```xml
{context.example_files['example.csproj']}
```

Generate ONLY the XML content for the `.csproj` file for project `{context.project_name}`.
"""

# --- Main Orchestration Function ---
async def generate_dotnet_project(schema_data: Dict[str, Any], output_base_dir: Path) -> Tuple[Path, Dict[str, Any]]:
    # 1. Initialization
    first_entity = schema_data.get('entities', [{}])[0].get('name', 'My')
    project_name = "".join(word.capitalize() for word in first_entity.replace("_", " ").split()) + "Api"
    project_output_dir = output_base_dir / project_name
    project_output_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Starting .NET project generation: '{project_name}'")

    example_files = load_dotnet_example_files()
    if not example_files: raise FileNotFoundError("Missing critical .NET example files.")

    # 2. Create Context and Pipeline
    context = GenerationContext(schema_data, project_name, example_files)
    pipeline = GenerationPipeline(context)

    # 3. Define and Run Generation Steps
    try:
        # Step 3.1: Generate Models for all entities
        for entity in context.schema_data.get('entities', []):
            entity_name_pascal = "".join(word.capitalize() for word in entity['name'].replace("_", " ").split())
            await pipeline.run_step(
                f"Model for {entity_name_pascal}",
                construct_model_prompt,
                {"context": context, "entity_schema": entity},
                f"{project_name}/Models/{entity_name_pascal}.cs"
            )

        # Step 3.2: Generate DataContext
        await pipeline.run_step(
            "DataContext",
            construct_datacontext_prompt,
            {"context": context},
            f"{project_name}/Data/DataContext.cs"
        )
        
        # Step 3.3: Generate DTOs and Controllers for each entity
        for entity in context.schema_data.get('entities', []):
            # DTOs (multi-file)
            await pipeline.run_step(
                f"DTOs for {entity['name']}",
                construct_dto_prompt,
                {"context": context, "entity_schema": entity},
                "dto_placeholder.cs", # Path is determined by LLM response
                is_multi_file=True
            )
            # Controller
            await pipeline.run_step(
                f"Controller for {entity['name']}",
                construct_controller_prompt,
                {"context": context, "entity_schema": entity},
                f"{project_name}/Controllers/{entity['name']}sController.cs"
            )

        # Step 3.4: Generate remaining project files
        await pipeline.run_step("Program.cs", construct_program_cs_prompt, {"context": context}, "Program.cs")
        await pipeline.run_step(f"{project_name}.csproj", construct_csproj_prompt, {"context": context}, f"{project_name}.csproj")
        
        context.add_file("appsettings.json", context.example_files["example.appsettings.json"])
        
    except Exception as e:
        logger.error(f"A critical error occurred during .NET file generation: {e}", exc_info=True)
        raise

    # 4. Write all generated files to disk
    for rel_filepath, content in context.generated_files.items():
        # Handle cases where LLM might include the project name in the path
        path_parts = Path(rel_filepath).parts
        if path_parts and path_parts[0] == project_name:
             final_path = project_output_dir / Path(*path_parts[1:])
        else:
             final_path = project_output_dir / rel_filepath
        
        final_path.parent.mkdir(parents=True, exist_ok=True)
        final_path.write_text(content, encoding='utf-8')
        logger.info(f"Written file: {final_path}")

    # 5. Generate final summary
    generation_summary = await pipeline.run_summary_step()

    logger.info(f".NET project '{project_name}' generated successfully at {project_output_dir}")
    return project_output_dir, generation_summary
