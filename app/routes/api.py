from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from app.wordstat_client import wordstat_client

router = APIRouter(prefix="/api")


class TopRequest(BaseModel):
    phrase: str
    num_phrases: int = 50
    regions: list[str] | None = None
    devices: list[str] | None = None


class DynamicsRequest(BaseModel):
    phrase: str
    period: str
    from_date: str
    to_date: str | None = None
    regions: list[str] | None = None
    devices: list[str] | None = None


class RegionsRequest(BaseModel):
    phrase: str
    region_type: str | None = None
    devices: list[str] | None = None


@router.post("/top")
async def get_top(req: TopRequest):
    try:
        return await wordstat_client.get_top(
            phrase=req.phrase,
            num_phrases=req.num_phrases,
            regions=req.regions,
            devices=req.devices,
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@router.post("/dynamics")
async def get_dynamics(req: DynamicsRequest):
    try:
        return await wordstat_client.get_dynamics(
            phrase=req.phrase,
            period=req.period,
            from_date=req.from_date,
            to_date=req.to_date,
            regions=req.regions,
            devices=req.devices,
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@router.post("/regions")
async def get_regions(req: RegionsRequest):
    try:
        return await wordstat_client.get_regions(
            phrase=req.phrase,
            region_type=req.region_type,
            devices=req.devices,
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@router.get("/regions-tree")
async def get_regions_tree():
    try:
        return await wordstat_client.get_regions_tree()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
