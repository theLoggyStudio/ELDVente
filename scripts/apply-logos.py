# -*- coding: utf-8 -*-
"""Applique les logos trouves (Wikimedia + favicons officiels) aux article.json."""
import json
from pathlib import Path

WM_COMMONS = "https://upload.wikimedia.org/wikipedia/commons"
WM_EN = "https://upload.wikimedia.org/wikipedia/en"


def favicon(domain: str) -> str:
    return (
        "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON"
        f"&fallback_opts=TYPE,SIZE,URL&url=https://{domain}&size=128"
    )


LOGOS: dict[str, str] = {
    # --- Logos officiels via Wikimedia ---
    "3ds Max": f"{WM_COMMONS}/b/ba/Autodesk_3ds_Max_Logo.svg",
    "Revit": f"{WM_COMMONS}/c/c6/Autodesk_Revit_Logo.svg",
    "AutoCAD Electrical": f"{WM_COMMONS}/d/db/Autodesk_AutoCAD_Logo.svg",
    "AutoCAD Mechanical": f"{WM_COMMONS}/d/db/Autodesk_AutoCAD_Logo.svg",
    "AutoCAD Structural Detailing": f"{WM_COMMONS}/d/db/Autodesk_AutoCAD_Logo.svg",
    "ArchiCAD": f"{WM_COMMONS}/3/32/Graphisoft_Archicad_Logo.svg",
    "Allplan": f"{WM_COMMONS}/0/0a/Allplan_Logo.png",
    "Cadwork": f"{WM_COMMONS}/a/ae/Cadwork_logo.jpg",
    "Cinema 4D": f"{WM_COMMONS}/0/04/Cinema_4D_Logo_2026.svg",
    "CSI Bridge": f"{WM_EN}/8/83/Fair_use_image_of_CSI_circular_logo.PNG",
    "EPLAN Electric P8": f"{WM_COMMONS}/7/76/Eplan-logo.svg",
    "Office et MS Project": f"{WM_EN}/3/35/Microsoft_Office_Logo_%282019-present%29.svg",
    "PDF Creator": f"{WM_COMMONS}/0/08/PDFCreator_logo.svg",
    "Rhino": f"{WM_EN}/d/d0/Rhinoceros3d-logo.png",
    "SketchUp": f"{WM_COMMONS}/b/ba/Brand_Wordmark_for_SketchUp.png",
    "SolidWorks": f"{WM_COMMONS}/b/bf/SOLIDWORKS_Logo.svg",
    "Tekla Structures": f"{WM_COMMONS}/8/81/Tekla_Structures_Logo_2026.svg",
    "V-Ray": f"{WM_COMMONS}/5/55/V-Ray_Logo_1.jpg",
    # --- Icones officielles des sites editeurs ---
    "Lumion": favicon("lumion.com"),
    "Twinmotion": favicon("twinmotion.com"),
    "Global Mapper": favicon("bluemarblegeo.com"),
    "Graitec OMD": favicon("graitec.com"),
    "PVsyst": favicon("pvsyst.com"),
    "ETAP": favicon("etap.com"),
    "DIgSILENT PowerFactory": favicon("digsilent.de"),
    "Artlantis": favicon("artlantis.com"),
    "Homer Pro": favicon("homerenergy.com"),
    "ProNest": favicon("hypertherm.com"),
    "CYPE": favicon("cype.com"),
    "CYPECAD": favicon("cype.com"),
    "Covadis": favicon("geo-media.com"),
    "Mensura": favicon("geomensura.com"),
    "AutoFLUID": favicon("autofluid.fr"),
    "Schemaplic": favicon("schemaplic.fr"),
    "Alizé LPC": favicon("alize-lpc.com"),
    "Qoter Plan": favicon("quoterplan.com"),
}

FILES = [
    Path(r"D:\projet\ELD\ELDVente\src\constants\json\article.json"),
    Path(r"D:\projet\ELD\ELDBack\src\constants\json\article.json"),
]

for path in FILES:
    data = json.loads(path.read_text(encoding="utf-8"))
    updated = 0
    untouched: set[str] = set()
    for article in data:
        nom = article.get("nom", "")
        if nom in LOGOS:
            if (article.get("urlImage") or "").strip() != LOGOS[nom]:
                article["urlImage"] = LOGOS[nom]
                updated += 1
        elif not (article.get("urlImage") or "").strip():
            untouched.add(nom)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{path.name} ({path.parent.parent.parent.name}): {updated} logos appliques")
    if untouched:
        print("  Restent sur le logo par defaut:", ", ".join(sorted(untouched)))
