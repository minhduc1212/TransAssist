import re
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

app = FastAPI(title="TransAssist API", description="Backend service for TransAssist translator assistant")

# Allow CORS for development and frontend deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ParseRequest(BaseModel):
    text: str
    split_method: str = "line"  # "line" or "sentence"

class Segment(BaseModel):
    id: int
    original: str
    translation: str = ""
    startIndex: int = 0
    endIndex: int = 0

class ParseResponse(BaseModel):
    segments: List[Segment]

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "vi"

class TranslateResponse(BaseModel):
    google: str
    mymemory: str

def split_by_sentences(text: str) -> List[str]:
    # Split text by sentence delimiters (., !, ?) followed by whitespace
    # We use a lookbehind to keep the delimiter with the sentence
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    # Remove empty sentences
    return [s.strip() for s in sentences if s.strip()]

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "TransAssist Backend"}

@app.post("/api/parse", response_model=ParseResponse)
def parse_text(request: ParseRequest):
    try:
        raw_text = request.text
        if not raw_text.strip():
            return ParseResponse(segments=[])

        # Normalize line endings
        raw_text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
        
        segments = []
        seg_id = 1
        current_idx = 0
        
        if request.split_method == "line":
            # Split by lines, ignoring completely empty lines or preserving them as spacing
            lines = raw_text.split("\n")
            for line in lines:
                stripped = line.strip()
                if stripped:
                    start = raw_text.find(line, current_idx)
                    if start == -1:
                        start = raw_text.find(line)
                    end = start + len(line)
                    segments.append(Segment(
                        id=seg_id, 
                        original=stripped, 
                        startIndex=start, 
                        endIndex=end
                    ))
                    current_idx = end
                    seg_id += 1
        else:
            # Split by sentences (treating paragraphs as separate blocks, then splitting them)
            paragraphs = raw_text.split("\n")
            for para in paragraphs:
                stripped_para = para.strip()
                if not stripped_para:
                    continue
                sentences = split_by_sentences(stripped_para)
                for sentence in sentences:
                    start = raw_text.find(sentence, current_idx)
                    if start == -1:
                        start = raw_text.find(sentence)
                    end = start + len(sentence)
                    segments.append(Segment(
                        id=seg_id, 
                        original=sentence, 
                        startIndex=start, 
                        endIndex=end
                    ))
                    current_idx = end
                    seg_id += 1
                    
        return ParseResponse(segments=segments)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse text: {str(e)}")

@app.post("/api/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    if not request.text.strip():
        return TranslateResponse(google="", mymemory="")
        
    google_suggestion = ""
    mymemory_suggestion = ""
    
    # 1. Fetch from Google Translate (free gtx client API)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            google_url = "https://translate.googleapis.com/translate_a/single"
            params = {
                "client": "gtx",
                "sl": request.source_lang,
                "tl": request.target_lang,
                "dt": "t",
                "q": request.text
            }
            res = await client.get(google_url, params=params)
            if res.status_code == 200:
                data = res.json()
                # Google returns a list of segments in the first element
                # e.g., [[[translation, original, ...], [translation, original, ...]]]
                if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                    translations = [part[0] for part in data[0] if part and isinstance(part, list) and part[0]]
                    google_suggestion = "".join(translations)
    except Exception as e:
        # Fallback to empty, but log or handle gracefully
        google_suggestion = f"[Google Translate Error: {str(e)}]"

    # 2. Fetch from MyMemory Translation API (free lookup API)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            langpair = f"{request.source_lang}|{request.target_lang}"
            # If auto, convert to standard format
            if request.source_lang == "auto":
                langpair = f"en|{request.target_lang}"  # MyMemory doesn't support auto in the same way, defaults to English source
            
            mymemory_url = "https://api.mymemory.translated.net/get"
            params = {
                "q": request.text,
                "langpair": langpair
            }
            res = await client.get(mymemory_url, params=params)
            if res.status_code == 200:
                data = res.json()
                if data and "responseData" in data and "translatedText" in data["responseData"]:
                    mymemory_suggestion = data["responseData"]["translatedText"]
    except Exception as e:
        mymemory_suggestion = f"[MyMemory Error: {str(e)}]"

    # If MyMemory failed or is error text, clean it up
    if not mymemory_suggestion or "[MyMemory Error" in mymemory_suggestion:
        mymemory_suggestion = google_suggestion  # Fallback to Google if MyMemory fails
        
    return TranslateResponse(google=google_suggestion, mymemory=mymemory_suggestion)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
