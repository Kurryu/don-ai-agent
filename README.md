'''<img width="439" height="530" alt="Screenshot 2025-11-21 194744" src="https://github.com/user-attachments/assets/b12f2243-c4d4-409d-905d-627cc3854f19" />
<img width="1029" height="402" alt="Screenshot 2025-11-21 194734" src="https://github.com/user-attachments/assets/b517f9dd-3940-4f4c-94f9-857e5cbb4756" />
<img width="1029" height="328" alt="Screenshot 2025-11-21 194712" src="https://github.com/user-attachments/assets/5d5ecfc2-5965-4f99-b479-1a34d294d92a" />
<img width="1040" height="330" alt="Screenshot 2025-11-21 194646" src="https://github.com/user-attachments/assets/41eece79-fcde-4361-97bf-4d160a7f3153" />
<img width="1069" height="306" alt="Screenshot 2025-11-21 194845" src="https://github.com/user-attachments/assets/254bb7e6-b8bd-40d6-afc2-602ce73d69ff" />
<img width="1037" height="458" alt="Screenshot 2025-11-21 194836" src="https://github.com/user-attachments/assets/c51a0350-c15c-4a04-8491-461a035496be" />

Hey everyone,
I've always been amazed by what we can create with AI, but I also know that many of the best tools are expensive. I wanted to do something about that.
So, with Manus help, I managed to get a free, open-source tool for AI image generation. I'm calling it Don AI Agent, and I'm sharing it because, why not.
My goal was simple: to give everyone access to great AI pic tools, regardless of their budget.
Try it live here: https://donaiagent-3lzttnnv.manus.space/ (this one don't have the fuse option yet, but other stuff works great) as seen in the screenshots, you can generate a pic via the chat and clicking the pic icon or send a message to the chat by clicking the arrow icon, then you will find the generated pic in the gallery, you can edit the generated pic, or you can also upload a pic then edit it (aka a mini photoshop for you) change background etc (make it transparent or add a forest it's up to you)
Check out the code here (this is the code if you want to host it localy, also here is the code if you want to run it in manus directly and save troubles for yourself https://www.mediafire.com/file/30lhx1t3ypubz1z/don-ai.zip/file is the media fire link for the full code from manus, this two codes have the fuse option but it's not working as intended yet, so yeah just ignore it for now) 
Hope it can be of help to anyone.
Cheers!
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
