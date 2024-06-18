
import pysbd
from lingua import Language, LanguageDetectorBuilder

from .settings import settings


LINGUA_CODES = {Language.ENGLISH: 'en',
                Language.SPANISH: 'es',
                Language.GERMAN: 'de',
                Language.FRENCH: 'fr',
                Language.DUTCH: 'nl'}
CODES_LINGUA = {key: code for code, key in LINGUA_CODES.items()}

SEGMENTER = {}
LANGDETECT = LanguageDetectorBuilder.from_languages(
    *[CODES_LINGUA[lang] for lang in settings.LANGUAGES]
).build()


def segment_text_(text, lang):
    if lang not in SEGMENTER:
        SEGMENTER[lang] = pysbd.Segmenter(language=lang, clean=False)

    return SEGMENTER[lang].segment(text)


def segment_text(text):
    lang_code = LANGDETECT.detect_language_of(text)
    return segment_text_(text, LINGUA_CODES[lang_code])
