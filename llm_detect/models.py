
from .settings import settings
from .svm_baseline import SVMDetector


async def load_model():
    if settings.MODEL_TYPE == 'SVMDetector':
        model = await SVMDetector.from_file(
            settings.SVM_BASELINE_PATH, 
            top_k=settings.SVM_BASELINE__MAX_TOP_K, 
            use_cue_words=settings.USE_CUE_WORDS, 
            normalize=not settings.USE_CUE_WORDS,
            cue_percentile_cutoff=settings.CUE_PERCENTILE_CUTOFF)
    else:
        raise ValueError("Unknown MODEL_TYPE: {}".format(settings.MODEL_TYPE))

    return model