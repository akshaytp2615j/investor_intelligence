"""
===============================================================================
RAG SERVICE MODULE - AI-POWERED INVESTOR INTELLIGENCE PLATFORM
===============================================================================
This module manages the Retrieval-Augmented Generation (RAG) pipeline:
1. Document Chunking: Splits Markdown text semantically using LangChain SemanticChunker/TextSplitter.
2. Embedding Generation: Uses SentenceTransformers with 'BAAI/bge-base-en-v1.5'.
3. Vector Storage: Manages persistent ChromaDB vector store.
4. Similarity Retrieval: Fetches top relevant chunks with rich metadata (company, year, source, page).
5. Ollama LLM Integration: Sends prompt + context to Ollama ('llama3.1') for grounded answer generation.
6. Citation & Grounding: Appends source page citations and enforces strict failure response:
   "I could not find sufficient information in the uploaded reports to answer this question."
===============================================================================
"""

import os
import re
import json
import logging
import requests
from typing import Dict, List, Any, Optional

# LangChain & Vector DB imports
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        try:
            from langchain_community.text_splitter import RecursiveCharacterTextSplitter
        except ImportError:
            # Clean fallback recursive splitter
            class RecursiveCharacterTextSplitter:
                def __init__(self, chunk_size=600, chunk_overlap=100, separators=None):
                    self.chunk_size = chunk_size
                    self.chunk_overlap = chunk_overlap

                def split_text(self, text: str) -> List[str]:
                    chunks = []
                    start = 0
                    while start < len(text):
                        end = min(start + self.chunk_size, len(text))
                        chunks.append(text[start:end])
                        start += self.chunk_size - self.chunk_overlap
                    return chunks
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

logger = logging.getLogger("rag_service")
logger.setLevel(logging.INFO)

# -----------------------------------------------------------------------------
# CONFIGURATION CONSTANTS
# -----------------------------------------------------------------------------
EMBEDDING_MODEL_NAME = "BAAI/bge-base-en-v1.5"
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")


# -----------------------------------------------------------------------------
# BGE EMBEDDING MANAGER
# -----------------------------------------------------------------------------
class BGEEmbeddingManager:
    """
    Singleton wrapper around SentenceTransformers BAAI/bge-base-en-v1.5 embedding model.
    """
    _instance = None
    model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BGEEmbeddingManager, cls).__new__(cls)
            logger.info(f"Loading SentenceTransformers BGE embedding model: '{EMBEDDING_MODEL_NAME}'...")
            try:
                cls.model = SentenceTransformer(EMBEDDING_MODEL_NAME)
                logger.info("BGE Embedding model successfully loaded.")
            except Exception as e:
                logger.error(f"Error loading SentenceTransformer BGE model: {e}")
                cls.model = None
        return cls._instance

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if self.model is None:
            return [[0.0] * 768 for _ in texts]
        
        # Batch embedding generation to prevent CPU memory spikes on 100+ page documents
        batch_size = 32
        all_embeddings = []
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            embeddings = self.model.encode(batch_texts, show_progress_bar=False, normalize_embeddings=True)
            all_embeddings.extend(embeddings.tolist())
            
        return all_embeddings

    def embed_query(self, query: str) -> List[float]:
        if self.model is None:
            return [0.0] * 768
        # Add BGE query instruction prefix for higher retrieval precision
        instruction_query = f"Represent this sentence for searching relevant passages: {query}"
        embedding = self.model.encode(instruction_query, show_progress_bar=False, normalize_embeddings=True)
        return embedding.tolist()


# -----------------------------------------------------------------------------
# CHROMADB VECTOR STORE MANAGER
# -----------------------------------------------------------------------------
class VectorStoreManager:
    """
    Manages persistent ChromaDB vector store collection for annual report document chunks.
    """
    def __init__(self, persist_directory: str = CHROMA_PERSIST_DIR):
        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)
        
        # Initialize persistent ChromaDB client
        self.client = chromadb.PersistentClient(path=self.persist_directory)
        self.embedding_mgr = BGEEmbeddingManager()
        
        # Get or create vector collection
        self.collection = self.client.get_or_create_collection(
            name="annual_reports_v1",
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(self, chunks: List[Dict[str, Any]], company: str, fiscal_year: int, source_file: str):
        """
        Adds semantic document chunks into ChromaDB with rich metadata.
        
        Metadata fields stored:
        - company: Company name (e.g. Apple Inc.)
        - fiscal_year: Fiscal Year (e.g. 2024)
        - source_file: File name (e.g. Apple_2024.pdf)
        - page: Page number (e.g. 12)
        """
        if not chunks:
            return

        documents = []
        metadatas = []
        ids = []

        for idx, chunk in enumerate(chunks):
            chunk_text = chunk.get("text", "")
            page_num = chunk.get("page", 1)
            
            chunk_id = f"{company.replace(' ', '_')}_{fiscal_year}_pg{page_num}_c{idx}"
            
            documents.append(chunk_text)
            metadatas.append({
                "company": company,
                "fiscal_year": fiscal_year,
                "source_file": source_file,
                "page": page_num
            })
            ids.append(chunk_id)

        # Generate embeddings using BGE model
        embeddings = self.embedding_mgr.embed_documents(documents)

        # Upsert into ChromaDB
        self.collection.upsert(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        logger.info(f"Upserted {len(documents)} chunks into ChromaDB for {company} ({fiscal_year}).")

    def delete_report_chunks(self, company: str, fiscal_year: int, source_file: Optional[str] = None):
        """
        Deletes vector chunks from ChromaDB for a specific company, fiscal year, or source file.
        """
        try:
            where_dict = {"company": company}
            if source_file:
                where_dict["source_file"] = source_file
            self.collection.delete(where=where_dict)
            logger.info(f"Deleted vector chunks from ChromaDB for {company} ({source_file or fiscal_year}).")
        except Exception as e:
            logger.warning(f"ChromaDB delete chunk warning: {e}")

    def similarity_search(self, query: str, top_k: int = 5, company_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Executes vector similarity search using BGE query embedding.
        Returns list of relevant document chunks with content, metadata, and distance.
        """
        query_embedding = self.embedding_mgr.embed_query(query)

        results = None
        # First attempt with metadata filter if company_filter is specified
        if company_filter and company_filter.lower() != "all":
            try:
                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=top_k,
                    where={"company": company_filter}
                )
            except Exception:
                results = None

        # Fallback to unfiltered semantic similarity search if filtered search returned no results
        if not results or not results.get("documents") or len(results["documents"][0]) == 0:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k
            )

        retrieved_chunks = []
        if results and results.get("documents") and len(results["documents"]) > 0:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
            distances = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

            for doc, meta, dist in zip(docs, metas, distances):
                retrieved_chunks.append({
                    "text": doc,
                    "metadata": meta,
                    "distance": dist,
                    "company": meta.get("company", "Unknown"),
                    "fiscal_year": meta.get("fiscal_year", 2024),
                    "source_file": meta.get("source_file", "Annual Report"),
                    "page": meta.get("page", 1)
                })

        return retrieved_chunks


# Initialize singleton vector store
vector_store = VectorStoreManager()


# -----------------------------------------------------------------------------
# SEMANTIC CHUNKER FUNCTION
# -----------------------------------------------------------------------------
def chunk_markdown_document(pages_data: List[Dict[str, Any]], chunk_size: int = 1200, overlap: int = 150) -> List[Dict[str, Any]]:
    """
    Splits page-by-page Markdown text into semantically coherent chunks using 
    RecursiveCharacterTextSplitter while maintaining page metadata.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n### ", "\n\n", "\n", ". ", " ", ""]
    )

    all_chunks: List[Dict[str, Any]] = []

    for pdata in pages_data:
        page_num = pdata.get("page", 1)
        text = pdata.get("text", "")
        source = pdata.get("source", "")

        if not text.strip():
            continue

        raw_chunks = splitter.split_text(text)
        for chunk_txt in raw_chunks:
            if len(chunk_txt.strip()) > 20:
                all_chunks.append({
                    "text": chunk_txt.strip(),
                    "page": page_num,
                    "source": source
                })

    return all_chunks


# -----------------------------------------------------------------------------
# OLLAMA & RAG QUERY PIPELINE
# -----------------------------------------------------------------------------

def query_ollama_llm(prompt: str, system_prompt: str) -> Optional[str]:
    """
    Calls local Ollama instance running 'llama3.1' via REST API.
    """
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "temperature": 0.1,  # Low temperature for factual precision
            "top_p": 0.9
        }
    }

    try:
        response = requests.post(url, json=payload, timeout=25)
        if response.status_code == 200:
            res_data = response.json()
            return res_data.get("response", "").strip()
        else:
            logger.warning(f"Ollama endpoint returned HTTP {response.status_code}")
            return None
    except Exception as e:
        logger.warning(f"Ollama connection error: {e}")
        return None


def is_greeting_or_meta_query(question: str) -> bool:
    """
    Detects if the user input is a casual greeting or meta-question.
    """
    q = question.strip().lower()
    cleaned = re.sub(r"[^\w\s]", "", q).strip()
    greetings = {
        "hi", "hello", "hey", "hola", "greetings", "good morning",
        "good afternoon", "good evening", "howdy", "help",
        "who are you", "what can you do", "what is this", "start", "menu"
    }
    return cleaned in greetings or bool(re.match(r"^(hi|hello|hey|greetings|help|who are you|what can you do)[\s!?.]*$", q))


def generate_fallback_analyst_answer(question: str, context_chunks: List[Dict[str, Any]]) -> str:
    """
    Grounds and synthesizes answers directly from ChromaDB document context chunks
    into natural, professional English matching the user's inquiry topic.
    Filters out raw unformatted tabular number dumps.
    """
    if not context_chunks:
        return "I could not find sufficient information in the uploaded reports to answer this question."

    comp_names = list(set([c["company"] for c in context_chunks if c.get("company")]))
    comp_str = ", ".join(comp_names) if comp_names else "the ingested report"
    q_lower = question.lower()

    # Extract readable, informative text snippets, filtering out numeric table dumps
    extracted_notes = []
    for c in context_chunks:
        raw_text = c["text"].strip()
        comp = c.get("company", "Report")
        year = c.get("fiscal_year", "")
        page = c.get("page", 1)

        # Replace sequences of space-separated large numbers (raw tabular row dumps) with clean text
        cleaned = re.sub(r'(\b\d{1,3}(?:,\d{3})+\b\s*){2,}', '', raw_text)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()

        # Split into sentences
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', cleaned) if len(s.strip()) > 15]

        # Filter out sentences that are mostly just raw digits or table artifacts
        readable_sentences = []
        for s in sentences:
            words = s.split()
            digit_count = sum(1 for w in words if re.match(r'^\d[\d,.]*$', w))
            if digit_count / max(len(words), 1) < 0.4:
                readable_sentences.append(s)

        if readable_sentences:
            combined = " ".join(readable_sentences[:3])
            if len(combined) > 280:
                combined = combined[:280] + "..."
            extracted_notes.append({
                "company": comp,
                "year": year,
                "page": page,
                "text": combined
            })

    if not extracted_notes:
        # Fallback if table filter removed everything
        for c in context_chunks[:2]:
            t = re.sub(r'\s+', ' ', c["text"]).strip()
            if len(t) > 200:
                t = t[:200] + "..."
            extracted_notes.append({
                "company": c.get("company", "Report"),
                "year": c.get("fiscal_year", ""),
                "page": c.get("page", 1),
                "text": t
            })

    # Determine topic of user question for tailored header
    if any(k in q_lower for k in ["revenue", "sales", "income", "profit", "financial", "growth", "margin"]):
        topic_header = "Financial & Performance Highlights"
    elif any(k in q_lower for k in ["risk", "threat", "challenge", "uncertainty"]):
        topic_header = "Risk Factors & Disclosures"
    elif any(k in q_lower for k in ["driver", "strategy", "future", "expansion", "investment"]):
        topic_header = "Growth Drivers & Strategic Initiatives"
    elif any(k in q_lower for k in ["compare", "comparison", "versus", "vs"]):
        topic_header = "Comparative Report Insights"
    else:
        topic_header = "Key Report Highlights"

    # Group notes by company
    grouped = {}
    for note in extracted_notes:
        key = f"{note['company']} ({note['year']})"
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(note)

    lines = []
    lines.append(f"Based on the **{comp_str}** disclosures retrieved from ChromaDB, here is a clear natural language breakdown of the {topic_header.lower()} aligning with your inquiry:\n")

    for key, items in grouped.items():
        lines.append(f"### **{key}**")
        for item in items:
            lines.append(f"- **Page {item['page']}**: {item['text']}")
        lines.append("")

    return "\n".join(lines).strip()


def execute_rag_query(question: str, company_filter: Optional[str] = None) -> Dict[str, Any]:
    """
    Full End-to-End RAG Execution Pipeline:
    1. Greeting / Small-talk detection.
    2. Vector similarity search in ChromaDB using BGE embeddings.
    3. Context retrieval.
    4. Grounded answer generation using Ollama ('llama3.1') or fallback analyst.
    5. Citations formatting with Report Name and Page numbers.
    """
    logger.info(f"Executing RAG query: '{question}' (Company filter: {company_filter})")

    # Step 1: Check for casual greeting or meta question
    if is_greeting_or_meta_query(question):
        return {
            "answer": (
                "Hello! I am your AI Financial Analyst. Ask me anything about the ingested company annual reports — "
                "such as revenue trends, risk analysis, growth drivers, key financial metrics, or side-by-side company comparisons. "
                "How can I help you today?"
            ),
            "sources": [],
            "grounded": True
        }

    # Step 2: Retrieve relevant context chunks from ChromaDB
    context_chunks = vector_store.similarity_search(query=question, top_k=4, company_filter=company_filter)

    # Strict Grounding Check: If no chunks retrieved
    if not context_chunks:
        return {
            "answer": "I could not find sufficient information in the uploaded reports to answer this question.",
            "sources": [],
            "grounded": False
        }

    # Step 3: Format context for LLM prompt
    formatted_context_list = []
    sources = []
    seen_sources = set()

    for idx, chunk in enumerate(context_chunks):
        comp = chunk["company"]
        year = chunk["fiscal_year"]
        source_file = chunk["source_file"]
        page = chunk["page"]
        text = chunk["text"]

        formatted_context_list.append(f"[Context {idx+1}] ({comp} {year} Annual Report, Page {page}):\n{text}\n")
        
        source_key = f"{comp} {year} Annual Report - Page {page}"
        if source_key not in seen_sources:
            seen_sources.add(source_key)
            sources.append({
                "company": comp,
                "year": year,
                "file": source_file,
                "page": page,
                "citation": source_key
            })

    context_str = "\n".join(formatted_context_list)

    # Step 4: Construct RAG System Prompt enforcing natural language analyst synthesis
    system_prompt = (
        "You are an expert AI Financial Analyst for an Investor Intelligence Platform. "
        "Your task is to answer user questions strictly based on the provided annual report contexts in clear, natural, professional English.\n"
        "Rules:\n"
        "1. Direct Response: Respond directly to the user's question in full, cohesive natural language sentences.\n"
        "2. No Raw Tables: Do not output raw unformatted numbers, raw table rows, or meaningless numeric sequences.\n"
        "3. Factuality: Do not invent or assume any financial numbers not explicitly stated in the context.\n"
        "4. Strict Refusal: If the provided context does not contain relevant information to answer the question, respond EXACTLY: "
        "'I could not find sufficient information in the uploaded reports to answer this question.'\n"
        "5. Structure: Use markdown bullet points and headings to organize financial figures and insights cleanly."
    )

    user_prompt = (
        f"Context Information from Annual Reports:\n{context_str}\n\n"
        f"User Question: {question}\n\n"
        f"Provide a clear, accurate, natural English answer based ONLY on the context above:"
    )

    # Step 5: Call Ollama LLM
    answer = query_ollama_llm(prompt=user_prompt, system_prompt=system_prompt)

    # Step 6: Fallback to grounded local analyst engine if Ollama is unavailable
    if not answer or "could not find" in answer.lower():
        if not answer:
            answer = generate_fallback_analyst_answer(question, context_chunks)

    return {
        "answer": answer,
        "sources": sources,
        "grounded": True
    }
