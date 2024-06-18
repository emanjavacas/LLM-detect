
import logging

from .settings import settings
from .svm_baseline import SVMDetector

logger = logging.getLogger(__name__)
logging.basicConfig(
    format='%(asctime)s %(levelname)-8s %(message)s',
    level=logging.DEBUG,
    datefmt='%Y-%m-%d %H:%M:%S')


def load_model():
    if settings.MODEL_TYPE == 'SVMDetector':
        logger.info(f"Loading model: {settings.SVM_BASELINE_PATH}")
        model = SVMDetector.from_file(
            settings.SVM_BASELINE_PATH, 
            top_k=settings.SVM_BASELINE_MAX_TOP_K,
            cue_percentile_cutoff=settings.CUE_PERCENTILE_CUTOFF)
        logger.info(f"Loaded model: {settings.SVM_BASELINE_PATH}")
    else:
        raise ValueError("Unknown MODEL_TYPE: {}".format(settings.MODEL_TYPE))

    return model


class ModelWrapper:
    def __init__(self) -> None:
        self.model = None

    def load(self):
        if self.model is None:
            self.model = load_model()


MODEL = ModelWrapper()