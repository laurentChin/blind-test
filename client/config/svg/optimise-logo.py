#!/usr/bin/env python3
"""Shrink a Figma logo export without moving a pixel of it.

    python3 config/svg/optimise-logo.py src/design-system/LogoApp/assets/app.svg
    python3 config/svg/optimise-logo.py \
        src/design-system/LogoAppLockup/assets/app-lockup.svg --wordmark-below 145

Run it on a fresh export: Figma writes the dot grid as 441 separate circles
every time, so a re-export undoes what this does. Needs `npx` (it shells out to
`svgo`), nothing installed.

Three steps:

1. the uniform 21x21 dot lattice becomes one tiled <pattern>. The dots never
   overlap, so blending the tiled rect once paints the same pixels as blending
   each circle against the same backdrop — and it is where most of the weight
   goes;
2. `svgo-tidy.mjs` removes cruft and shortens numbers, with every geometric
   plugin turned off;
3. `svgo-paths.mjs` rewrites path data, on the long paths only, and never on
   the wordmark: `--wordmark-below` is the y below which a path is a letter.

Verified by rasterising before and after in headless Chrome at four times the
design size and comparing channel by channel: no pixel off by more than 13/255,
all of them anti-aliasing fringe, none visible at any size the logo is used at.
Redo that comparison if you change the parameters.
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
CIRCLE_RE = re.compile(r"<circle[^>]*/>")
PATH_D_RE = re.compile(r'<path[^>]*\sd="([^"]*)"[^>]*/?>')
ATTR_RE = re.compile(r'(\w[\w-]*)="([^"]*)"')
COORD_RE = re.compile(r"-?\d+(?:\.\d+)?")

# A path shorter than this is a plate or a corner: rewriting it saves nothing.
MIN_PATH_DATA = 400


def attrs(tag):
    return dict(ATTR_RE.findall(tag))


def shortest(value):
    return f"{value:.5f}".rstrip("0").rstrip(".")


def run_svgo(svg, config, tmp):
    tmp.write_text(svg)
    subprocess.run(
        ["npx", "--yes", "svgo@3", "--config", str(config), "-i", str(tmp), "-o", str(tmp)],
        check=True,
        capture_output=True,
    )
    out = tmp.read_text()
    tmp.unlink()
    return out


def grid_to_pattern(svg, pattern_id="dots"):
    """Replace the uniform dot lattice with one tiled <pattern>."""
    tiles = [(m, attrs(m.group(0))) for m in CIRCLE_RE.finditer(svg)]
    grid = [(m, a) for m, a in tiles if a.get("fill-opacity") == "0.2"]
    if not grid:
        return svg, 0
    if f'id="{pattern_id}"' in svg:
        return svg, 0  # already done

    start, end = grid[0][0].start(), grid[-1][0].end()
    drawn = "".join(m.group(0) for m, _ in grid)
    if svg[start:end].replace("\n", "") != drawn:
        raise SystemExit("the dot grid is not one contiguous run — check the export")

    xs = sorted({float(a["cx"]) for _, a in grid})
    ys = sorted({float(a["cy"]) for _, a in grid})
    if len(xs) * len(ys) != len(grid):
        raise SystemExit("the dots are not a complete lattice — check the export")
    radius = float(grid[0][1]["r"])

    # One step averaged over the run, so the export's per-dot rounding does not
    # accumulate into a drift across the image.
    step = ((xs[-1] - xs[0]) / (len(xs) - 1) + (ys[-1] - ys[0]) / (len(ys) - 1)) / 2
    view = re.search(r'viewBox="([^"]*)"', svg).group(1).split()

    pattern = (
        f'<pattern id="{pattern_id}" patternUnits="userSpaceOnUse" '
        f'x="{shortest(xs[0] - step / 2)}" y="{shortest(ys[0] - step / 2)}" '
        f'width="{shortest(step)}" height="{shortest(step)}">'
        f'<circle cx="{shortest(step / 2)}" cy="{shortest(step / 2)}" '
        f'r="{shortest(radius)}" fill="white" fill-opacity="0.2"/>'
        f"</pattern>"
    )
    rect = (
        f'<rect width="{view[2]}" height="{view[3]}" fill="url(#{pattern_id})" '
        f'style="mix-blend-mode:overlay"/>'
    )
    svg = svg[:start] + rect + svg[end:]
    return svg.replace("<defs>", "<defs>" + pattern, 1), len(grid)


def lowest_y(path_data):
    numbers = [float(n) for n in COORD_RE.findall(path_data)]
    return min(numbers[1::2] or [0])


def optimise_paths(svg, wordmark_below, scratch):
    picked = [
        m
        for m in PATH_D_RE.finditer(svg)
        if len(m.group(1)) >= MIN_PATH_DATA
        and not (wordmark_below is not None and lowest_y(m.group(1)) >= wordmark_below)
    ]
    if not picked:
        return svg, 0

    view = re.search(r'viewBox="([^"]*)"', svg).group(1)
    bundle = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">'
        + "".join(f'<path d="{m.group(1)}"/>' for m in picked)
        + "</svg>"
    )
    optimised = PATH_D_RE.findall(
        run_svgo(bundle, HERE / "svgo-paths.mjs", scratch / "_paths.svg")
    )
    if len(optimised) != len(picked):
        raise SystemExit("svgo changed the number of paths — refusing to splice")

    # Back to front, so earlier offsets stay valid.
    for match, data in sorted(zip(picked, optimised), key=lambda pair: -pair[0].start()):
        svg = svg[: match.start(1)] + data + svg[match.end(1) :]
    return svg, len(picked)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("svg", type=Path)
    parser.add_argument(
        "--wordmark-below",
        type=float,
        default=None,
        metavar="Y",
        help="y above which a path is a letter of the wordmark and is left alone",
    )
    args = parser.parse_args()

    before = args.svg.read_bytes()
    svg = before.decode()

    svg, dots = grid_to_pattern(svg)
    svg = run_svgo(svg, HERE / "svgo-tidy.mjs", args.svg.parent / "_tidy.svg")
    svg, paths = optimise_paths(svg, args.wordmark_below, args.svg.parent)

    args.svg.write_text(svg)
    after = args.svg.stat().st_size
    print(
        f"{args.svg.name}: {len(before)} -> {after} bytes "
        f"({100 * after / len(before):.1f}%), {dots} dots tiled, "
        f"{paths} path(s) rewritten"
    )


if __name__ == "__main__":
    sys.exit(main())
