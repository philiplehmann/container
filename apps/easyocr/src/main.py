import sys
import json
import uuid
from pathlib import Path
from os import environ
import time
from typing import Tuple
import logging

from easyocr import Reader
from flask import Flask, request, Response, abort
from pyvips import Image
from numpy import int64

PORT = environ.get('PORT', '3000')
LANG = environ.get('EASYOCR_LANG', 'de,fr,it,en')
GPU = environ.get('EASYOCR_GPU', 'True') == 'True'
DETECTOR = environ.get('EASYOCR_DETECTOR', 'True') == 'True'
RECOGNIZER = environ.get('EASYOCR_RECOGNIZER', 'True') == 'True'
MAX_SIZE = int(environ.get('EASYOCR_MAX_SIZE', '1000'))
FILE_MAX_SIZE = int(environ.get('EASYOCR_FILE_MAX_SIZE', '52428800')) # 50MB
DOWNLOAD_ENABLED = environ.get('EASYOCR_DOWNLOAD_ENABLED', 'False') == 'True'

app = Flask('easyocr')
logger = logging.getLogger('easyocr')


logger.info('Loading EasyOCR with languages:', LANG.split(','))
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

def log_error(message, error):
  sys.stderr.write(message)
  sys.stderr.write('\n')
  sys.stderr.write(str(error))
  sys.stderr.write('\n\n')
  sys.stderr.flush()

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
def stream_file(file_path: Path, stream):
  with open(file_path, "wb") as f:
    while True:
      chunk = stream.read(64 * 1024) # copy with 64kb chunks to improve performance
      if not chunk:
        break
      f.write(chunk)

@log_duration
def resize(input_path: Path, output_path: Path, max_size: int) -> Tuple[Path, int, int]:
  image = Image.thumbnail(str(input_path), max_size, height=max_size, size="down")
  image.write_to_file(str(output_path))
  input_path.unlink(missing_ok=True)
  return output_path, int(image.width), int(image.height)

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

@app.route("/readtext", methods=["POST"])
def readtext():
  if request.content_type == "image/png" or request.content_type == "image/jpeg":
      workers = request.args.get('workers', default=0, type=int)
      batch_size = request.args.get('batch_size', default=1, type=int)
      if batch_size < 1:
          return Response("Error: batch_size must be a positive integer", status=400)
      decoder = request.args.get('decoder', default='greedy', type=str)
      beam_width = request.args.get('beam_width', default=5, type=int)
      detail = request.args.get('detail', default=1, type=int)
      paragraph = request.args.get('paragraph', default='False', type=bool)
      min_size = request.args.get('min_size', default=10, type=int)
      rotation_info = request.args.get('rotation_info', default=None, type=str)
      max_size = request.args.get('max_size', default=MAX_SIZE, type=int)
      random_uuid = uuid.uuid4()
      extname = request.content_type.split('/')[1]
      file_path = tmp_path / f"upload-{random_uuid}.{extname}"

      if request.content_length and request.content_length > FILE_MAX_SIZE:
        log_error("File too large: ", f"{request.content_length} / {FILE_MAX_SIZE}")
        return Response(f"File too large, maximum size is {FILE_MAX_SIZE / 1024 / 1024:.1f}MB", status=413)

      try:
        stream_file(file_path, request.stream)
        new_file_path = tmp_path / f"resize-{random_uuid}.png"
        file_path, width, height = resize(file_path, new_file_path, max_size)

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
          try:
            output = { 'imageSize': { 'width': width, 'height': height }, 'results': results }
            return Response(json.dumps(output, default=json_serializer, ensure_ascii=False), 200)
          except Exception as e:
            log_error('Error parsing JSON output:', e)
            return Response('server error parsing results', status=500)
        except Exception as e:
          file_path.unlink(missing_ok=True)
          log_error('Error processing image:', e)
          return Response('Error processing image', status=500)
      except Exception as e:
        log_error('Error writting body:', e)
        return Response('error writing body', status=500)
  else:
    return Response('bad request body', status=400)

@app.route("/health", methods=["GET"])
def health():
  return Response('ok', 200)

@app.route("/health/liveness", methods=["GET"])
def health_liveness():
  return Response('ok', 200)

@app.route("/health/readiness", methods=["GET"])
def health_readiness():
  return Response('ok', 200)

if "gunicorn" not in environ.get("SERVER_SOFTWARE", "").lower():
  app.run(host='0.0.0.0', port=int(PORT), debug=True)
