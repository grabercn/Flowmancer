# File: er2backend/generators/__init__.py

"""
The `generators` package is responsible for taking a processed schema 
and generating the source code for a specific backend stack.
"""

# No need to import and re-export specific generator functions here
# if other modules (like api/routes.py) import them directly from
# their respective files (e.g., from generators.fastapi_generator import ...).
# This helps avoid potential circular import issues.

import logging
logger = logging.getLogger(__name__)
# logger.info("Generators package is being accessed/initialized.") # Keep this minimal for less noise

# You could still define __all__ if you intend for 'from generators import *'
# to work in a specific way, but direct imports are preferred.
# __all__ = [] # Or list specific submodules if that's your pattern
