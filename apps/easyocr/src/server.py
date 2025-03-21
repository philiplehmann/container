import fileinput
import sys
import json
import easyocr

reader = easyocr.Reader(
  ['de', 'fr', 'it'],
  gpu=True,
  download_enabled=True,
  recog_network='standard',
  detector=True,
  recognizer=True
)

sys.stdout.reconfigure(encoding='utf-8')

def log_error(message, error):
  sys.stderr.write(message)
  sys.stderr.write('\n')
  sys.stderr.write(str(error))
  sys.stderr.write('\n\n')
  sys.stderr.flush()

for line in fileinput.input():
  try:
    args = json.loads(line)

    if 'file' in args.keys():
      try:
        print(f"Processing {args['file']}")
        results = reader.readtext(args['file'], output_format='json')
        try:
          object = json.loads('[' + ','.join(results) + ']')
          output = { 'file': args['file'], 'results': object }
          sys.stdout.write(json.dumps(output))
          sys.stdout.write('\n')
          sys.stdout.flush()
        except Exception as e:
          log_error('Error parsing JSON output:', e)
      except Exception as e:
        log_error('Error processing image:', e)
    else:
      raise Exception('No file provided {"file": "path/to/image"}\n')
  except Exception as e:
    log_error('Error parsing JSON input:', e)
