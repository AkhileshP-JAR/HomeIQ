import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.chat_models import init_chat_model
from langchain_community.vectorstores import FAISS
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_text_splitters import CharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage

import pandas as pd
from datetime import datetime

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response

load_dotenv()

app = FastAPI(title="HomeIQ Python Backend")

# Lazy load AI models to drastically speed up server startup
_llm = None
_embeddings = None

def get_llm():
    global _llm
    if _llm is None:
        _llm = init_chat_model(model_provider='groq', model='llama-3.1-8b-instant')
    return _llm

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings

# Basic RAG components (In-memory for this phase)
vector_store = None

@app.on_event("startup")
async def startup_event():
    global vector_store
    index_name = "faiss_index"
    
    try:
        if os.path.exists(index_name):
            # Load existing cached FAISS index
            vector_store = FAISS.load_local(index_name, get_embeddings(), allow_dangerous_deserialization=True)
            print(f"Loaded existing FAISS memory from '{index_name}' cache.")
        elif os.path.exists("home_facts.txt"):
            # Auto-ingest the detailed home facts and cache them
            with open("home_facts.txt", "r", encoding="utf-8") as f:
                content = f.read()
            text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
            docs = [Document(page_content=content, metadata={"source": "home_facts"})]
            split_docs = text_splitter.split_documents(docs)
            vector_store = FAISS.from_documents(split_docs, get_embeddings())
            # Save to disk for future restarts
            vector_store.save_local(index_name)
            print(f"Ingested {len(split_docs)} documents and cached to '{index_name}'.")
        else:
            print("home_facts.txt not found. Starting with empty FAISS memory.")
    except Exception as e:
        print(f"Error initializing FAISS memory: {e}")

# Simulated Smart Home Devices State
simulated_devices: dict[str, dict] = {
    "living_room_light": {"name": "Havells Smart Switch", "type": "light", "state": "off"},
    "bedroom_light": {"name": "Philips Smart Bulb", "type": "light", "state": "on"},
    "thermostat": {"name": "Daikin Inverter AC", "type": "hvac", "state": 72},
    "ambient_rgb": {"name": "Wipro RGB LED Strip", "type": "rgb", "state": "#ffffff"},
    "front_door_lock": {"name": "Godrej Advantis Lock", "type": "lock", "state": "locked"},
    "bedroom_blinds": {"name": "Wintrobe Motorized Blinds", "type": "blinds", "state": 0},
    "mi_camera": {"name": "Mi 360° Security Camera", "type": "camera", "state": "on"},
    "hikvision_doorbell": {"name": "Hikvision Door Phone", "type": "camera", "state": "on"},
    "bathroom_geyser": {"name": "AO Smith Geyser", "type": "light", "state": "off"}
}

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: int

class DocumentInput(BaseModel):
    content: str
    metadata: Optional[dict] = None

class DeviceUpdate(BaseModel):
    state: str | int

# Serve static files for the HTML/CSS frontend
app.mount("/static", StaticFiles(directory="../static"), name="static")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    # Return a dummy 204 No Content response to instantly silence 404 errors in the console
    return Response(status_code=204)

@app.get("/")
async def root():
    return FileResponse("../static/index.html")

# --- Smart Home API Endpoints ---
@app.get("/api/devices")
async def get_devices():
    return simulated_devices

@app.post("/api/devices/{device_id}")
async def update_device(device_id: str, update: DeviceUpdate):
    if device_id not in simulated_devices:
        raise HTTPException(status_code=404, detail="Device not found")
        
    simulated_devices[device_id]["state"] = update.state
    # In a real app, this would send a signal to an IoT broker (e.g., MQTT)
    return {"message": "Device updated successfully", "device": simulated_devices[device_id]}

@app.post("/api/routines/{routine_name}")
async def execute_routine(routine_name: str):
    if routine_name == "morning":
        simulated_devices["bedroom_blinds"]["state"] = 100
        simulated_devices["bedroom_light"]["state"] = "off"
        simulated_devices["living_room_light"]["state"] = "on"
        simulated_devices["thermostat"]["state"] = 72
        simulated_devices["front_door_lock"]["state"] = "unlocked"
        simulated_devices["ambient_rgb"]["state"] = "#ffffff"
        return {"message": "Good morning routine executed", "devices": simulated_devices}
    elif routine_name == "night":
        simulated_devices["bedroom_blinds"]["state"] = 0
        simulated_devices["bedroom_light"]["state"] = "on"
        simulated_devices["living_room_light"]["state"] = "off"
        simulated_devices["thermostat"]["state"] = 68
        simulated_devices["front_door_lock"]["state"] = "locked"
        simulated_devices["ambient_rgb"]["state"] = "#1e1b4b"
        return {"message": "Good night routine executed", "devices": simulated_devices}
    else:
        raise HTTPException(status_code=404, detail="Routine not found")
# --- End Smart Home API Endpoints ---

# --- Memory System ---
reminders_df = pd.DataFrame(columns=["id", "task", "created_at"])


# --- LangChain Tools ---
@tool
def update_device_state(device_id: str, state: str) -> str:
    """Updates the state of a smart home device.
    
    Args:
        device_id: The ID of the device to control (e.g., 'living_room_light', 'thermostat', 'front_door_lock', 'bedroom_blinds', 'ambient_rgb').
        state: The new state to set (e.g., 'on', 'off', '72', 'locked', 'unlocked', '50', '#ff0000').
    """
    if device_id in simulated_devices:
        if simulated_devices[device_id]["type"] in ["hvac", "blinds"]:
            try:
                simulated_devices[device_id]["state"] = int(state)
            except ValueError:
                return f"Error: state for {device_id} must be an integer."
        else:
            simulated_devices[device_id]["state"] = state
            
        return f"Successfully updated {device_id} to {state}."
    return f"Error: Device {device_id} not found."

@tool
def add_reminder(task: str) -> str:
    """Adds a reminder or task to the user's to-do list.
    
    Args:
        task: The reminder description.
    """
    global reminders_df
    new_id = len(reminders_df) + 1
    new_row = {"id": new_id, "task": task, "created_at": datetime.now().isoformat()}
    reminders_df = pd.concat([reminders_df, pd.DataFrame([new_row])], ignore_index=True)
    return f"Reminder added successfully: {task}"

@tool
def get_reminders() -> str:
    """Retrieves all active reminders from the user's to-do list."""
    if reminders_df.empty:
        return "You have no reminders."
    
    reminders_list = [f"{row['id']}. {row['task']}" for _, row in reminders_df.iterrows()]
    return "Your Reminders:\n" + "\n".join(reminders_list)

tools = [update_device_state, add_reminder, get_reminders]
# --- End LangChain Tools ---

@app.post("/api/ingest")
async def ingest_document(doc: DocumentInput):
    global vector_store
    text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
    docs = [Document(page_content=doc.content, metadata=doc.metadata or {})]
    split_docs = text_splitter.split_documents(docs)
    
    if vector_store is None:
        vector_store = FAISS.from_documents(split_docs, get_embeddings())
    else:
        vector_store.add_documents(split_docs)
    
    return {"message": "Document ingested successfully"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    global vector_store
    
    context = ""
    if vector_store is not None:
        # Simple similarity search for RAG
        search_results = vector_store.similarity_search(request.message, k=3)
        context = "\n".join([doc.page_content for doc in search_results])
    
    home_state_descriptions = []
    for d_id, d_info in simulated_devices.items():
        state_str = str(d_info["state"])
        if d_info["type"] == "light":
            home_state_descriptions.append(f"- {d_info['name']} is currently {state_str.upper()}.")
        elif d_info["type"] == "hvac":
            home_state_descriptions.append(f"- {d_info['name']} is currently set to {state_str} degrees.")
        elif d_info["type"] == "rgb":
            home_state_descriptions.append(f"- {d_info['name']} is currently set to color hex {state_str}.")
        elif d_info["type"] == "lock":
            home_state_descriptions.append(f"- {d_info['name']} is currently {state_str.upper()}.")
        elif d_info["type"] == "blinds":
            home_state_descriptions.append(f"- {d_info['name']} is currently {state_str}% open.")
        elif d_info["type"] == "camera":
            home_state_descriptions.append(f"- {d_info['name']} is currently {state_str.upper()}.")
            
    home_context = "\n".join(home_state_descriptions)
    
    system_prompt = (
        "You are HomeIQ, a highly intelligent, conversational AI assistant (like ChatGPT) "
        "that is also integrated into the user's smart home.\n\n"
        "Your capabilities:\n"
        "1. You are a general-purpose AI. Answer ANY question (programming, philosophy, math, jokes, trivia) intelligently and comprehensively.\n"
        "2. You can control smart home devices via your tools.\n"
        "3. You have deep knowledge of the home's wiring, plumbing, and tech brands. Use this to provide troubleshooting or lifecycle details.\n\n"
        "Current Home State:\n" + home_context
    )
    
    if context:
        system_prompt += f"\n\nUse the following retrieved knowledge about the home to help answer the user question:\n{context}"
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=request.message)
    ]
    
    try:
        current_llm = get_llm()
        llm_with_tools = current_llm.bind_tools(tools)
        response = llm_with_tools.invoke(messages)
        
        if response.tool_calls:
            messages.append(response)
            for tool_call in response.tool_calls:
                tool_func = next((t for t in tools if t.name == tool_call["name"]), None)
                if tool_func:
                    tool_msg = tool_func.invoke(tool_call)
                    messages.append(tool_msg)
            
            # Get final response after tool execution
            final_response = current_llm.invoke(messages)
            return {
                "response": final_response.content,
                "conversation_id": request.conversation_id or 1
            }
        else:
            return {
                "response": response.content,
                "conversation_id": request.conversation_id or 1
            }
            
    except Exception as e:
        # Fallback if API key is missing or error occurs
        return {
            "response": f"Error interacting with LLM: {str(e)}",
            "conversation_id": request.conversation_id or 1
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
