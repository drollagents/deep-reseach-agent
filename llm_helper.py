from langchain_groq.chat_models import ChatGroq
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_llm():
    """
    Create and configure the Llama model from Groq
    Returns a configured ChatGroq instance ready for use with the Agent framework
    """
    # Ensure the API key is available
    groq_api_key = os.environ.get('GROQ_API_KEY')
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set. Please check your .env file.")
    
    # Create the ChatGroq instance with the Llama model
    llm = ChatGroq(
        groq_api_key=groq_api_key,
        model="llama-3.3-70b-versatile",
        temperature=0.5,
        max_tokens=4096,
    )
    
    return llm