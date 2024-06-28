
import logging

from .settings import settings
from .text_models import TEXT_MODEL
from .inference import SVMDetector, Binoculars


logger = logging.getLogger(__name__)


def load_model(model_type, model_settings):
    if model_type == 'SVMDetector':
        logger.info(f"Loading model: {model_settings.MODEL_PATH}")
        model = SVMDetector.from_file(
            model_settings.MODEL_PATH,
            top_k=settings.SVM_DETECTOR__MAX_TOP_K,
            cue_percentile_cutoff=settings.SVM_DETECTOR__CUE_PERCENTILE_CUTOFF)
        logger.info(f"Loaded model: {model_settings.MODEL_PATH}")
    elif model_type == 'BINOCULARS':
        model = Binoculars()
    else:
        raise ValueError(f"Unknown MODEL_TYPE: {model_type}")

    return model


class ModelWrapper:
    def __init__(self) -> None:
        self.model = {}

    def load(self):
        for lang, lang_settings in settings.LANGUAGES.items():
            lang = lang.lower()
            if lang not in self.model:
                self.model[lang] = load_model(
                    lang_settings.MODEL_TYPE, lang_settings.MODEL_SETTINGS)

    def score(self, text, language=None):
        if language is None:
            language = TEXT_MODEL.detect_language(text)
        return {'language': language, 'score': self.model[language].score(text)}

    def score_sentences(self, text, language=None):
        if language is None:
            language = TEXT_MODEL.detect_language(text)
        sentences = TEXT_MODEL.segment_text(text)
        return {'language': language, 
                'score': self.model[language].score_sentences(sentences)}


MODEL = ModelWrapper()
