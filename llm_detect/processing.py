
import logging
import asyncio
import io

import pandas as pd

from llm_detect.text_models import UnknownLanguageException, UnsupportedLanguageException
from llm_detect.settings import Status
from llm_detect.models import MODEL

logger = logging.getLogger(__name__)


async def run_in_process(executor, fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, fn, *args, **kwargs)


class ValidationException(Exception):
    pass


def validate_file(file_data):
    try:
        data = pd.read_csv(io.StringIO(file_data.decode()), sep=None)
        if len(data) == 0:
            raise ValidationException({"status": Status.EMPTYFILE})
        if "text" not in data:
            raise ValidationException({"status": Status.MISSINGKEY})
        return data
    except UnicodeDecodeError:
        raise ValidationException({"status": Status.UNKNOWNFORMAT})


async def process_data(file_data):
    # validation
    file_data = validate_file(file_data)
    # prediction
    output = []
    for row_id, row in file_data.iterrows():
        row = row.to_dict()
        try:
            payload = MODEL.score(row['text'])
            row['score'] = payload['score']
            row['language'] = payload['language']
        except UnsupportedLanguageException as e:
            logger.info(f"Detected unsupported language: {e.args[0]['language']} at line {row_id}")
            row['score'] = None
            row['language'] = None
        except UnknownLanguageException:
            logger.info(f"Unknown language at line {row_id}")
            row['score'] = None
            row['language'] = None
        output.append(row)
    # post-processing
    output = pd.DataFrame.from_dict(output).to_csv(index=None)
    return output
