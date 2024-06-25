
import logging

import pysbd
from lingua import Language, LanguageDetectorBuilder

from .settings import settings


logger = logging.getLogger(__name__)


LINGUA_CODES = {Language.ENGLISH: 'en',
                Language.SPANISH: 'es',
                Language.GERMAN: 'de',
                Language.FRENCH: 'fr',
                Language.DUTCH: 'nl'}
CODES_LINGUA = {key: code for code, key in LINGUA_CODES.items()}


class UnknownLanguageException(Exception):
    pass

class UnsupportedLanguageException(Exception):
    pass


class TextModelWrapper:
    def __init__(self) -> None:
        # build lingua
        self.langdetect = None
        self.segmenters = {}

    def load(self):
        if len(self.segmenters) == 0:
            logger.info(f"Loading text models")
            langdetect_langs = []
            for language in settings.LANGUAGES:
                language = language.lower()
                langdetect_langs.append(CODES_LINGUA[language])
                self.segmenters[language] = pysbd.Segmenter(language=language, clean=False)        
            if settings.NEEDS_LANGUAGE_DETECTION:
                self.langdetect = LanguageDetectorBuilder.from_languages(*langdetect_langs).build()
            logger.info(f"Loaded text models")

    def detect_language(self, text):
        if settings.NEEDS_LANGUAGE_DETECTION:
            lang_code = self.langdetect.detect_language_of(text)
            if lang_code is None:
                raise UnknownLanguageException()
            elif LINGUA_CODES[lang_code].upper() not in settings.LANGUAGES:
                raise UnsupportedLanguageException({"language": lang_code})
            return LINGUA_CODES[lang_code]
        else:
            return next(iter(settings.LANGUAGES.keys()))

    def segment_text(self, text):
        lang = self.detect_language(text)
        return self.segmenters[lang].segment(text)


TEXT_MODEL = TextModelWrapper()