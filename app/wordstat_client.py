import httpx

from app.config import settings

BASE_URL = "https://searchapi.api.cloud.yandex.net/v2/wordstat"


class WordstatClient:
    def __init__(self):
        self.headers = {
            "Authorization": f"Api-Key {settings.yandex_api_key}",
            "Content-Type": "application/json",
        }
        self.folder_id = settings.yandex_folder_id

    async def _post(self, path: str, body: dict) -> dict:
        body["folderId"] = self.folder_id
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{BASE_URL}/{path}",
                json=body,
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_top(
        self,
        phrase: str,
        num_phrases: int = 50,
        regions: list[str] | None = None,
        devices: list[str] | None = None,
    ) -> dict:
        body: dict = {"phrase": phrase, "numPhrases": num_phrases}
        if regions:
            body["regions"] = regions
        if devices:
            body["devices"] = devices
        return await self._post("topRequests", body)

    async def get_dynamics(
        self,
        phrase: str,
        period: str,
        from_date: str,
        to_date: str | None = None,
        regions: list[str] | None = None,
        devices: list[str] | None = None,
    ) -> dict:
        body: dict = {"phrase": phrase, "period": period, "fromDate": from_date}
        if to_date:
            body["toDate"] = to_date
        if regions:
            body["regions"] = regions
        if devices:
            body["devices"] = devices
        return await self._post("dynamics", body)

    async def get_regions(
        self,
        phrase: str,
        region_type: str | None = None,
        devices: list[str] | None = None,
    ) -> dict:
        body: dict = {"phrase": phrase}
        if region_type:
            body["region"] = region_type
        if devices:
            body["devices"] = devices
        return await self._post("regions", body)

    async def get_regions_tree(self) -> dict:
        return await self._post("getRegionsTree", {})


wordstat_client = WordstatClient()
