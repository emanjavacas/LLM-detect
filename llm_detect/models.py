
import logging

from .settings import settings
from .text_models import TEXT_MODEL
from .inference import SVMDetector, Binoculars


logger = logging.getLogger(__name__)


def load_model(language_settings):
    if language_settings.MODEL_TYPE == 'SVMDetector':
        logger.info(f"Loading model: {language_settings.MODEL_PATH}")
        model = SVMDetector.from_file(
            language_settings.MODEL_PATH,
            top_k=settings.SVM_BASELINE__MAX_TOP_K,
            cue_percentile_cutoff=settings.SVM_BASELINE__CUE_PERCENTILE_CUTOFF)
        logger.info(f"Loaded model: {language_settings.MODEL_PATH}")
    elif language_settings.MODEL_TYPE == 'BINOCULARS':
        pass
    else:
        raise ValueError(f"Unknown MODEL_TYPE: {language_settings.MODEL_TYPE}")

    return model


class ModelWrapper:
    def __init__(self) -> None:
        self.model = {}

    def load(self):
        for lang, lang_settings in settings.LANGUAGES.items():
            lang = lang.lower()
            if lang not in self.model:
                self.model[lang] = load_model(lang_settings)

    def score(self, text):
        return self.model[TEXT_MODEL.detect_language(text)].score(text)
    
    def score_sentences(self, text):
        return self.model[TEXT_MODEL.detect_language(text)].score_sentences(text)


MODEL = ModelWrapper()