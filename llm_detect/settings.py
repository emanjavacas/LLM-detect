
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_settings import PydanticBaseSettingsSource, TomlConfigSettingsSource
from pydantic import Field
from typing import Type, Tuple, List


STATUSES = {
    'UPLOADING': 'Uploading...',
    'PROCESSING': 'Processing...',
    'READY': 'Ready to download!',
    'UNKNOWNERROR': 'Unknown error',
    'UNKNOWNFORMAT': 'Unknown input format',
    'EMPTYFILE': 'Empty input file'
}


class Settings(BaseSettings):
    # Interface
    PORT: int = Field(default=5050, description="Field to run the app.")
    # Detection system
    MODEL_TYPE: str = Field(description="Detection model type")
    SVM_BASELINE_PATH: str = Field(description="Path to trained SVM model")
    SVM_BASELINE_MAX_TOP_K: int = Field(description="whatever")
    # Visualization
    CUE_PERCENTILE_CUTOFF : float = Field(
        description="A float in the (0, 1) range defining the percentile cutoff for cue words.")
    # Processing
    BATCH_SIZE: int = Field(description="Number of documents in batch")
    LANGUAGES: List[str] = Field(description="Languages to load detectors for.")

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