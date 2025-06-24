# er2backend/generators/generator_utils.py

import json
import logging
import os
import re
import uuid
from typing import Dict, Any, Awaitable, Callable, List, Optional, Tuple
import asyncio

try:
    import aiohttp # type: ignore
except ImportError:
    aiohttp = None

logger = logging.getLogger(__name__)

GEMINI_API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/"

# --- Low-Level API and Parsing Functions ---

async def call_gemini_api(prompt: str, temperature: float = 0.2, max_output_tokens: int = 8192) -> str:
    """
    Makes a direct, asynchronous call to the Gemini API.
    Reads API Key and Model Name from environment variables.
    """
    if aiohttp is None:
        return "Error: Critical dependency 'aiohttp' not found. Please run 'pip install aiohttp'."

    api_key = os.environ.get("GEMINI_API_KEY")
    model_name = os.environ.get("GEMINI_API_MODEL", "gemini-1.5-flash-latest")

    if not api_key:
        logger.error("FATAL: GEMINI_API_KEY environment variable not set.")
        return "Error: Gemini API key not configured in the environment."

    api_url = f"{GEMINI_API_URL_BASE}{model_name}:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "topK": 1,
            "topP": 0.95,
            "maxOutputTokens": max_output_tokens,
        }
    }

    logger.info(f"Calling Gemini API ({model_name})... Prompt length: {len(prompt)} chars.")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(api_url, json=payload, headers={'Content-Type': 'application/json'}, timeout=300) as response:
                response_text = await response.text()
                if response.status == 200:
                    result = json.loads(response_text)
                    if (candidates := result.get("candidates")) and isinstance(candidates, list) and candidates:
                        if (content := candidates[0].get("content", {}).get("parts")) and isinstance(content, list) and content:
                            return content[0].get("text", "")
                    logger.error(f"Unexpected Gemini API response structure: {result}")
                    return "Error: Unexpected API response structure."
                else:
                    logger.error(f"Gemini API call failed with status {response.status}: {response_text[:1000]}...")
                    return f"Error: API call failed with status {response.status}. Details: {response_text}"
    except Exception as e:
        logger.error(f"An unexpected error occurred during Gemini API call: {e}", exc_info=True)
        return f"Error: An unexpected error occurred during API call. Details: {e}"

def _strip_code_fences(text: str) -> str:
    """A helper function to remove markdown code fences from LLM responses."""
    if not text:
        return ""
    fence_pattern = re.compile(r"^\s*```(?:\w+\s*)?\n(.*?)\n\s*```\s*$", re.DOTALL)
    match = fence_pattern.match(text)
    if match:
        return match.group(1).strip()
    return text.strip()

def parse_llm_output_to_files(llm_response: str) -> Dict[str, str]:
    """Parses the LLM's multi-file output into a dictionary of {filepath: content}."""
    generated_files: Dict[str, str] = {}
    file_marker_regex = re.compile(r"^=== FILE:\s*`?(.*?)`?\s*===$", re.MULTILINE)
    
    parts = file_marker_regex.split(llm_response)
    
    if len(parts) < 2:
        if llm_response and not llm_response.startswith("Error:"):
            logger.warning("No '=== FILE: ... ===' markers found. Treating entire response as a single file.")
            generated_files["output.txt"] = _strip_code_fences(llm_response)
        elif llm_response:
             generated_files["error.log"] = llm_response
        return generated_files

    i = 1
    while i < len(parts):
        filepath = parts[i].strip()
        content = _strip_code_fences(parts[i+1])
        if filepath and content:
            # Standardize path separators for consistency
            normalized_path = filepath.replace("\\", "/")
            generated_files[normalized_path] = content
        i += 2
        
    return generated_files

# --- High-Level Generation Orchestration ---

class GenerationContext:
    """A structured class to hold all context needed for generation."""
    def __init__(self, schema_data: Dict[str, Any], project_name: str, example_files: Dict[str, str], base_package: Optional[str] = None):
        self.schema_data = schema_data
        self.project_name = project_name
        self.example_files = example_files
        self.base_package = base_package # For Java/C# namespaces
        self.generated_files: Dict[str, str] = {}

    def add_file(self, filepath: str, content: str):
        """Adds a single newly generated file's content to the context."""
        normalized_path = filepath.replace("\\", "/")
        self.generated_files[normalized_path] = content

    def add_files_from_llm_response(self, llm_response: str):
        """Parses a multi-file LLM response and adds the files to the context."""
        parsed_files = parse_llm_output_to_files(llm_response)
        for path, content in parsed_files.items():
            self.add_file(path, content)

    def get_file_content(self, filepath: str) -> Optional[str]:
        """Gets the content of a specific generated file."""
        return self.generated_files.get(filepath)

    def get_context_for_prompt(self, filepaths: List[str]) -> str:
        """Gets the content of specified generated files to be used as context for the next prompt."""
        context_parts = []
        for path in filepaths:
            if path in self.generated_files:
                context_parts.append(f"// --- Reference: Full content of `{path}` ---\n{self.generated_files[path]}\n")
        if not context_parts:
            logger.warning(f"Requested context for {filepaths}, but none were found in the generated files yet.")
        return "\n".join(context_parts)

class GenerationPipeline:
    """Orchestrates the step-by-step generation of a project."""
    def __init__(self, context: GenerationContext):
        self.context = context

    async def run_step(
        self,
        step_name: str,
        prompt_template: Callable[..., str],
        prompt_args: Dict[str, Any],
        target_path: str,
        is_multi_file: bool = False
    ):
        """
        Runs a single generation step, generates content, and stores it in the context.
        """
        logger.info(f"Running generation step: {step_name}...")
        prompt = prompt_template(**prompt_args)
        
        llm_response = await call_gemini_api(prompt)
        if llm_response.startswith("Error:"):
            raise Exception(f"LLM failed to generate {step_name}: {llm_response}")

        if is_multi_file:
            parsed_files = parse_llm_output_to_files(llm_response)
            if not parsed_files or all(k in ["output.txt", "error.log"] for k in parsed_files):
                raise Exception(f"LLM did not return structured files for multi-file step '{step_name}'. Raw response: {llm_response[:500]}")
            self.context.add_files_from_llm_response(llm_response)
        else:
            stripped_content = _strip_code_fences(llm_response)
            self.context.add_file(target_path, stripped_content)
    
    async def run_summary_step(self) -> Dict[str, Any]:
        """Generates a final JSON summary of the created project."""
        logger.info("Generating project summary...")
        
        all_files_context = "\n\n".join(
            f"// --- Reference: {filepath} ---\n{self.context.generated_files.get(filepath, '')}\n" 
            for filepath in sorted(self.context.generated_files.keys())
        )

        summary_prompt = f"""
Analyze the following generated project files and produce a JSON summary.
The JSON object must contain two keys: "endpoints" and "types".
- `endpoints`: An array of objects, each with `method` (e.g., "GET"), `path` (e.g., "/api/Users/{{id}}"), and `description`.
- `types`: An array of objects, each with `typeName` (e.g., "User", "UserDto") and `description`.

--- Generated Files Context ---
{all_files_context}
--- End of Files ---

Generate ONLY the JSON summary object. Do not add any conversational text or markdown.
"""
        
        summary_json_str = await call_gemini_api(summary_prompt, temperature=0.0)
        if summary_json_str.startswith("Error:"):
            logger.error(f"Failed to generate project summary: {summary_json_str}")
            return {"error": "Failed to generate summary from LLM.", "details": summary_json_str}
        
        try:
            return json.loads(_strip_code_fences(summary_json_str))
        except json.JSONDecodeError:
            logger.error(f"Failed to parse summary JSON from LLM. Raw response: {summary_json_str}")
            return {"error": "LLM returned invalid JSON for summary.", "raw_response": summary_json_str}
