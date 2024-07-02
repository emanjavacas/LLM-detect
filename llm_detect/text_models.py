
import logging

import pysbd
from lingua import Language, LanguageDetectorBuilder, IsoCode639_1

from .settings import settings


logger = logging.getLogger(__name__)


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
            logger.info(f"Loading text models...")
            langdetect_langs = []
            for language in settings.LANGUAGES:
                language = language.lower()
                langdetect_langs.append(get_language_from_code(language))
                self.segmenters[language] = pysbd.Segmenter(language=language, clean=False)        
            if settings.NEEDS_LANGUAGE_DETECTION:
                self.langdetect = LanguageDetectorBuilder.from_languages(*langdetect_langs).build()
            logger.info(f"...Loaded text models")

    def detect_language(self, text):
        if settings.NEEDS_LANGUAGE_DETECTION:
            lang = self.langdetect.detect_language_of(text)
            if lang is None:
                raise UnknownLanguageException()
            lang = lang.iso_code_639_1.name.lower()
            if lang.upper() not in settings.LANGUAGES:
                raise UnsupportedLanguageException({"language": lang})
            return lang
        else:
            return settings.DEFAULT_LANGUAGE.lower()

    def segment_text(self, text):
        lang = self.detect_language(text)
        return self.segmenters[lang].segment(text)


def get_language_from_code(code):
    return Language.from_iso_code_639_1(getattr(IsoCode639_1, code.upper()))


TEXT_MODEL = TextModelWrapper()