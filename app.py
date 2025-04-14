import asyncio
import os
import sys
import nest_asyncio
from typing import Dict, Any
from flask import Flask, render_template, request, jsonify
from firecrawl import FirecrawlApp
from dotenv import load_dotenv
from llm_helper import get_llm
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# Apply nest_asyncio to allow nested asyncio event loops (required for Jupyter/Flask integration)
nest_asyncio.apply()

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)

# Get API keys from environment variables
FIRECRAWL_API_KEY = os.environ.get('FIRECRAWL_API_KEY')
if not FIRECRAWL_API_KEY:
    print("Warning: FIRECRAWL_API_KEY not found in environment variables. Please check your .env file.")

# Use the get_llm helper function to initialize the LLM
try:
    llm = get_llm()
    print("LLM initialized successfully")
except Exception as e:
    print(f"Error initializing LLM: {str(e)}", file=sys.stderr)
    sys.exit(1)

# Deep research tool
async def deep_research(query: str, max_depth: int = 3, time_limit: int = 180, max_urls: int = 10) -> Dict[str, Any]:
    """
    Perform comprehensive web research using Firecrawl's deep research endpoint.
    """
    try:
        print(f"Starting research on: {query}")
        # Initialize FirecrawlApp with the API key from environment
        firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
        
        # Define research parameters
        params = {
            "maxDepth": max_depth,
            "timeLimit": time_limit,
            "maxUrls": max_urls
        }
        
        # Run deep research
        print("Calling Firecrawl deep_research API...")
        results = firecrawl_app.deep_research(
            query=query,
            params=params
        )
        
        if not results or 'data' not in results:
            raise Exception("Invalid response structure from Firecrawl API")
        
        print("Research completed successfully")
        return {
            "success": True,
            "final_analysis": results['data']['finalAnalysis'],
            "sources_count": len(results['data']['sources']),
            "sources": results['data']['sources']
        }
    except Exception as e:
        print(f"Research error: {str(e)}", file=sys.stderr)
        error_message = str(e)
        if "Network response was not ok" in error_message:
            error_message = "Network error occurred while connecting to Firecrawl API. Please check your API key and network connection."
        return {"error": error_message, "success": False}

# Configure research chain
research_system_prompt = """You are a research assistant that can perform deep web research on any topic.
When given a research topic or question:
1. Analyze the research results gathered from the web
2. Review the results and organize them into a well-structured report
3. Include proper citations for all sources
4. Highlight key findings and insights
"""

# Handle research results - this is synchronous now
def handle_research_results(topic):
    """
    Synchronous function that runs the deep_research coroutine and returns messages.
    """
    # Create an event loop and run the coroutine
    loop = asyncio.new_event_loop()
    research_data = loop.run_until_complete(deep_research(topic))
    loop.close()
    
    if research_data.get("success", False):
        analysis = research_data["final_analysis"]
        sources = research_data["sources"]
        sources_text = "\n\n## Sources:\n" + "\n".join([
            f"{i+1}. {source.get('url', 'Unknown URL')} - {source.get('title', 'No title')}"
            for i, source in enumerate(sources[:10])
        ])
        return [HumanMessage(content=f"Research results: {analysis}\n{sources_text}")]
    else:
        error_msg = research_data.get('error', 'Unknown error')
        print(f"Research failed: {error_msg}")
        return [HumanMessage(content=f"Research failed: {error_msg}")]

# Create the research chain
def create_research_chain():
    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=research_system_prompt),
        MessagesPlaceholder(variable_name="history"),
        HumanMessage(content="Research the following topic: {topic}"),
        MessagesPlaceholder(variable_name="research_results")
    ])
    
    return (
        RunnablePassthrough.assign(
            research_results=lambda x: handle_research_results(x["topic"])
        )
        | prompt
        | llm
        | StrOutputParser()
    )

# Configure elaboration chain
elaboration_system_prompt = """You are an expert content enhancer specializing in research elaboration.
When given a research report:
1. Enhance the report by:
   - Adding more detailed explanations of complex concepts
   - Including relevant examples, case studies, and real-world applications
   - Expanding on key points with additional context and nuance
   - Adding visual elements descriptions (charts, diagrams, infographics)
   - Incorporating latest trends and future predictions
   - Suggesting practical implications for different stakeholders
2. Maintain academic rigor and factual accuracy
3. Preserve the original structure while making it more comprehensive
4. Ensure all additions are relevant and valuable to the topic
"""

def create_elaboration_chain():
    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=elaboration_system_prompt),
        HumanMessage(content="""
        RESEARCH TOPIC: {topic}
        
        INITIAL RESEARCH REPORT:
        {initial_report}
        
        Please enhance this research report with additional information, examples, case studies, 
        and deeper insights while maintaining its academic rigor and factual accuracy.
        """)
    ])
    
    return (
        prompt
        | llm
        | StrOutputParser()
    )

# Now this function is truly async and uses the synchronous chains
async def run_research_process(topic: str):
    """Run the complete research process."""
    print(f"Starting research process for topic: {topic}")
    try:
        # Create research chain (this is now synchronous)
        research_chain = create_research_chain()
        
        # Run the initial research with a thread pool to not block the event loop
        loop = asyncio.get_event_loop()
        initial_report = await loop.run_in_executor(
            None, 
            lambda: research_chain.invoke({"topic": topic, "history": []})
        )
        print("Initial research completed")
        
        # Create elaboration chain (also synchronous)
        elaboration_chain = create_elaboration_chain()
        
        # Run the elaboration chain also with a thread pool
        enhanced_report = await loop.run_in_executor(
            None,
            lambda: elaboration_chain.invoke({
                "topic": topic,
                "initial_report": initial_report
            })
        )
        print("Enhanced report generated")
        
        return {
            "initial_report": initial_report,
            "enhanced_report": enhanced_report
        }
    except Exception as e:
        print(f"Error in research process: {str(e)}", file=sys.stderr)
        raise

# Flask routes
@app.route("/")
def index():
    """Render the main page"""
    return render_template("index.html")

@app.route("/research", methods=["POST"])
def research():
    """Handle research requests"""
    data = request.json
    research_topic = data.get("research_topic")
    
    if not research_topic:
        return jsonify({"error": "No research topic provided", "success": False}), 400
    
    try: 
        print(f"Received research request for topic: {research_topic}")
        # Run research process
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(run_research_process(research_topic))
        loop.close()
        
        return jsonify({
            "success": True,
            "initial_report": result["initial_report"],
            "enhanced_report": result["enhanced_report"]
        })
    except Exception as e:
        print(f"ERROR in /research endpoint: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500

# Add this near the bottom of the file, replace the existing if __name__ == "__main__" block
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
