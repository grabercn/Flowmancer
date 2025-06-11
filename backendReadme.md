# ER²Backend - Visual Schema to Backend Generator

ER²Backend is a web application that allows users to visually design a database schema and then generate boilerplate backend code for various technology stacks. This version focuses on generating FastAPI (Python) applications.

## Current Features (MVP)

* **Visual Schema Designer**: A front-end interface to:
    * Create and position entities.
    * Add, edit, and delete attributes for entities (specifying name, type, Primary Key, Foreign Key, Not Null, Unique).
    * Define Foreign Key relationships by selecting referenced entities and fields.
    * Basic visual representation of FK relationships.
    * Save the current design to a local JSON file.
    * Load a previously saved design from a JSON file.
* **Backend Code Generation (FastAPI Stack)**:
    * Accepts the JSON schema from the visual designer.
    * Uses a Large Language Model (Gemini via API) to generate a FastAPI project.
    * The generated project includes:
        * SQLAlchemy models (`models.py`).
        * Pydantic V2 schemas (`schemas.py`).
        * CRUD operations (`crud.py`).
        * API routers for each entity (`routers/entity_router.py`).
        * Database setup (`database.py` - defaults to SQLite).
        * Main application file (`main.py`).
        * `requirements.txt`.
        * A basic `README.md` for the generated project.
    * Provides the generated project as a downloadable ZIP file.

## Project Structure


er2backend/
├── engine.py               # Main FastAPI backend orchestrator
├── frontend/
│   ├── index.html          # Visual schema designer UI
│   ├── css/
│   │   └── style.css       # Styles for the UI
│   └── js/
│       └── app.js          # JavaScript logic for the UI
├── generators/
│   ├── init.py
│   ├── generator_utils.py  # Utilities for LLM API calls and parsing
│   └── fastapi_generator.py # Logic for generating FastAPI projects
├── templates/
│   └── fastapi/            # Example files used as context for the LLM
│       ├── example_main.py
│       ├── example_models.py
│       ├── example_schemas.py
│       ├── example_crud.py
│       ├── example_router.py
│       ├── example_database.py
│       ├── example_requirements.txt
│       └── example_readme.md
├── downloads/              # (Auto-created) Stores generated ZIP files temporarily
└── temp_er2backend_runs/   # (Auto-created in system temp) For intermediate processing files


## Setup and Installation

1.  **Clone the Repository (if applicable)**:
    ```bash
    # git clone <repository-url>
    # cd er2backend
    ```

2.  **Create a Python Virtual Environment**:
    ```bash
    python -m venv venv
    ```
    Activate the environment:
    * Windows: `venv\Scripts\activate`
    * macOS/Linux: `source venv/bin/activate`

3.  **Install Dependencies**:
    Make sure you have a `requirements.txt` file at the root of the `er2backend` project with the following content (or add to your existing one):
    ```txt
    fastapi>=0.100.0
    uvicorn[standard]>=0.20.0
    pydantic[email]>=2.0.0
    aiohttp>=3.8.0
    PyYAML>=6.0
    # Add other direct dependencies of your engine or generators if any
    ```
    Then install:
    ```bash
    pip install -r requirements.txt
    ```
    *(Note: `sqlalchemy` and other dependencies for the *generated* projects will be listed in the `requirements.txt` *within* the generated ZIP, not necessarily in the main `er2backend` project's requirements, unless you add features to test/validate generated code directly within `er2backend`.)*

4.  **API Keys (for LLM)**:
    * This application uses the Gemini API. The API key is expected to be provided by the runtime environment (e.g., Google Cloud, or Canvas if running within it). The `GEMINI_API_KEY` variable in `generator_utils.py` is set to `""`.

5.  **Review Generator Templates**:
    * The files in `templates/fastapi/` are crucial for guiding the LLM. Review and adjust them if you want to change the style or structure of the generated FastAPI projects.

## Running the Application

1.  **Start the Backend Server**:
    From the `er2backend` project root directory:
    ```bash
    uvicorn engine:app --reload
    ```
    The server will typically start on `http://localhost:8000`.

2.  **Access the UI**:
    Open your web browser and navigate to `http://localhost:8000/`.

## How to Use

1.  **Design Schema**: Use the visual interface to add entities, define their attributes (name, type, PK, FK, NN, UN), and establish relationships by setting up Foreign Keys.
2.  **Save/Load (Optional)**: You can save your current design to a local JSON file using the "Save Design" button and load it back later using "Load Design".
3.  **Select Target Stack**: Currently, only "FastAPI (Python)" is fully implemented.
4.  **Generate Backend**: Click the "Generate Backend" button.
5.  **Download**: The backend will process the schema, use the LLM to generate code, and provide a downloadable ZIP file containing the generated project.

## Next Steps & Future Development

* **Thorough Testing of FastAPI Generator**: Extensive testing with various complex schemas to ensure the LLM produces robust and correct code.
* **Iterative Prompt Engineering**: Continuously refine the prompts sent to the LLM in `fastapi_generator.py` to improve output quality.
* **Sanity Checks for Generated Code**: Implement automated checks (e.g., syntax validation, basic import tests) for the generated projects.
* **Support for Other Stacks**: Implement generator modules for other backend stacks (e.g., Spring Boot, .NET, Express) by creating new subdirectories in `templates/` and new `*_generator.py` files in `generators/`.
* **UI Enhancements**:
    * More advanced relationship drawing (e.g., crow's foot notation, line routing).
    * Direct manipulation for creating relationships (e.g., dragging from one entity to another).
    * Zoom/pan functionality for the canvas.
* **Dockerization**: Package the application in a Docker container for easier deployment.
* **More Sophisticated LLM Interaction**:
    * Consider breaking down LLM tasks further (e.g., generate models, then schemas, then CRUD separately).
    * Implement a "fix-it" loop where errors in generated code are fed back to the LLM for correction.

## Troubleshooting

* **LLM Errors**: If code generation fails with an "LLM" or "API" error, check the backend logs for details. This could be due to API key issues, quota limits, network problems, or the LLM struggling with a particularly complex prompt/schema. The generated ZIP might contain an error log file.
* **Incorrect Generated Code**: The quality of the generated code depends heavily on the prompts and the LLM's capabilities. If the code is incorrect:
    1.  Review the JSON schema sent to the backend (logged by `engine.py`).
    2.  Review and refine the prompts in `generators/fastapi_generator.py`.
    3.  Simplify the schema to see if the LLM handles simpler cases correctly.
* **Python Dependencies for Generated Project**: After unzipping a generated project, remember to create a virtual environment for *it* and install *its* `requirements.txt`.

