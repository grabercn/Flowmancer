# Example: templates/fastapi/example_readme.md
# Auto-generated FastAPI Project

This project was generated based on a database schema.

## Setup

1.  Create a virtual environment:
    \`\`\`bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    \`\`\`
2.  Install dependencies:
    \`\`\`bash
    pip install -r requirements.txt
    \`\`\`
3.  (If using PostgreSQL or other DBs, ensure the database server is running and configure `SQLALCHEMY_DATABASE_URL` in `database.py` if needed.)

## Running the Application

\`\`\`bash
uvicorn main:app --reload
\`\`\`

The application will be available at `http://localhost:8000`.
API documentation (Swagger UI) will be at `http://localhost:8000/docs`.