import sys
import json
import uuid
from pathlib import Path
from os import environ
import time
from typing import Tuple

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
FILE_MAX_SIZE = int(environ.get('EASYOCR_FILE_MAX_SIZE', '10485760')) # 10MB

app = Flask('easyocr')

print('Loading EasyOCR with languages:', LANG.split(','))
reader = Reader(
  LANG.split(','),
  gpu=GPU,
  download_enabled=False,
  recog_network='standard',
  detector=DETECTOR,
  recognizer=RECOGNIZER,
  model_storage_directory=str(Path.cwd() / 'model'),
  user_network_directory=str(Path.cwd() / 'model' / 'user_network'),
)

sys.stdout.reconfigure(encoding='utf-8')

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
    print(f"{func.__name__}  Execution time: {duration_ms:.2f} ms")
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
def resize(input_path: Path, output_path: Path) -> Tuple[Path, int, int]:
  image = Image.new_from_file(str(input_path), access="sequential")
  width = image.width
  height = image.height
  if width > MAX_SIZE or height > MAX_SIZE:
    scale = MAX_SIZE / max(width, height)
    print(f"Resizing image {width}x{height} to {width*scale:.0f}x{height*scale:.0f}")
    new_image = image.resize(scale)
    new_image.write_to_file(str(output_path))
    input_path.unlink(missing_ok=True)
    return output_path, int(width*scale), int(height*scale)

  return input_path, width, height

def json_serializer(obj):
    if isinstance(obj, int64):
        return int(obj)
    raise TypeError(f"Type {type(obj)} is not JSON serializable")

@log_duration
def easyocr_readtext(file_path):
  print(f"Processing {file_path}")
  results = reader.readtext(str(file_path), output_format='dict')
  return results

@app.route("/readtext", methods=["POST"])
def readtext():
  if request.content_type == "image/png" or request.content_type == "image/jpeg":
      random_uuid = uuid.uuid4()
      extname = request.content_type.split('/')[1]
      file_path = tmp_path / f"upload-{random_uuid}.{extname}"

      if request.content_length and request.content_length > FILE_MAX_SIZE:
        return Response(f"File too large, maximum size is {FILE_MAX_SIZE / 1024 / 1024:.1f}MB", status=413)

      try:
        stream_file(file_path, request.stream)
        new_file_path = tmp_path / f"resize-{random_uuid}.{extname}"
        file_path, width, height = resize(file_path, new_file_path)

        try:
          results = easyocr_readtext(file_path)
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


if "gunicorn" not in environ.get("SERVER_SOFTWARE", "").lower():
  app.run(host='0.0.0.0', port=int(PORT), debug=True)
