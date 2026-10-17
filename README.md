# HomeIQ Assistant

HomeIQ is a powerful, locally-hosted Virtual Assistant designed to operate seamlessly on a pure Python and HTML/CSS architecture.

## 🏗️ Technology Stack

### 🎨 Frontend (Client)
*   **Structure & Logic:** Vanilla HTML and Vanilla JavaScript
*   **Styling:** Custom Vanilla CSS tailored for a premium dark mode aesthetic
*   *(No frameworks like React or build tools like Vite are required)*

### ⚙️ Middle-tier API & Backend Servers
*   **Language:** Python
*   **Framework:** FastAPI (served by **Uvicorn**)
*   The same application handles serving the static frontend interface and managing all AI API requests and routing.

### 🧠 Python AI Backend (Agent & RAG Core)
*   **Framework:** FastAPI (served by **Uvicorn**)
*   **LLM Orchestration:** LangChain ecosystem (`langchain`, `langchain-experimental`, `langchain-text-splitters`)
*   **Model Providers:**
    *   **Groq** (`langchain-groq`) for extremely fast LLM inference.
    *   **HuggingFace** (`langchain-huggingface`, `sentence-transformers`) for generating text embeddings.
*   **Vector Databases** (for Retrieval-Augmented Generation / Memory):
    *   **FAISS** (`faiss-cpu`) local vector similarity search.
    *   **ChromaDB** as an alternative vector store.
*   **Data Handling:** **Pandas** and **NumPy** for any structured data processing or memory handling.

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- `pip` or `uv` package manager

### 2. Installation
Navigate to the root directory and set up the project using `uv`.

```bash
# Initialize a uv project (if starting fresh, though uv.lock/pyproject.toml may already exist)
uv init

# Create a virtual environment and install dependencies from requirements.txt
uv venv
uv pip install -r requirements.txt
```

### 3. Environment Setup
You will need to configure your API keys. Look at the `python_backend/.env.example` file and create a `.env` file in the root directory (or inside `python_backend/`) with the following varilables:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Running the Application
The entirety of the application—both frontend and backend capabilities—is driven by the Python server. Run the backend script using `uv`:

```bash
cd python_backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Once running, navigate to `http://localhost:8000` in your web browser to interact with the HomeIQ Assistant.
