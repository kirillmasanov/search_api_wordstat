from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    yandex_api_key: str
    yandex_folder_id: str

    model_config = {"env_file": ".env"}


settings = Settings()
