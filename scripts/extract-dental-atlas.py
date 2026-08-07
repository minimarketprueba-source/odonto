"""Extrae las piezas del atlas dental como PNG transparentes independientes."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "public" / "odontograma" / "tooth-atlas-fdi.png"
OUTPUT = ROOT / "public" / "odontograma" / "piezas"
CANVAS_SIZE = (256, 384)
PADDING = 14


def extract_cell(
    atlas: Image.Image,
    row: int,
    column: int,
    columns: int,
    *,
    rotate: bool = False,
) -> Image.Image:
    """Recorta una celda, elimina el espacio vacío y la centra en un lienzo común."""
    width, height = atlas.size
    row_top = round(row * height / 3)
    row_bottom = round((row + 1) * height / 3)
    left = round(column * width / columns)
    right = round((column + 1) * width / columns)

    piece = atlas.crop((left, row_top, right, row_bottom))
    alpha_box = piece.getchannel("A").getbbox()
    if alpha_box is None:
        raise RuntimeError(f"La celda {row}:{column} no contiene una pieza")

    piece = piece.crop(alpha_box)
    if rotate:
        piece = piece.rotate(180, expand=True)

    max_width = CANVAS_SIZE[0] - PADDING * 2
    max_height = CANVAS_SIZE[1] - PADDING * 2
    scale = min(max_width / piece.width, max_height / piece.height)
    resized = piece.resize(
        (max(1, round(piece.width * scale)), max(1, round(piece.height * scale))),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    x = (CANVAS_SIZE[0] - resized.width) // 2
    y = (CANVAS_SIZE[1] - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def main() -> None:
    atlas = Image.open(ATLAS).convert("RGBA")
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for position in range(1, 9):
        extract_cell(atlas, 0, position - 1, 8).save(
            OUTPUT / f"permanent-upper-{position}.png", optimize=True
        )
        extract_cell(atlas, 1, position - 1, 8).save(
            OUTPUT / f"permanent-lower-{position}.png", optimize=True
        )

    for position in range(1, 6):
        extract_cell(atlas, 2, position - 1, 10, rotate=True).save(
            OUTPUT / f"primary-upper-{position}.png", optimize=True
        )
        extract_cell(atlas, 2, position + 4, 10).save(
            OUTPUT / f"primary-lower-{position}.png", optimize=True
        )

    print(f"Se generaron {len(list(OUTPUT.glob('*.png')))} piezas en {OUTPUT}")


if __name__ == "__main__":
    main()
