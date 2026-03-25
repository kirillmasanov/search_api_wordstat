from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.routes.api import router as api_router

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Wordstat")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.include_router(api_router)

templates = Jinja2Templates(directory=BASE_DIR / "templates")


@app.get("/")
async def index():
    return RedirectResponse(url="/top")


@app.get("/top")
async def top_page(request: Request):
    return templates.TemplateResponse(request, "top.html")


@app.get("/dynamics")
async def dynamics_page(request: Request):
    return templates.TemplateResponse(request, "dynamics.html")


@app.get("/regions")
async def regions_page(request: Request):
    return templates.TemplateResponse(request, "regions.html")
