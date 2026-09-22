from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

out_dir = Path(__file__).resolve().parent / 'images'
out_dir.mkdir(exist_ok=True)


def add_glow(draw, cx, cy, radius, color, alpha=120):
    glow = Image.new('RGBA', (radius * 4, radius * 4), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((0, 0, glow.width, glow.height), outline=color + (alpha,), width=max(2, radius // 3))
    glow = glow.filter(ImageFilter.GaussianBlur(radius // 3))
    return glow


def create_tower_sprite(filename, base_color, highlight_color, accent_color):
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # shadow
    d.ellipse((10, 46, 54, 60), fill=(0, 0, 0, 70))

    # base ring
    d.ellipse((12, 18, 52, 52), fill=base_color)
    d.ellipse((16, 22, 48, 48), fill=highlight_color)

    # turret body
    d.rounded_rectangle((22, 10, 42, 38), radius=10, fill=accent_color)
    d.rounded_rectangle((19, 15, 45, 22), radius=7, fill=(255, 255, 255, 80))

    # top barrel / crystal
    d.ellipse((28, 4, 36, 12), fill=(255, 255, 255, 180))
    d.rectangle((29, 8, 35, 28), fill=accent_color)

    img.save(out_dir / filename)


def create_enemy_sprite(filename, body_color, eye_color):
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    d.ellipse((10, 14, 54, 58), fill=body_color)
    d.ellipse((20, 22, 28, 30), fill=eye_color)
    d.ellipse((36, 22, 44, 30), fill=eye_color)
    d.polygon([(26, 42), (32, 34), (38, 42)], fill=(40, 18, 18, 220))
    d.rectangle((18, 46, 46, 50), fill=(80, 0, 0, 130))

    # shadow
    d.ellipse((12, 52, 52, 60), fill=(0, 0, 0, 80))
    img.save(out_dir / filename)


def create_base_sprite(filename):
    img = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # grass base glow
    d.ellipse((10, 10, 86, 86), fill=(90, 220, 130, 180))
    d.ellipse((18, 18, 78, 78), fill=(52, 164, 102, 220))
    d.ellipse((24, 24, 72, 72), fill=(90, 220, 130, 220))

    # keep / tower cap
    d.rounded_rectangle((32, 18, 64, 40), radius=10, fill=(110, 80, 45, 220))
    d.polygon([(40, 18), (58, 18), (56, 5), (42, 5)], fill=(245, 213, 120, 220))
    d.rectangle((47, 18, 50, 40), fill=(255, 255, 255, 170))

    # shadow
    d.ellipse((16, 74, 80, 90), fill=(0, 0, 0, 90))

    img.save(out_dir / filename)


def create_projectile_sprite(filename, color):
    img = Image.new('RGBA', (18, 18), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((2, 2, 16, 16), fill=color)
    d.ellipse((5, 5, 13, 13), fill=(255, 255, 255, 200))
    img.save(out_dir / filename)


create_tower_sprite('tower_guard.png', (56, 46, 50, 255), (79, 62, 62, 255), (247, 201, 105, 255))
create_tower_sprite('tower_flame.png', (56, 46, 50, 255), (83, 63, 47, 255), (255, 123, 84, 255))
create_tower_sprite('tower_frost.png', (56, 46, 50, 255), (62, 82, 108, 255), (127, 224, 255, 255))
create_enemy_sprite('enemy.png', (210, 76, 92, 255), (255, 240, 240, 255))
create_base_sprite('base.png')
create_projectile_sprite('projectile_guard.png', (247, 201, 105, 255))
create_projectile_sprite('projectile_flame.png', (255, 123, 84, 255))
create_projectile_sprite('projectile_frost.png', (127, 224, 255, 255))

print('Generated sprite files in:', out_dir)
