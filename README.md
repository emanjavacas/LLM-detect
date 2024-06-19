# LLM-detect

Simple web-app to serve LLM-detect.

## Quickstart

We'll need `python3.10` to run _LLM-detect_. Once you clone the repository, make sure `python3.10` is running on this folder. You can do this with `pyenv`, `conda` for convenience.

### Installation
Now, just follow through the next series of steps:

1. Create a virtual environment
   1. `python -m venv venv`
   2. `source venv/bin/activate` (make sure you run this command every time you navigate to this folder)
2. Install package
   1. `pip install poetry`
   2. `poetry install`

### Running

From the root, just run `python app.py`, and navigate to [http://0.0.0.0:5050/](http://0.0.0.0:5050/).

The upload file service lives in the index: [http://0.0.0.0:5050/](http://0.0.0.0:5050/).
Two `gradio` visualizations can be accessed through:
- [http://0.0.0.0:5050/gradio/highlight](http://0.0.0.0:5050/gradio/highlight)
- [http://0.0.0.0:5050/gradio/simple](http://0.0.0.0:5050/gradio/simple)

### Configuration

App configuration lives in `settings.toml`.

Logging configuration lives in `settings_logger.toml`.