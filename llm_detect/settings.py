
from typing import Type, Tuple, Dict
import logging.config

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_settings import PydanticBaseSettingsSource, TomlConfigSettingsSource
from pydantic import BaseModel, Field

import toml


def setup_logger(path='settings_logger.toml'):
    with open(path) as f:
        config = toml.load(f)
        logging.config.dictConfig(config)


class STATUS:
    UPLOADING = 'Uploading...'
    PROCESSING = 'Processing...'
    READY = 'Ready to download!'
    UNKNOWNERROR = 'Unknown error'
    UNKNOWNFORMAT = 'Unknown input format'
    EMPTYFILE = 'Empty input file'

    @classmethod
    def __get_classes__(cls):
        return {key: getattr(cls, key) for key in vars(cls).keys() if not key.startswith('__')}
    

class LanguageSettings(BaseModel):
    MODEL_TYPE: str = Field(description="Detection model type")
    MODEL_PATH: str = Field(description="Path to the model")


class Settings(BaseSettings):
    # Interface
    PORT: int = Field(default=5050, description="Field to run the app.")
    # SVM arguments
    SVM_BASELINE__MAX_TOP_K: int = Field(description="Only use max top k coefficients")
    SVM_BASELINE__CUE_PERCENTILE_CUTOFF : float = Field(
        description="A float in the (0, 1) range defining the percentile cutoff for cue words")
    # BINOCULARS
    ## ... TODO
    # Processing
    BATCH_SIZE: int = Field(description="Number of documents in batch")
    LANGUAGES: Dict[str, LanguageSettings] = Field(description="Languages to load detectors")
    NEEDS_LANGUAGE_DETECTION: bool = Field(default=True)

    model_config = SettingsConfigDict(toml_file="settings.toml")

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: Type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        return (TomlConfigSettingsSource(settings_cls),)


settings = Settings()
if len(settings.LANGUAGES) == 1:
    settings.NEEDS_LANGUAGE_DETECTION = False
