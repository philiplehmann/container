import json
import uuid
import time
import logging
import uvicorn

from pathlib import Path
from os import environ
from typing import Tuple, Optional
from easyocr import Reader
from fastapi import FastAPI, Request, Query
from fastapi.responses import Response
from numpy import int64
from pyvips import Image

logging.config.fileConfig('logging.conf')


PORT = int(environ.get('PORT', '3000'))
LANG = environ.get('EASYOCR_LANG', 'de,fr,it,en')
GPU = environ.get('EASYOCR_GPU', 'True') == 'True'
DETECTOR = environ.get('EASYOCR_DETECTOR', 'True') == 'True'
RECOGNIZER = environ.get('EASYOCR_RECOGNIZER', 'True') == 'True'
MAX_SIZE = int(environ.get('EASYOCR_MAX_SIZE', '2000'))
FILE_MAX_SIZE = int(environ.get('EASYOCR_FILE_MAX_SIZE', '52428800')) # 50MB
DOWNLOAD_ENABLED = environ.get('EASYOCR_DOWNLOAD_ENABLED', 'False') == 'True'

app = FastAPI()
logger = logging.getLogger('easyocr')

logger.info(f"Loading EasyOCR with languages: {LANG.split(',')}")
reader = Reader(
  LANG.split(','),
  gpu=GPU,
  download_enabled=DOWNLOAD_ENABLED,
  recog_network='standard',
  detector=DETECTOR,
  recognizer=RECOGNIZER,
  model_storage_directory=str(Path.cwd() / 'model'),
  user_network_directory=str(Path.cwd() / 'model' / 'user_network'),
)

TMP_DIR = Path.cwd() / 'tmp'
tmp_path = Path(TMP_DIR)
tmp_path.mkdir(parents=True, exist_ok=True)

def log_duration(func):
  def wrapper(*args, **kwargs):
    start_time = time.perf_counter()
    result = func(*args, **kwargs)
    end_time = time.perf_counter()
    duration_ms = (end_time - start_time) * 1000
    logger.info(f"{func.__name__}  Execution time: {duration_ms:.2f} ms")
    return result
  return wrapper

@log_duration
async def stream_file(file_path: Path, stream):
  with open(file_path, "wb") as f:
    async for chunk in stream:
      f.write(chunk)

@log_duration
def resize_image(input_path: Path, output_path: Path, max_size: int) -> Tuple[Path, int, int]:
  image = Image.thumbnail(str(input_path), max_size, height=max_size, size="down")
  image.write_to_file(str(output_path))
  input_path.unlink(missing_ok=True)
  return output_path, int(image.width), int(image.height)

@log_duration
def size_image(input_path: Path) -> Tuple[int, int]:
  image = Image.new_from_file(input_path)
  return int(image.width), int(image.height)

def json_serializer(obj):
    if isinstance(obj, int64):
        return int(obj)
    raise TypeError(f"Type {type(obj)} is not JSON serializable")

@log_duration
def easyocr_readtext(file_path, workers=0, batch_size=1, decoder='greedy', beam_width=5, detail=1, paragraph=False, min_size=10, rotation_info=None):
  logger.info(f"Processing {file_path}")
  results = reader.readtext(
    str(file_path),
    output_format='dict',
    workers=workers,
    batch_size=batch_size,
    decoder=decoder,
    beamWidth=beam_width,
    detail=detail,
    paragraph=paragraph,
    min_size=min_size,
    rotation_info=rotation_info
  )
  return results

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response

valid_decoders = ['greedy', 'beam_search', 'wordbeamsearch']
@app.post("/readtext")
async def readtext(
    request: Request,  # The HTTP request object containing the uploaded image.
    workers: int = Query(0, description="Number of worker threads to use for OCR processing."),
    batch_size: int = Query(1, description="Batch size for OCR processing."),
    decoder: str = Query('greedy', description="Decoder type for OCR (e.g., 'greedy', 'beam')."),
    beam_width: int = Query(5, description="Beam width for the beam search decoder."),
    detail: int = Query(1, description="Level of detail in OCR results (1 for detailed, 0 for simple)."),
    paragraph: bool = Query(False, description="Whether to group text into paragraphs."),
    min_size: int = Query(10, description="Minimum size of text to detect."),
    rotation_info: Optional[str] = Query(None, description="Comma-separated list of rotation angles to consider."),
    max_size: int = Query(MAX_SIZE, description="Maximum size of the image for resizing."),
    resize: bool = Query(True, description="Whether to resize the image before processing.")
):
  if decoder not in valid_decoders:
    return Response(f"Error: decoder must be one of {valid_decoders}", status=400)
  if rotation_info and not all(angle.strip().isdigit() or (angle.strip().startswith('-') and angle.strip()[1:].isdigit()) for angle in rotation_info.split(',')):
    return Response("Error: rotation_info must be a comma-separated list of integers", status=400)
  headers = request.headers
  content_length = headers.get('content-length')
  content_type = headers.get('content-type')
  if content_type not in ["image/png", "image/jpeg"]:
    return Response(content="Unsupported file type", status_code=400)

  if content_length and int(content_length) > FILE_MAX_SIZE:
    logger.error("File too large: ", f"{request.content_length} / {FILE_MAX_SIZE}")
    return Response(content=f"File too large, maximum size is {FILE_MAX_SIZE / 1024 / 1024:.1f}MB", status_code=413)

  random_uuid = uuid.uuid4()
  extname = content_type.split('/')[1]
  file_path = tmp_path / f"upload-{random_uuid}.{extname}"

  try:
    await stream_file(file_path, request.stream())
  except Exception as e:
    file_path.unlink(missing_ok=True)
    logger.error('Error writing body:', e)
    return Response(status_code=500, cotnent="Error writing body")

  try:
    if resize:
      new_file_path = tmp_path / f"resize-{random_uuid}.png"
      file_path, width, height = resize_image(file_path, new_file_path, max_size)
    else:
      width, height = size_image(file_path)
  except Exception as e:
    file_path.unlink(missing_ok=True)
    logger.error('Error resizing image:', e)
    return Response(status_code=500, content="Error resizing image")

  try:
    results = easyocr_readtext(
      file_path,
      workers,
      batch_size,
      decoder,
      beam_width,
      detail,
      paragraph,
      min_size,
      rotation_info.split(',') if rotation_info else None
    )
    file_path.unlink(missing_ok=True)
    output = { 'imageSize': { 'width': width, 'height': height }, 'results': results }
    return Response(content=json.dumps(output, default=json_serializer, ensure_ascii=False), status_code=200, media_type="application/json")
  except Exception as e:
    file_path.unlink(missing_ok=True)
    logger.error('Error processing image:', e)
    return Response(status_code=500, content="Error processing image")

@app.get("/health")
def health():
  return Response(content="ok", status_code=200)

@app.get("/health/liveness")
def health_liveness():
  return Response(content="ok", status_code=200)

@app.get("/health/readiness")
def health_readiness():
  return Response(content="ok", status_code=200)

if __name__ == "__main__":
  uvicorn.run(
      app,
      host="0.0.0.0",
      port=PORT,
      log_config=None,  # Disable uvicorn's default logging
      log_level="info"  # Use the defined logger's level
  )
