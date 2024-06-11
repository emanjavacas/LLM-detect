
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PORT: int
    SVM_BASELINE_PATH: str
    COEF_MAX_TOP_K: int
    model_config = SettingsConfigDict(env_file="settings.toml")


settings = Settings()
