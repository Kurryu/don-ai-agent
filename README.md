'''
# DON AI Agent

This is an open-source version of the DON AI Agent, a multi-modal AI application that integrates chat, file processing, and image generation.

## Getting Started

1.  **Install Dependencies**:

    ```bash
    pnpm install
    ```

2.  **Configure Environment Variables**:

    Create a `.env` file in the root of the project and add the following variables:

    ```
    # A strong, random secret for signing JWTs
    JWT_SECRET="your-super-secret-jwt-secret"

    # Your database connection string (e.g., for PostgreSQL)
    DATABASE_URL="postgresql://user:password@host:port/database"

    # Your OpenAI API Key
    OPENAI_API_KEY="sk-..."

    # (Optional) If you use a proxy or a different base URL for the OpenAI API
    # OPENAI_API_BASE="https://api.example.com/v1"
    ```

3.  **Run Database Migrations**:

    ```bash
    pnpm drizzle-kit generate
    pnpm drizzle-kit migrate
    ```

4.  **Run the Application**:

    ```bash
    pnpm dev
    ```

    The application will be available at `http://localhost:5173`.
