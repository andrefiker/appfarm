"""Render the existing Quiet Solitaire icon as a Windows ICO."""
from PIL import Image, ImageDraw
import math
from pathlib import Path

scale = 4
canvas = Image.new('RGBA', (128 * scale, 128 * scale), (0, 0, 0, 0))
draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((0, 0, 128 * scale, 128 * scale), radius=28 * scale, fill='#17372f')
card = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
d = ImageDraw.Draw(card)
d.rounded_rectangle((26 * scale, 17 * scale, 102 * scale, 113 * scale), radius=8 * scale, fill='#f5f1e7')
card = card.rotate(-8, resample=Image.Resampling.BICUBIC, center=(64 * scale, 65 * scale))
canvas.alpha_composite(card)
draw = ImageDraw.Draw(canvas)

def curve(a, b, c, d, steps=20):
    for i in range(steps + 1):
        t = i / steps
        yield tuple((1-t)**3*a[j] + 3*(1-t)**2*t*b[j] + 3*(1-t)*t*t*c[j] + t**3*d[j] for j in range(2))

heart = [(65, 43)]
heart += list(curve((65,43),(60,29),(41,34),(44,48)))
heart += list(curve((44,48),(46,57),(58,65),(65,73)))
heart += list(curve((65,73),(72,65),(84,57),(86,48)))
heart += list(curve((86,48),(89,34),(70,29),(65,43)))
draw.polygon([(round(x*scale), round(y*scale)) for x,y in heart], fill='#a33432')
draw.line((45*scale, 88*scale, 83*scale, 88*scale), fill='#d0b17a', width=4*scale)
canvas.save(Path(__file__).with_name('icon.ico'), sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
