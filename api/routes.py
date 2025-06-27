import shutil
import uuid
import logging
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from fastapi import APIRouter, HTTPException, Request # type: ignore
from fastapi.responses import JSONResponse # type: ignore
from pydantic import BaseModel, Field # type: ignore
from starlette.concurrency import run_in_threadpool # type: ignore

# Import all available generator functions from the generators package
try:
    from generators.fastapi_generator import generate_fastapi_project
    from generators.springboot_generator import generate_springboot_project
    from generators.dotnet_generator import generate_dotnet_project
    from parser.crypto_utils import decrypt_api_key # type: ignore
except ImportError as e:
    logging.critical(f"Could not import one or more project generators: {e}")
    # Define placeholders so the app can still start and report errors gracefully.
    # The return signature is now a Tuple of (Path, Dictionary)
    async def generate_fastapi_project(schema_data: Dict[str, Any], output_base_dir: Path) -> Tuple[Path, Dict[str, Any]]: # type: ignore
        raise RuntimeError(f"FastAPI generator module is unavailable: {e}")
    async def generate_springboot_project(schema_data: Dict[str, Any], output_base_dir: Path) -> Tuple[Path, Dict[str, Any]]: # type: ignore
        raise RuntimeError(f"SpringBoot generator module is unavailable: {e}")
    async def generate_dotnet_project(schema_data: Dict[str, Any], output_base_dir: Path) -> Tuple[Path, Dict[str, Any]]: # type: ignore
        raise RuntimeError(f".NET generator module is unavailable: {e}")
    def decrypt_api_key(encrypted_b64: str) -> str:
        raise RuntimeError("decrypt_api_key is not available because the import failed.")

call_gemini_api: Any = None # Declare call_gemini_api as Any to resolve potential unbound error

try: 
    from generators.generator_utils import call_gemini_api
except ImportError as e:
        logging.critical(f"Could not import generator utilities: {e}")

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Pydantic Models ---
class AttributeSchema(BaseModel):
    name: str; type: str; pk: bool; nn: bool; un: bool; fk: bool; references_entity: Optional[str] = None; references_field: Optional[str] = None
class EntitySchema(BaseModel):
    name: str; description: Optional[str] = None; attributes: List[AttributeSchema]
class RelationshipSchema(BaseModel):
    from_entity: str; to_entity: str; type: str; foreign_key_in_to_entity: Optional[str] = None
class FullSchema(BaseModel):
    entities: List[EntitySchema]; relationships: List[RelationshipSchema]
class GenerateRequest(BaseModel):
    gemini_api_key: str; gemini_model: str; schema_data: FullSchema; target_stack: str
    
class GenerateSchema(BaseModel):
    prompt: str; gemini_api_key: str; gemini_model: str

# --- API Endpoint Definitions ---

@router.post("/generate", summary="Generate a full backend project structure")
async def generate_full_project_route(request: Request, payload: GenerateRequest):
    temp_base_dir = request.app.state.TEMP_BASE_DIR
    downloads_root_dir = request.app.state.DOWNLOADS_ROOT_DIR
    schema_data_dict = payload.schema_data.model_dump()
    target_stack = payload.target_stack.lower()
    gemini_api_key = payload.gemini_api_key 
    gemini_model = payload.gemini_model
    
    if not schema_data_dict:
        raise HTTPException(status_code=400, detail="Schema data is empty.")
    if not target_stack:
        raise HTTPException(status_code=400, detail="Target stack is not specified.")
    if not gemini_api_key:
        raise HTTPException(status_code=400, detail="Gemini API key is not provided.")
    if not gemini_model:
        raise HTTPException(status_code=400, detail="Gemini model is not specified.")

    # Decrypt the api key
    gemini_api_key = decrypt_api_key(payload.gemini_api_key) 
    
    # Set environment variables for the generator utility
    import os
    os.environ["GEMINI_API_KEY"] = gemini_api_key
    os.environ["GEMINI_API_MODEL"] = gemini_model

    logger.info(f"API Route: Received /generate request for target_stack='{target_stack} for gemini model '{gemini_model} with key '{gemini_api_key}'")
    
    run_id = str(uuid.uuid4())
    run_processing_base_dir = temp_base_dir / f"run_{run_id}"
    run_processing_base_dir.mkdir(parents=True, exist_ok=True)

    generation_result: Optional[Tuple[Path, Dict[str, Any]]] = None
    
    try:
        if target_stack == "fastapi":
            generation_result = await generate_fastapi_project(schema_data_dict, run_processing_base_dir)
        elif target_stack == "springboot":
            generation_result = await generate_springboot_project(schema_data_dict, run_processing_base_dir)
        elif target_stack == "dotnet":
            generation_result = await generate_dotnet_project(schema_data_dict, run_processing_base_dir)
        else:
            raise HTTPException(status_code=400, detail=f"Target stack '{target_stack}' is not supported.")

        # --- CORRECTED: Unpack the tuple returned by the generator ---
        generated_project_path, generation_summary = generation_result
        
        logger.info(f"API Route: Generator for '{target_stack}' completed. Project source at: {generated_project_path}")
        
        # Save the generation summary to a file within the generated project directory
        summary_file_path = generated_project_path / "generation_summary.json"
        with open(summary_file_path, "w", encoding="utf-8") as f:
            json.dump(generation_summary, f, indent=2)
        logger.info(f"API Route: Generation summary saved to {summary_file_path}")
        
        if not generated_project_path or not generated_project_path.is_dir():
            raise Exception("Code generation failed to produce a project directory.")
        if not any(generated_project_path.iterdir()):
             raise Exception("Code generation resulted in an empty project. The LLM may have failed to produce valid files.")

        generated_zip_name = f"{generated_project_path.name}.zip"
        zip_output_path_no_ext = downloads_root_dir / generated_project_path.name

        await run_in_threadpool(
            shutil.make_archive,
            base_name=str(zip_output_path_no_ext),
            format="zip",
            root_dir=str(generated_project_path.parent),
            base_dir=generated_project_path.name
        )
        logger.info(f"API Route: Project successfully zipped: {generated_zip_name}")

    except Exception as e:
        logger.error(f"API Route: Error during /generate for run {run_id}: {e}", exc_info=True)
        error_detail = str(e)
        if "LLM" in error_detail or "API" in error_detail or "Gemini" in error_detail:
            raise HTTPException(status_code=502, detail=f"LLM or API Error: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Failed to generate project: {error_detail}")
    finally:
        if run_processing_base_dir.exists():
            shutil.rmtree(run_processing_base_dir)

    download_url = f"/downloads/{generated_zip_name}"
    return JSONResponse(content={
        "download_url": download_url,
        "summary": generation_summary, # Include the summary in the response
        "message": f"{target_stack.capitalize()} project generated."
    })

@router.post("/generate-ai-schema", summary="Generate a schema from a text prompt using Gemini")
async def generate_ai_schema_route(request: Request, payload: GenerateSchema):
    prompt_text = payload.prompt
    gemini_api_key = payload.gemini_api_key
    gemini_model = payload.gemini_model
    
    # Check to ensure we have the correct fields
    if not prompt_text:
        raise HTTPException(status_code=400, detail="A 'prompt' field is required.")
    if not gemini_api_key: 
        raise HTTPException(status_code=400, detail="A 'gemini_api_key' field is required.")
    if not gemini_model:
        raise HTTPException(status_code=400, detail="A 'gemini_model' field is required.")
    
    # Decrypt the api key
    gemini_api_key = decrypt_api_key(payload.gemini_api_key) 
    
    import os
    os.environ["GEMINI_API_KEY"] = gemini_api_key
    os.environ["GEMINI_API_MODEL"] = gemini_model

    logger.info(f"API Route: Received /generate-ai-schema request.")
    
    _schema_prompt_template_path = Path(__file__).parent.parent / "templates" / "json" / "example_json_schema.txt"
    with open(_schema_prompt_template_path, "r", encoding="utf-8") as f:
        schema_generation_prompt = f.read().replace("{user_prompt}", prompt_text)
    
    try:
        generated_text = await call_gemini_api(schema_generation_prompt, temperature=0.1)
        if generated_text.startswith("Error:"): raise Exception(generated_text)
        generated_schema = json.loads(generated_text)
        return JSONResponse(content=generated_schema)
    except Exception as e:
        logger.error(f"API Route: Error during /generate-ai-schema: {e}", exc_info=True)
        error_detail = str(e)
        if "LLM" in error_detail or "API" in error_detail:
            raise HTTPException(status_code=502, detail=f"LLM or API Error: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Failed to generate AI schema: {error_detail}")

@router.get("/health", summary="Health check")
async def health_check_route():
    return {"status": "ok", "message": "API is healthy"}
