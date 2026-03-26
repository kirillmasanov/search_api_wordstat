from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    yandex_api_key: str
    yandex_folder_id: str
    root_path: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
