import shutil
import uuid
import logging
import json # Ensure json is imported here if used for logging/debugging
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, Body, UploadFile, File, Form, Request # APIRouter is key here, Request for app.state
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from pydantic import BaseModel, Field

# Import the generator function
try:
    from generators.fastapi_generator import generate_fastapi_project # Assuming __init__.py in generators exposes this
except ImportError as e:
    logging.critical(f"Could not import FastAPI generator from 'generators' package: {e}")
    async def generate_fastapi_project(schema_data: Dict[str, Any], output_base_dir: Path) -> Path:
        logging.error("FastAPI generator (placeholder) is not available due to import error in api/routes.py.")
        raise RuntimeError("FastAPI project generator module could not be imported.")
    
# Import the generator function
try:
    from generators.springboot_generator import generate_springboot_project # Assuming __init__.py in generators exposes this
except ImportError as e:
    logging.critical(f"Could not import SpringBoot generator from 'generators' package: {e}")
    async def generate_fastapi_project(schema_data: Dict[str, Any], output_base_dir: Path) -> Path:
        logging.error("SpringBoot generator (placeholder) is not available due to import error in api/routes.py.")
        raise RuntimeError("FastAPI project generator module could not be imported.")


logger = logging.getLogger(__name__)
router = APIRouter() # Create an APIRouter instance

# --- Pydantic Models for Request Body Validation ---
class AttributeSchema(BaseModel):
    name: str
    type: str
    pk: bool = False
    nn: bool = Field(default=False)
    un: bool = Field(default=False)
    fk: bool = False
    references_entity: Optional[str] = None
    references_field: Optional[str] = None

    class Config:
        populate_by_name = True

class EntitySchema(BaseModel):
    name: str
    attributes: List[AttributeSchema]

class RelationshipSchema(BaseModel):
    from_entity: str
    to_entity: str
    type: str
    foreign_key_in_to_entity: Optional[str] = None

class FullSchema(BaseModel):
    entities: List[EntitySchema]
    relationships: List[RelationshipSchema]

class GenerateRequest(BaseModel):
    schema_data: FullSchema
    target_stack: str

# --- API Endpoint Definitions ---

# The root path "/" is now handled directly in engine.py for serving index.html.
# If you needed an API specific root, you could add it here, e.g., @router.get("/info")

@router.post("/generate", summary="Generate backend code from a visually designed JSON schema")
async def generate_from_json_schema_route(
    request: Request, # To access app.state for configurations
    payload: GenerateRequest
):
    # Access configurations from app.state (set in engine.py)
    temp_base_dir = request.app.state.TEMP_BASE_DIR
    downloads_root_dir = request.app.state.DOWNLOADS_ROOT_DIR

    schema_data_dict = payload.schema_data.model_dump()
    target_stack = payload.target_stack.lower()

    logger.info(f"API Route: Received /generate request for target_stack='{target_stack}'")
    logger.debug(f"API Route: Schema received: {json.dumps(schema_data_dict, indent=2)}")

    run_id = str(uuid.uuid4())
    # run_processing_base_dir is where the generator will create its project subfolder
    run_processing_base_dir = temp_base_dir / f"run_{run_id}"
    run_processing_base_dir.mkdir(parents=True, exist_ok=True)

    generated_project_path: Optional[Path] = None # Path to the actual generated project files by the generator
    generated_zip_name = f"generated_project_{target_stack}_{run_id[:8]}.zip"
    # zip_output_path_no_ext is the path for the final zip file (without .zip) in the downloads directory
    zip_output_path_no_ext = downloads_root_dir / f"generated_project_{target_stack}_{run_id[:8]}"

    try:
        if target_stack == "fastapi":
            logger.info(f"API Route: Calling FastAPI generator for run {run_id}...")
            # generate_fastapi_project will create its own named project folder inside run_processing_base_dir
            generated_project_path = await generate_fastapi_project(
                schema_data_dict,
                output_base_dir=run_processing_base_dir # The generator will create a subfolder here
            )
            logger.info(f"API Route: FastAPI generator completed. Project source at: {generated_project_path}")
        elif target_stack == "springboot":
            logger.info(f"API Route: Calling Spring Boot generator for run {run_id}...")
            generated_project_path = await generate_springboot_project(
                schema_data_dict,
                output_base_dir=run_processing_base_dir # The generator will create a subfolder here
            )
        else:
            logger.error(f"API Route: Unsupported target_stack: {target_stack}")
            raise HTTPException(status_code=400, detail=f"Target stack '{target_stack}' is not supported.")

        if not generated_project_path or not generated_project_path.is_dir():
            logger.error(f"API Route: Generator for '{target_stack}' did not return a valid project directory path.")
            # This might happen if the generator itself failed internally and didn't create the dir.
            raise Exception("Code generation failed: The generator did not produce a project directory.")

        # Now, ZIP the contents of the specific 'generated_project_path' directory
        logger.info(f"API Route: Zipping project from: {generated_project_path} into {zip_output_path_no_ext}.zip")
        shutil.make_archive(
            base_name=str(zip_output_path_no_ext), # Path for the output zip file, without .zip
            format="zip",                          # ZIP format
            root_dir=str(generated_project_path.parent), # The parent of the dir to zip (e.g., run_processing_base_dir)
            base_dir=generated_project_path.name   # The name of the dir to zip (e.g., fastapi_project_xxxx)
        )
        logger.info(f"API Route: Project successfully zipped: {generated_zip_name}")

    except FileNotFoundError as fnf_error:
        logger.error(f"API Route: File not found during generation for run {run_id}: {fnf_error}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation process error (file missing): {str(fnf_error)}")
    except RuntimeError as rt_error: # Catch errors from generator module itself
        logger.error(f"API Route: Runtime error during generation for run {run_id}: {rt_error}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation process error: {str(rt_error)}")
    except Exception as e: # Catch other errors (LLM API, zipping, etc.)
        logger.error(f"API Route: Error during code generation or zipping for run {run_id}: {e}", exc_info=True)
        error_detail = str(e)
        if "LLM" in error_detail or "API" in error_detail or "Gemini" in error_detail:
             raise HTTPException(status_code=502, detail=f"LLM or API Error: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Failed to generate project: {error_detail}")
    finally:
        # Clean up the entire base directory for this specific run,
        # which includes the subdirectory created by the generator (e.g., run_processing_base_dir).
        if run_processing_base_dir.exists():
            try:
                shutil.rmtree(run_processing_base_dir)
                logger.info(f"API Route: Cleaned up temporary processing base directory: {run_processing_base_dir}")
            except OSError as e_cleanup:
                logger.error(f"API Route: Error cleaning temp dir {run_processing_base_dir}: {e_cleanup}", exc_info=True)

    download_url = f"/downloads/{generated_zip_name}" # Path relative to server root
    logger.info(f"API Route: Returning download URL: {download_url}")
    return JSONResponse(content={"download_url": download_url, "message": f"{target_stack.capitalize()} project generated."})


@router.get("/health", summary="Health check")
async def health_check_route():
    logger.info("API Route: Health check requested.")
    return {"status": "ok", "message": "API is healthy (Visual Designer to Code Generator Mode)"}
# Note: The above routes are registered in engine.py using app.include_router(api_routes.router)
# --- End of API Route Definitions ---