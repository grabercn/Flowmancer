import json
import logging
import re
import uuid
import os # <-- ADDED THIS IMPORT
from typing import Dict, Any, Awaitable, Callable
import asyncio

# Ensure aiohttp is installed: pip install aiohttp
try:
    import aiohttp # type: ignore
except ImportError:
    aiohttp = None # Will be checked before use

logger = logging.getLogger(__name__)


async def call_gemini_api(
    prompt: str,
    temperature: float = 0.3,
    max_output_tokens: int = 8192
) -> str:
    """
    Makes an asynchronous call to the Gemini API to generate content.
    Reads API Key and Model Name from environment variables.
    """
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "") # Default to empty string if not set
    DEFAULT_MODEL_NAME = os.environ.get("GEMINI_API_MODEL", "gemini-1.5-flash") # Default to a known model if not set
    GEMINI_API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/"
    
    if aiohttp is None:
        return "Error: Critical dependency 'aiohttp' not found. Please run 'pip install aiohttp'."

    # Check for the API key at runtime
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY environment variable not set. Cannot make API call.")
        return "Error: Gemini API key not configured in the environment."

    api_url = f"{GEMINI_API_URL_BASE}{DEFAULT_MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "topK": 1,
            "topP": 0.95,
            "maxOutputTokens": max_output_tokens,
            "stopSequences": []
        }
    }

    logger.info(f"Calling Gemini API ({DEFAULT_MODEL_NAME})... Prompt length: {len(prompt)} chars.")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(api_url, json=payload, headers={'Content-Type': 'application/json'}, timeout=300) as response:
                response_text = await response.text()
                
                if response.status == 200:
                    try:
                        result = json.loads(response_text)
                    except json.JSONDecodeError:
                        logger.error(f"Gemini API response was not valid JSON. Status: {response.status}. Response: {response_text[:500]}...")
                        return f"Error: API response was not valid JSON. Raw response: {response_text}"

                    if (result.get("candidates") and 
                        isinstance(result.get("candidates"), list) and len(result["candidates"]) > 0 and
                        result["candidates"][0].get("content", {}).get("parts") and
                        isinstance(result["candidates"][0]["content"]["parts"], list) and len(result["candidates"][0]["content"]["parts"]) > 0 and
                        "text" in result["candidates"][0]["content"]["parts"][0]):
                        
                        return result["candidates"][0]["content"]["parts"][0]["text"]
                    else:
                        logger.error(f"Unexpected Gemini API response structure: {json.dumps(result, indent=2)}")
                        return f"Error: Unexpected API response structure. Full response: {json.dumps(result)}"
                else:
                    logger.error(f"Gemini API call failed with status {response.status}: {response_text[:1000]}...")
                    return f"Error: API call failed with status {response.status}. Details: {response_text}"
        except Exception as e:
            logger.error(f"An unexpected error occurred during Gemini API call: {e}", exc_info=True)
            return f"Error: An unexpected error occurred during API call. Details: {e}"

def parse_llm_output_to_files(llm_response: str) -> Dict[str, str]:
    """
    Parses the LLM's multi-file output into a dictionary of {filepath: content}.
    """
    # This function's logic remains the same
    generated_files: Dict[str, str] = {}
    current_filepath: str | None = None
    current_content_lines: list[str] = []
    file_marker_regex = re.compile(r"^=== FILE:\s*`?(.*?)`?\s*===$")

    if not llm_response or llm_response.startswith("Error:"):
        generated_files[f"llm_error_or_empty_response_{uuid.uuid4().hex[:4]}.txt"] = llm_response
        return generated_files

    def process_and_store_content():
        nonlocal current_filepath, current_content_lines
        if not current_filepath: return
        content_str = "\n".join(current_content_lines).strip()
        fence_pattern = re.compile(r"^\s*```(?:\w+\s*)?\n(.*?)\n\s*```\s*$", re.DOTALL)
        match = fence_pattern.match(content_str)
        if match:
            content_str = match.group(1).strip()
        generated_files[current_filepath] = content_str
    
    for line in llm_response.splitlines():
        marker_match = file_marker_regex.match(line)
        if marker_match:
            process_and_store_content()
            current_filepath = marker_match.group(1).strip()
            if not current_filepath:
                current_filepath = f"unknown_file_{len(generated_files)}.txt"
            current_content_lines = []
        elif current_filepath is not None:
            current_content_lines.append(line)

    process_and_store_content()
    
    if not generated_files:
        generated_files[f"llm_raw_unparsed_response_{uuid.uuid4().hex[:4]}.txt"] = llm_response
        
    return generated_files
