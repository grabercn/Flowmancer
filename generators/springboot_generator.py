import json
import logging
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
import tempfile
import uuid
import asyncio

# Utilities from the generator_utils.py
from .generator_utils import call_gemini_api, parse_llm_output_to_files

logger = logging.getLogger(__name__)

# Define the path to the templates for this generator
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "springboot"

# --- Helper to load example files ---
def load_springboot_example_files() -> Dict[str, str]:
    """Loads all example files from the Spring Boot template directory."""
    examples = {}
    if not TEMPLATE_DIR.is_dir():
        logger.warning(f"Spring Boot template directory not found: {TEMPLATE_DIR}")
        return examples
    
    # Load .java, .xml, .properties, .md example files
    for ext_pattern in ["example_*.java", "example_*.xml", "example_*.properties", "example_*.md", "Example*.java"]:
        for file_path in TEMPLATE_DIR.glob(ext_pattern):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    # Use the actual filename the LLM should generate as the key
                    # e.g., ExampleApplication.java -> YourAppNameApplication.java (LLM handles renaming)
                    # For the key in examples dict, we can use the template name for clarity.
                    key_name = file_path.name # e.g., ExampleApplication.java
                    examples[key_name] = f.read()
                    logger.info(f"Loaded example file {file_path.name}")
            except Exception as e:
                logger.error(f"Error loading Spring Boot template file {file_path.name}: {e}")
    
    if not examples:
        logger.warning(f"No Spring Boot example files were loaded from {TEMPLATE_DIR}. LLM context will be limited.")
    return examples

# --- Prompt Construction Functions for Spring Boot Components ---

def get_java_type(schema_type: str) -> str:
    """Maps schema data types to Java data types."""
    type_mapping = {
        "string": "String",
        "integer": "Integer", # For IDs or general integers
        "long": "Long",       # For larger integer IDs or counts
        "boolean": "Boolean", # Or "boolean" primitive
        "date": "java.time.LocalDate",
        "timestamp": "java.time.LocalDateTime",
        "double": "Double",   # Or "double" primitive
        "text": "String",     # Often mapped to String, @Lob or columnDefinition="TEXT" in JPA
        "decimal": "java.math.BigDecimal",
        "uuid": "java.util.UUID"
    }
    return type_mapping.get(schema_type.lower(), "String") # Default to String

def get_jpa_column_definition(schema_type: str, attr_name: str = "") -> Optional[str]:
    """ Suggests JPA column definition for certain types if needed. """
    if schema_type.lower() == "text":
        return "@Column(columnDefinition = \"TEXT\")"
    if schema_type.lower() == "uuid" and "id" in attr_name.lower(): # For UUID PKs
        return "@Column(name = \"{db_col_name}\", updatable = false, nullable = false, length = 36)" # LLM fills db_col_name
    if schema_type.lower() == "uuid":
        return "@Column(length = 36)"
    return None


def construct_entity_prompt(entity_schema: Dict[str, Any], all_entities_map: Dict[str, Any], example_entity_content: str, base_package: str) -> str:
    entity_name_pascal = entity_schema['name']
    attributes_definitions = []
    imports = {"jakarta.persistence.*"} # Common imports

    for attr in entity_schema['attributes']:
        attr_name_camel = attr['name'] # Assuming names are suitable for Java fields
        java_type = get_java_type(attr['type'])
        
        # Add to imports if it's a complex type
        if '.' in java_type: imports.add(java_type)
        if attr.get('fk'): imports.add("java.util.Set") # For potential OneToMany

        field_definition = f"    private {java_type.split('.')[-1]} {attr_name_camel};"
        annotations = []

        if attr.get('pk'):
            annotations.append("    @Id")
            # Determine GenerationType based on type
            if java_type == "java.util.UUID":
                annotations.append("    @GeneratedValue(strategy = GenerationType.UUID)")
                col_def = get_jpa_column_definition(attr['type'], attr_name_camel)
                if col_def: annotations.append(f"    {col_def.replace('{db_col_name}', attr_name_camel)}") # Simple replacement for example
            else: # Integer, Long
                annotations.append("    @GeneratedValue(strategy = GenerationType.IDENTITY)")
        
        column_params = []
        if attr.get('nn'): column_params.append("nullable = false")
        if attr.get('un'): column_params.append("unique = true")
        if attr['type'].lower() == "string" and not attr.get('pk'): # Default length for strings
            column_params.append("length = 255") # Example default length
        
        col_def_override = get_jpa_column_definition(attr['type'])
        # Check if col_def_override provides a full @Column annotation or just the definition string
        if col_def_override and "@Column" in col_def_override:
            # If it's a full @Column annotation, add it directly if no other @Column with 'columnDefinition' exists
            if not any("columnDefinition" in ann for ann in annotations if "@Column" in ann):
                 annotations.append(f"    {col_def_override}")
        elif col_def_override:
            # If it's just the definition part (e.g., "TEXT"), add it to column_params
            column_params.append(f'''columnDefinition = "{col_def_override.replace('"', '')}"''')


        if column_params and not any("@Column" in ann for ann in annotations if col_def_override and "@Column" in col_def_override):
            # If col_def_override already added a full @Column, this condition prevents adding another one.
            # This ensures we add @Column only if not already handled by a specific col_def_override.
            annotations.append(f"    @Column(name = \"{attr_name_camel}\", {', '.join(column_params)})")
        elif not any("@Column" in ann for ann in annotations) and not attr.get('fk'): # Basic column if no other specifics and not an FK handled by @JoinColumn
             annotations.append(f"    @Column(name = \"{attr_name_camel}\")")


        # Foreign Key and Relationship
        if attr.get('fk'):
            referenced_entity_name = attr.get('references_entity')
            if referenced_entity_name and referenced_entity_name in all_entities_map:
                annotations.append("    @ManyToOne(fetch = FetchType.LAZY)")
                # The FK column itself (e.g., author_id)
                fk_column_name = attr_name_camel 
                # The relationship field (e.g., private Author author;)
                relationship_field_name = referenced_entity_name.lower() 
                
                annotations.append(f"    @JoinColumn(name = \"{fk_column_name}\", referencedColumnName = \"{attr.get('references_field', 'id')}\", nullable = {not attr.get('nn', True)})") # Default nn=True for FK
                field_definition = f"    private {referenced_entity_name} {relationship_field_name};"
                
                imports.add(f"{base_package}.model.{referenced_entity_name}")


        attributes_definitions.extend(annotations)
        attributes_definitions.append(field_definition)
        attributes_definitions.append("") # Newline for readability

    # Add OneToMany relationships for entities that reference this one
    for other_entity_name, other_entity_schema_data in all_entities_map.items(): 
        if other_entity_name == entity_name_pascal: continue
        for other_attr in other_entity_schema_data['attributes']: 
            if other_attr.get('fk') and other_attr.get('references_entity') == entity_name_pascal:
                # mapped_by_field should be the Java field name in the 'other_entity' class
                # that holds the @ManyToOne relationship back to `entity_name_pascal`.
                # Example: if Post has `private User user;`, then mappedBy="user".
                # This requires knowing the field name in the *other* entity.
                # A common convention is to name it after the referenced entity type (e.g., 'user' for User type).
                mapped_by_field = entity_name_pascal.lower() # Simplistic assumption, LLM needs to be smart or prompt needs to guide this better
                
                attributes_definitions.append(f"    // Relationship: This {entity_name_pascal} can have many {other_entity_name}s")
                attributes_definitions.append(f"    @OneToMany(mappedBy = \"{mapped_by_field}\", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)")
                
                other_entity_plural_name = other_entity_name.lower() + "s" 
                if other_entity_name.endswith('s'): 
                     other_entity_plural_name = other_entity_name.lower() + "es"
                elif other_entity_name.endswith('y') and len(other_entity_name) > 1 and other_entity_name[-2].lower() not in 'aeiou': 
                     other_entity_plural_name = other_entity_name[:-1].lower() + "ies"

                attributes_definitions.append(f"    private Set<{other_entity_name}> {other_entity_plural_name} = new java.util.HashSet<>();")
                attributes_definitions.append("")
                imports.add(f"{base_package}.model.{other_entity_name}") 
                imports.add("java.util.Set")
                imports.add("java.util.HashSet")


    import_statements_str = "\n".join(f"import {imp};" for imp in sorted(list(imports))) 
    attributes_str = "\n".join(attributes_definitions)
    
    use_lombok = True 
    lombok_annotations_str = "" 
    if use_lombok:
        pk_field_name_for_lombok = "id" 
        for attr_l in entity_schema['attributes']:
            if attr_l.get('pk'):
                pk_field_name_for_lombok = attr_l['name']
                break
        
        # Construct exclude string for @ToString to avoid circular dependencies with collections
        excluded_collections_for_tostring = []
        for other_name_loop, es_data_loop in all_entities_map.items():
            if any(a_loop.get('fk') and a_loop.get('references_entity') == entity_name_pascal for a_loop in es_data_loop['attributes']):
                other_entity_plural_name_loop = other_name_loop.lower() + "s"
                if other_name_loop.endswith('s'): other_entity_plural_name_loop = other_name_loop.lower() + "es"
                elif other_name_loop.endswith('y') and len(other_name_loop) > 1 and other_name_loop[-2].lower() not in 'aeiou': other_entity_plural_name_loop = other_name_loop[:-1].lower() + "ies"
                excluded_collections_for_tostring.append(f'"{other_entity_plural_name_loop}"')
        
        tostring_exclude_str = ""
        if excluded_collections_for_tostring:
            tostring_exclude_str = f", exclude = {{{', '.join(excluded_collections_for_tostring)}}}"


        lombok_annotations_str = f"""
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {{{", ".join(excluded_collections_for_tostring)}}})
@EqualsAndHashCode(of = {{"{pk_field_name_for_lombok}"}})
"""
        imports.add("lombok.Getter")
        imports.add("lombok.Setter")
        imports.add("lombok.NoArgsConstructor")
        imports.add("lombok.AllArgsConstructor")
        imports.add("lombok.ToString")
        imports.add("lombok.EqualsAndHashCode")
        import_statements_str = "\n".join(f"import {imp};" for imp in sorted(list(imports)))


    table_name = entity_name_pascal.lower() + "s"
    if entity_name_pascal.endswith('y') and len(entity_name_pascal) > 1 and entity_name_pascal[-2].lower() not in 'aeiou':
        table_name = entity_name_pascal[:-1].lower() + "ies"
    elif entity_name_pascal.endswith('s'):
        table_name = entity_name_pascal.lower() + "es"


    return f"""
You are an expert Java developer creating JPA entities for a Spring Boot application.
Based on the following partial JSON schema for the entity `{entity_name_pascal}`, generate the complete Java class content for `src/main/java/{base_package.replace('.', '/')}/model/{entity_name_pascal}.java`.
The class should be a JPA entity. Use Jakarta Persistence annotations (`jakarta.persistence.*`).
Define appropriate fields, primary key (`@Id`, `@GeneratedValue`), columns (`@Column`), and relationships (`@ManyToOne`, `@OneToMany`).
For `@OneToMany` relationships, the `mappedBy` attribute should refer to the field in the related entity that defines the `@ManyToOne` side. This field in the related entity is typically named after the current entity in lowercase (e.g., if current entity is 'User', the field in 'Post' would be 'user').
If an attribute in the schema is a foreign key (e.g., `author_id` of type `Long` in `Book` entity, referencing `Author.id`), the generated Java class for `Book` should include:
1.  The JPA relationship field: `private Author author;` annotated with `@ManyToOne` and `@JoinColumn(name="author_id", referencedColumnName="id")`.
2.  The actual foreign key column is implicitly managed by JPA through this relationship mapping. Do NOT create a separate `private Long author_id;` field if the object mapping `private Author author;` is present with `@JoinColumn(name="author_id")`.

Include necessary imports.
Apply Lombok annotations ({lombok_annotations_str.strip() if use_lombok else "Getter, Setter, Constructors, equals, hashCode, toString manually"}) for boilerplate code. If using Lombok, exclude collection fields from `@ToString` to prevent potential `StackOverflowError` during logging or debugging if there are circular dependencies.

Entity Schema Snippet for `{entity_name_pascal}`:
```json
{json.dumps(entity_schema, indent=2)}
```

Example Entity structure and style (adapt for `{entity_name_pascal}`):
```java
{example_entity_content}
```

Generate ONLY the Java code for the `{entity_name_pascal}.java` file, including package declaration and imports.
Start directly with the `package {base_package}.model;` line.
The primary key is typically named 'id'. Adjust `@EqualsAndHashCode(of = ...)` to use the actual primary key field name.
For attributes marked `nn: true`, use `nullable = false` in `@Column` or `@JoinColumn`. For `un: true`, use `unique = true`.
For `String` types that are not primary keys, a default `@Column(length = 255)` is reasonable unless specified otherwise.
For `Text` types, use `@Column(columnDefinition = "TEXT")`.
For `UUID` PKs, use `@GeneratedValue(strategy = GenerationType.UUID)` and `@Column(length=36, nullable=false, updatable=false)`. For non-PK UUIDs, `@Column(length=36)`.

The final class should look like this, with all fields and relationships correctly defined:
```java
package {base_package}.model;

{import_statements_str} // Ensure this is correctly populated with all needed imports

@Entity
@Table(name = "{table_name}")
{lombok_annotations_str if use_lombok else ""}
public class {entity_name_pascal} {{

{attributes_str}
    // Lombok generates constructors, getters, setters, equals, hashCode, toString if used.
    // Otherwise, they need to be generated manually.
}}
```
Now, generate the complete and correct Java code for `{entity_name_pascal}.java`.
"""

# --- Other Prompt Construction Functions (Similar structure needed for DTO, Repo, Service, Controller, pom.xml, application.properties) ---

def construct_dto_prompt(entity_schema: Dict[str, Any], example_dto_content: str, base_package: str) -> str:
    entity_name = entity_schema['name']
    # Prepare a list of attribute details for the prompt
    attribute_details_for_prompt = []
    for attr in entity_schema['attributes']:
        attr_java_type = get_java_type(attr['type']).split('.')[-1]
        attr_detail = f"- {attr['name']} ({attr_java_type})"
        if attr.get('pk'): attr_detail += " (Primary Key)"
        if attr.get('fk'): attr_detail += f" (Foreign Key to {attr.get('references_entity')}.{attr.get('references_field')})"
        if attr.get('nn'): attr_detail += " (Not Null)"
        if attr.get('un'): attr_detail += " (Unique)"
        attribute_details_for_prompt.append(attr_detail)
    attributes_summary = "\n".join(attribute_details_for_prompt)


    return f"""
You are an expert Java developer creating Pydantic-style DTOs for a Spring Boot application using Jakarta Bean Validation for constraints.
Generate Java DTO classes for the entity '{entity_name}' in package `{base_package}.dto`.
The DTOs should be plain POJOs, preferably using Lombok for boilerplate reduction (`@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder` if appropriate).
Map schema types to appropriate Java types (String, Integer, Long, Boolean, java.time.LocalDate, java.time.LocalDateTime, java.math.BigDecimal, java.util.UUID).
Ensure necessary imports like `java.time.*`, `java.math.BigDecimal`, `java.util.UUID`, `java.util.List`, and `jakarta.validation.constraints.*` are included.

Entity '{entity_name}' has the following attributes:
{attributes_summary}

Create the following DTOs:
1.  `{entity_name}ResponseDto.java`: For API responses. Should include the primary key (e.g., `id`) and all relevant data fields. For foreign key relationships, it might include a summarized DTO of the related entity or just the foreign key ID.
2.  `{entity_name}CreateRequestDto.java`: For creating new entities. Should exclude auto-generated fields like `id`. Apply appropriate `jakarta.validation.constraints` like `@NotBlank`, `@NotEmpty`, `@NotNull`, `@Size`, `@Min`, `@Max`, `@Email` based on the attribute properties (`nn`, `type`, etc.).
3.  `{entity_name}UpdateRequestDto.java`: For updating existing entities. Fields should generally be `java.util.Optional` or nullable to indicate partial updates, or all fields present if full updates are expected. Apply validation constraints as appropriate.

Reference for general DTO style and structure (this example may be for a different entity, adapt it):
```java
{example_dto_content}
```

Generate ONLY the Java code for these DTO files. Output each DTO class in its own file using the '=== FILE: path/to/Filename.java ===' marker format.
Example for file paths:
=== FILE: src/main/java/{base_package.replace('.', '/')}/dto/{entity_name}ResponseDto.java ===
// ... code for {entity_name}ResponseDto ...
=== FILE: src/main/java/{base_package.replace('.', '/')}/dto/{entity_name}CreateRequestDto.java ===
// ... code for {entity_name}CreateRequestDto ...
=== FILE: src/main/java/{base_package.replace('.', '/')}/dto/{entity_name}UpdateRequestDto.java ===
// ... code for {entity_name}UpdateRequestDto ...

Start each file's content directly with its package declaration.
"""

def construct_repository_prompt(entity_schema: Dict[str, Any], example_repository_content: str, base_package: str) -> str:
    entity_name = entity_schema['name']
    pk_attr = next((attr for attr in entity_schema['attributes'] if attr.get('pk')), {'type': 'Long', 'name': 'id'}) # Default ID type and name
    pk_java_type = get_java_type(pk_attr['type']).split('.')[-1] # Get simple name like "Long" or "UUID"

    finder_methods_suggestions = []
    for attr in entity_schema['attributes']:
        if attr.get('un'): # Suggest finder for unique attributes
            attr_java_type_simple = get_java_type(attr['type']).split('.')[-1]
            attr_name_capitalized = attr['name'][0].upper() + attr['name'][1:]
            finder_methods_suggestions.append(f"    java.util.Optional<{entity_name}> findBy{attr_name_capitalized}({attr_java_type_simple} {attr['name']});")

    finders_str = "\n".join(finder_methods_suggestions)

    return f"""
Generate a Spring Data JPA Repository interface for entity '{entity_name}' in package `{base_package}.repository`.
File name: `src/main/java/{base_package.replace('.', '/')}/repository/{entity_name}Repository.java`.
The interface should extend `JpaRepository<{entity_name}, {pk_java_type}>`.
Include necessary imports, including `org.springframework.stereotype.Repository`.
Optionally, include finder methods for attributes marked as unique (`un: true`). For example:
{finders_str}

Reference for style:
```java
{example_repository_content}
```
Generate ONLY the Java code for the `{entity_name}Repository.java` file, including package and imports.
Start directly with the `package {base_package}.repository;` line.
"""

def construct_service_prompt(entity_schema: Dict[str, Any], example_service_content: str, base_package: str) -> str:
    entity_name = entity_schema['name']
    pk_attr = next((attr for attr in entity_schema['attributes'] if attr.get('pk')), {'type': 'Long', 'name': 'id'})
    pk_java_type_simple = get_java_type(pk_attr['type']).split('.')[-1]
    pk_name_camel = pk_attr['name']

    return f"""
Generate a Spring Boot Service class for entity '{entity_name}' in package `{base_package}.service`.
File name: `src/main/java/{base_package.replace('.', '/')}/service/{entity_name}Service.java`.
The service should:
- Be annotated with `@Service`.
- Inject `{entity_name}Repository` via constructor.
- Implement CRUD methods:
    - `create{entity_name}({entity_name}CreateRequestDto createDto)` returning `{entity_name}ResponseDto`.
    - `getAll{entity_name}s()` returning `List<{entity_name}ResponseDto>`.
    - `get{entity_name}ById({pk_java_type_simple} {pk_name_camel})` returning `{entity_name}ResponseDto`.
    - `update{entity_name}({pk_java_type_simple} {pk_name_camel}, {entity_name}UpdateRequestDto updateDto)` returning `{entity_name}ResponseDto`.
    - `delete{entity_name}({pk_java_type_simple} {pk_name_camel})` returning `void`.
- Use `@Transactional` appropriately (read-only for GET methods).
- Handle "Resource Not Found" scenarios by throwing a custom exception (e.g., `ResourceNotFoundException`, which you can assume exists in `{base_package}.exception.ResourceNotFoundException`).
- Perform mapping between DTOs and Entities. You can assume a utility like ModelMapper is available and injected, or generate manual mapping logic. For this task, prefer generating manual mapping logic within private helper methods like `convertToDto(EntityClass entity)` and `convertToEntity(DtoClass dto)`.

Reference for style (this example may be for a different entity, adapt it for `{entity_name}`):
```java
{example_service_content}
```
Generate ONLY the Java code for the `{entity_name}Service.java` file, including package and all necessary imports (Entities, DTOs, Repository, Spring annotations, List, Optional, etc.).
Start directly with the `package {base_package}.service;` line.
"""

def construct_controller_prompt(entity_schema: Dict[str, Any], example_controller_content: str, base_package: str) -> str:
    entity_name = entity_schema['name']
    entity_name_lower = entity_name.lower()
    entity_plural_lower = (entity_name + "s" if not entity_name.endswith("s") else entity_name + "es" if entity_name.endswith("s") else entity_name + "s").lower()
    
    pk_attr = next((attr for attr in entity_schema['attributes'] if attr.get('pk')), {'type': 'Long', 'name': 'id'})
    pk_java_type_simple = get_java_type(pk_attr['type']).split('.')[-1]
    pk_name_camel = pk_attr['name']


    return f"""
Generate a Spring Boot REST Controller for entity '{entity_name}' in package `{base_package}.controller`.
File name: `src/main/java/{base_package.replace('.', '/')}/controller/{entity_name}Controller.java`.
The controller should:
- Be annotated with `@RestController` and `@RequestMapping("/api/v1/{entity_plural_lower}")`.
- Inject `{entity_name}Service` via constructor.
- Define endpoints for CRUD operations:
    - POST `/`: Create, takes `{entity_name}CreateRequestDto`, returns `{entity_name}ResponseDto` with HTTP 201.
    - GET `/`: Get all, returns `List<{entity_name}ResponseDto>`.
    - GET `/{ {pk_name_camel} }`: Get by ID, takes `@PathVariable {pk_java_type_simple} {pk_name_camel}`, returns `{entity_name}ResponseDto`.
    - PUT `/{ {pk_name_camel} }`: Update, takes `@PathVariable {pk_java_type_simple} {pk_name_camel}` and `{entity_name}UpdateRequestDto`, returns `{entity_name}ResponseDto`.
    - DELETE `/{ {pk_name_camel} }`: Delete, takes `@PathVariable {pk_java_type_simple} {pk_name_camel}`, returns HTTP 204.
- Use `@Valid` for request DTOs if they contain validation annotations.
- Return `ResponseEntity` for all methods to control HTTP status codes.

Reference for style (this example may be for a different entity, adapt it for `{entity_name}`):
```java
{example_controller_content}
```
Generate ONLY the Java code for the `{entity_name}Controller.java` file, including package and all necessary imports (Service, DTOs, Spring annotations, List, ResponseEntity, HttpStatus, etc.).
Start directly with the `package {base_package}.controller;` line.
"""

def construct_main_application_prompt(base_package: str, app_name_class: str, example_main_app_content: str) -> str:
    # app_name_class is the Java class name like "BookStoreApplication"
    return f"""
Generate the main Spring Boot application class named `{app_name_class}`.
Package: `{base_package}`.
File name: `src/main/java/{base_package.replace('.', '/')}/{app_name_class}.java`.
The class should be annotated with `@SpringBootApplication`.
Include a `main` method to run the application.
Optionally, include `@EnableJpaAuditing` if JPA auditing features are desired (comment it out if not sure).

Reference for style:
```java
{example_main_app_content}
```
Generate ONLY the Java code for the `{app_name_class}.java` file.
Start directly with the `package {base_package};` line.
"""

def construct_pom_xml_prompt(schema_data: Dict[str, Any], example_pom_content: str, group_id: str, artifact_id: str, app_name_display: str, app_description: str, java_version: str = "17") -> str:
    # Analyze schema for DB specific needs (e.g. if UUID is heavily used for PKs, maybe suggest postgresql driver)
    # For now, stick to H2 default and commented out PostgreSQL.
    
    return f"""
Generate a `pom.xml` file for a Spring Boot (version 3.2.x or later) and Java {java_version} project.
GroupId: `{group_id}`
ArtifactId: `{artifact_id}`
Application Display Name (for <name> tag): `{app_name_display}`
Application Description: `{app_description}`

Include the following dependencies:
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-web`
- `spring-boot-starter-validation`
- `com.h2database:h2` (runtime scope)
- `org.projectlombok:lombok` (optional)
- `org.springframework.boot:spring-boot-starter-test` (test scope)
- `org.springdoc:springdoc-openapi-starter-webmvc-ui` (e.g., version 2.2.0 or later)

Ensure the `<parent>` section points to `spring-boot-starter-parent`.
Set the `<java.version>` property to `{java_version}`.
Include the `spring-boot-maven-plugin`.

Reference for style and exact structure:
```xml
{example_pom_content}
```
Generate ONLY the XML content for the `pom.xml` file.
"""

def construct_application_properties_prompt(schema_data: Dict[str, Any], example_app_props_content: str, app_name_for_spring: str, base_package_for_logging: str) -> str:
    # app_name_for_spring is for spring.application.name
    # base_package_for_logging is for logging.level.com.example...
    return f"""
Generate an `application.properties` file for a Spring Boot application.
Set `spring.application.name={app_name_for_spring}`.
Configure it for an H2 in-memory database by default (`spring.datasource.url=jdbc:h2:mem:{app_name_for_spring.lower()}db;DB_CLOSE_DELAY=-1`, username `sa`, password `password`).
Include commented-out examples for PostgreSQL.
Set `spring.jpa.hibernate.ddl-auto=update`.
Set `spring.jpa.show-sql=true` and `spring.jpa.properties.hibernate.format_sql=true`.
Configure basic logging levels, including `logging.level.{base_package_for_logging}=DEBUG`.
Configure SpringDoc OpenAPI paths (e.g., `/api-docs`, `/swagger-ui.html`).

Reference for style and common properties:
```properties
{example_app_props_content}
```
Generate ONLY the content for the `application.properties` file. This file should be placed at `src/main/resources/application.properties`.
"""

def construct_readme_md_prompt(app_name_display: str, artifact_id: str, example_readme_content: str) -> str:
    return f"""
Generate a `README.md` file for a Spring Boot application named "{app_name_display}" with artifact ID "{artifact_id}".
The README should include:
- Project Title
- Brief description
- Prerequisites (Java 17+, Maven)
- Typical Project Structure (briefly mention key directories like model, repository, service, controller)
- Configuration instructions (mentioning `application.properties` for database, server port)
- Building and Running instructions (using `mvn clean install`, `mvn spring-boot:run`, and `java -jar target/...jar`).
- Information about accessing API docs (Swagger UI).

Reference for style and content:
```markdown
{example_readme_content}
```
Generate ONLY the Markdown content for the `README.md` file.
"""

# --- Main Orchestration Function ---
async def generate_springboot_project(schema_data: Dict[str, Any], output_base_dir: Path) -> Path:
    first_entity_name_cap = "App"
    if schema_data.get('entities') and schema_data['entities'][0].get('name'):
        raw_name = schema_data['entities'][0]['name']
        # Ensure PascalCase and valid Java identifier
        first_entity_name_cap = "".join(word.capitalize() for word in raw_name.replace("_", " ").replace("-", " ").split())
        if not first_entity_name_cap or not first_entity_name_cap[0].isalpha():
            first_entity_name_cap = "App" # Fallback if name is weird

    group_id = "com.example.generated" 
    artifact_id = f"{first_entity_name_cap.lower()}-service" # e.g., user-service, book-service
    app_name_display = f"{first_entity_name_cap} Application" # For pom.xml <name> and README title
    app_name_for_spring = f"{first_entity_name_cap}Service" # For spring.application.name
    # Main application class name, e.g., UserApplication, BookStoreApplication
    main_app_class_name = f"{first_entity_name_cap.replace('Service','')}Application" 
    
    base_package = f"{group_id}.{artifact_id.replace('-', '')}"

    project_name_on_disk = artifact_id 
    project_output_dir = output_base_dir / project_name_on_disk
    project_output_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Starting Spring Boot project generation: '{project_name_on_disk}' in '{project_output_dir}'")
    logger.info(f"Base package: {base_package}, App Name (Spring): {app_name_for_spring}, Main Class: {main_app_class_name}")

    example_files = load_springboot_example_files()
    if not all(k in example_files for k in [
        'ExampleEntity.java', 'ExampleEntityDto.java', 'ExampleRepository.java', 
        'ExampleService.java', 'ExampleController.java', 'ExampleApplication.java',
        'example_pom.xml', 'example_application.properties', 'example_readme.md'
    ]):
        logger.error("One or more critical Spring Boot example template files are missing. Aborting generation.")
        raise FileNotFoundError("Missing critical Spring Boot example template files.")

    generated_files_content: Dict[str, str] = {} 

    async def generate_and_store_single_file(target_path: str, prompt: str, file_desc: str):
        logger.info(f"Generating {file_desc} ({target_path})...")
        content = await call_gemini_api(prompt, temperature=0.25, max_output_tokens=4096) # Slightly higher temp for Java
        if content.startswith("Error:"):
            logger.error(f"LLM error generating {file_desc}: {content}")
            generated_files_content[target_path] = f"// LLM Generation Error for {file_desc}: {content}"
            # For critical files, we might want to raise an exception immediately
            if file_desc in ["pom.xml", f"{main_app_class_name}.java"]: # Critical files
                 raise Exception(f"Failed to generate critical file {file_desc}: {content}")
            return False # Indicate failure
        generated_files_content[target_path] = content
        return True

    # Generate pom.xml
    pom_prompt = construct_pom_xml_prompt(schema_data, example_files['example_pom.xml'], group_id, artifact_id, app_name_display, "Generated Spring Boot Application")
    await generate_and_store_single_file("pom.xml", pom_prompt, "pom.xml")

    # Generate application.properties
    app_props_prompt = construct_application_properties_prompt(schema_data, example_files['example_application.properties'], app_name_for_spring, base_package)
    await generate_and_store_single_file(f"src/main/resources/application.properties", app_props_prompt, "application.properties")

    # Generate Main Application class
    main_app_prompt = construct_main_application_prompt(base_package, main_app_class_name, example_files['ExampleApplication.java'])
    await generate_and_store_single_file(f"src/main/java/{base_package.replace('.', '/')}/{main_app_class_name}.java", main_app_prompt, f"{main_app_class_name}.java")

    all_entities_map = {e['name']: e for e in schema_data.get('entities', [])}
    java_src_root = f"src/main/java/{base_package.replace('.', '/')}"

    for entity_schema in schema_data.get('entities', []):
        entity_name_pascal = entity_schema['name']

        # Entity
        entity_prompt = construct_entity_prompt(entity_schema, all_entities_map, example_files['ExampleEntity.java'], base_package)
        await generate_and_store_single_file(f"{java_src_root}/model/{entity_name_pascal}.java", entity_prompt, f"{entity_name_pascal} Entity")

        # DTOs (expecting multi-file output)
        dto_prompt = construct_dto_prompt(entity_schema, example_files['ExampleEntityDto.java'], base_package)
        logger.info(f"Generating DTOs for {entity_name_pascal} (expecting multi-file output from LLM)...")
        dto_multi_file_response = await call_gemini_api(dto_prompt, temperature=0.25, max_output_tokens=8000) # More tokens for multiple DTOs
        if dto_multi_file_response.startswith("Error:"):
            logger.error(f"LLM error generating DTOs for {entity_name_pascal}: {dto_multi_file_response}")
            generated_files_content[f"{java_src_root}/dto/{entity_name_pascal}_DTO_GENERATION_ERROR.txt"] = dto_multi_file_response
        else:
            parsed_dto_files = parse_llm_output_to_files(dto_multi_file_response)
            if not parsed_dto_files or all(k.startswith("llm_") for k in parsed_dto_files): # Check if only error/raw files parsed
                logger.warning(f"No valid DTO files parsed for {entity_name_pascal}. Raw DTO response: {dto_multi_file_response[:300]}")
                generated_files_content[f"{java_src_root}/dto/{entity_name_pascal}_DTO_PARSE_FAILURE_RAW.txt"] = dto_multi_file_response
            for path, content in parsed_dto_files.items():
                 # Ensure path is relative to src/main/java for DTOs if LLM provides full path
                if path.startswith("src/main/java/"):
                    generated_files_content[path] = content
                else: # Assume it's a relative path within the DTO directory structure expected
                    # This logic might need refinement based on how LLM structures paths for DTOs
                    # For now, assume it gives paths like "dto/EntityNameResponseDto.java"
                    # If it gives just "EntityNameResponseDto.java", this needs adjustment.
                    # Let's assume the prompt guides it to give paths like "dto/..."
                    if not Path(path).parent.name == "dto": # Basic check
                        logger.warning(f"DTO file path '{path}' from LLM does not seem to be in a 'dto' subdirectory. Adjusting.")
                        generated_files_content[f"{java_src_root}/dto/{Path(path).name}"] = content
                    else:
                        generated_files_content[f"{java_src_root}/{path}"] = content


        # Repository
        repo_prompt = construct_repository_prompt(entity_schema, example_files['ExampleRepository.java'], base_package)
        await generate_and_store_single_file(f"{java_src_root}/repository/{entity_name_pascal}Repository.java", repo_prompt, f"{entity_name_pascal} Repository")

        # Service
        service_prompt = construct_service_prompt(entity_schema, example_files['ExampleService.java'], base_package)
        await generate_and_store_single_file(f"{java_src_root}/service/{entity_name_pascal}Service.java", service_prompt, f"{entity_name_pascal} Service")
        
        # Controller
        controller_prompt = construct_controller_prompt(entity_schema, example_files['ExampleController.java'], base_package)
        await generate_and_store_single_file(f"{java_src_root}/controller/{entity_name_pascal}Controller.java", controller_prompt, f"{entity_name_pascal} Controller")

    # Generate README.md
    readme_prompt = construct_readme_md_prompt(app_name_display, artifact_id, example_files['example_readme.md'])
    await generate_and_store_single_file('README.md', readme_prompt, "README.md")
    
    file_count = 0
    for rel_filepath_str, content in generated_files_content.items():
        if content.startswith("// LLM Generation Error:") or content.startswith("Error:"):
            logger.warning(f"Content for {rel_filepath_str} indicates a generation error. Writing error message to file.")
        
        if ".." in rel_filepath_str or Path(rel_filepath_str).is_absolute():
            logger.warning(f"Skipping potentially unsafe or absolute filepath from accumulated content: {rel_filepath_str}")
            continue
        
        abs_filepath = (project_output_dir / rel_filepath_str).resolve()
        if not str(abs_filepath).startswith(str(project_output_dir.resolve())):
            logger.warning(f"Security: Skipping filepath trying to escape project dir: '{rel_filepath_str}'")
            continue

        try:
            abs_filepath.parent.mkdir(parents=True, exist_ok=True)
            with open(abs_filepath, "w", encoding="utf-8") as f:
                f.write(content)
            logger.info(f"Written file: {abs_filepath}")
            if not content.startswith("// LLM Generation Error:"):
                file_count += 1 # Only count successfully generated files
        except Exception as e:
            logger.error(f"Error writing generated file {abs_filepath}: {e}", exc_info=True)

    if file_count == 0:
        logger.error(f"No valid files were successfully generated and written for Spring Boot project {project_name_on_disk}.")
        raise Exception(f"Spring Boot project generation resulted in zero valid application files for {project_name_on_disk}. Check logs and error files in the output directory.")

    logger.info(f"Spring Boot project '{project_name_on_disk}' ({file_count} valid files) generated at {project_output_dir}")
    return project_output_dir


async def main_test_springboot_generator():
    logging.basicConfig(level=logging.DEBUG, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    test_schema = {
      "entities": [
        {"id": "entity-1","name": "Author","attributes": [{"name": "id","type": "Integer","pk": True,"nn": True},{"name": "name","type": "String","nn": True}],"x": 50,"y": 50},
        {"id": "entity-2","name": "Book","attributes": [{"name": "id","type": "Integer","pk": True,"nn": True},{"name": "title","type": "String","nn": True},{"name": "author_id","type": "Integer","nn": True,"fk": True,"references_entity": "Author","references_field": "id"}],"x": 50,"y": 250}
      ], "entityCounter": 2, "relationships": [{"from_entity": "Author","to_entity": "Book","type": "1:N","foreign_key_in_to_entity": "author_id"}]
    }
    
    temp_output_base_dir = Path(tempfile.gettempdir()) / "er2backend_springboot_generated_projects_v2"
    if temp_output_base_dir.exists():
        # For testing, it's often good to clear the specific project dir if it exists, or the whole base
        # For now, let it accumulate or manage manually.
        pass
    temp_output_base_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Spring Boot Test: Generation output to subdirs in: {temp_output_base_dir}")

    try:
        generated_project_path = await generate_springboot_project(test_schema, temp_output_base_dir)
        logger.info(f"Spring Boot Test: Project generated at: {generated_project_path}")
    except Exception as e:
        logger.error(f"Error during Spring Boot standalone test: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main_test_springboot_generator())
