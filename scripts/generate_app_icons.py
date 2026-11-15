import os
from PIL import Image, ImageDraw, ImageFilter

def create_roombites_icon(size=1024, is_foreground_only=False, is_round=False):
    # Base canvas
    if is_foreground_only:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    else:
        img = Image.new('RGBA', (size, size), (11, 15, 25, 255))
    
    draw = ImageDraw.Draw(img)
    scale = size / 1024.0

    if not is_foreground_only:
        # Background: subtle midnight radial glow
        center_x, center_y = size / 2, size / 2
        glow_radius = int(450 * scale)
        for r in range(glow_radius, 0, -10):
            alpha = int(40 * (1 - r / glow_radius))
            bbox = [center_x - r, center_y - r, center_x + r, center_y + r]
            draw.ellipse(bbox, fill=(245, 158, 11, alpha))

        # Soft border squircle / circle
        if is_round:
            mask = Image.new('L', (size, size), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.ellipse([int(16 * scale), int(16 * scale), int((1024 - 16) * scale), int((1024 - 16) * scale)], fill=255)
            # Subtle amber rim
            draw.ellipse([int(16 * scale), int(16 * scale), int((1024 - 16) * scale), int((1024 - 16) * scale)], outline=(245, 158, 11, 70), width=int(12 * scale))

    # Icon coordinates (centered in 1024 canvas)
    # If foreground_only, scale down to 65% so it fits within Android adaptive icon circle safe-zone
    s = scale * (0.68 if is_foreground_only else 0.88)
    ox = (size - 1024 * s) / 2
    oy = (size - 1024 * s) / 2 + (40 * s if is_foreground_only else 20 * s)

    # 1. Steaming curls (Aroma waves)
    steam_color = (251, 191, 36, 230)
    # Left steam curl
    draw.arc([ox + 370 * s, oy + 170 * s, ox + 430 * s, oy + 320 * s], start=160, end=340, fill=steam_color, width=int(28 * s))
    draw.arc([ox + 430 * s, oy + 230 * s, ox + 490 * s, oy + 380 * s], start=340, end=160, fill=steam_color, width=int(28 * s))
    # Right steam curl
    draw.arc([ox + 530 * s, oy + 150 * s, ox + 590 * s, oy + 310 * s], start=160, end=340, fill=steam_color, width=int(30 * s))
    draw.arc([ox + 590 * s, oy + 220 * s, ox + 650 * s, oy + 370 * s], start=340, end=160, fill=steam_color, width=int(30 * s))

    # 2. Mug Body (Golden Amber gradient tone)
    mug_fill = (245, 158, 11, 255)     # #f59e0b
    mug_highlight = (251, 191, 36, 255) # #fbbf24

    # Rounded mug base and body
    draw.rounded_rectangle([ox + 290 * s, oy + 420 * s, ox + 710 * s, oy + 820 * s], radius=int(90 * s), fill=mug_fill)
    
    # Mug inner rim depth
    draw.ellipse([ox + 290 * s, oy + 385 * s, ox + 710 * s, oy + 455 * s], fill=mug_highlight)
    draw.ellipse([ox + 315 * s, oy + 400 * s, ox + 685 * s, oy + 445 * s], fill=(180, 83, 9, 255)) # Warm inner coffee depth

    # 3. Mug Handle (Right side)
    handle_color = (245, 158, 11, 255)
    # Outer handle arc
    draw.arc([ox + 630 * s, oy + 470 * s, ox + 830 * s, oy + 730 * s], start=270, end=90, fill=handle_color, width=int(44 * s))
    # Connect handle tips cleanly
    draw.pieslice([ox + 630 * s, oy + 450 * s, ox + 690 * s, oy + 510 * s], start=0, end=360, fill=handle_color)
    draw.pieslice([ox + 630 * s, oy + 690 * s, ox + 690 * s, oy + 750 * s], start=0, end=360, fill=handle_color)

    # 4. The Iconic "Bite" Mark (A crescent cutout from the left of the mug)
    bite_center_x = ox + 290 * s
    bite_center_y = oy + 620 * s
    bite_r = int(75 * s)
    bite_bg = (0, 0, 0, 0) if is_foreground_only else (11, 15, 25, 255)
    draw.ellipse([bite_center_x - bite_r, bite_center_y - bite_r, bite_center_x + bite_r, bite_center_y + bite_r], fill=bite_bg)

    # 5. Little Midnight Star / Sparkle above the bite
    star_x = ox + 240 * s
    star_y = oy + 520 * s
    star_size = int(22 * s)
    draw.polygon([
        (star_x, star_y - star_size),
        (star_x + star_size * 0.3, star_y - star_size * 0.3),
        (star_x + star_size, star_y),
        (star_x + star_size * 0.3, star_y + star_size * 0.3),
        (star_x, star_y + star_size),
        (star_x - star_size * 0.3, star_y + star_size * 0.3),
        (star_x - star_size, star_y),
        (star_x - star_size * 0.3, star_y - star_size * 0.3)
    ], fill=(251, 191, 36, 255))

    return img

def main():
    res_path = "apps/web/android/app/src/main/res"
    public_path = "apps/web/public"

    # Mipmap densities and sizes
    standard_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    foreground_sizes = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432,
    }

    # Generate master high-res icons
    master_square = create_roombites_icon(1024, is_foreground_only=False, is_round=False)
    master_round = create_roombites_icon(1024, is_foreground_only=False, is_round=True)
    master_foreground = create_roombites_icon(1024, is_foreground_only=True, is_round=False)

    # Save to web public
    master_square.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(public_path, "favicon.png"))
    master_square.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(public_path, "icon-192.png"))
    master_square.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(public_path, "icon-512.png"))

    # Generate Android mipmap icons
    for folder, px in standard_sizes.items():
        folder_dir = os.path.join(res_path, folder)
        os.makedirs(folder_dir, exist_ok=True)
        # ic_launcher.png
        master_square.resize((px, px), Image.Resampling.LANCZOS).save(os.path.join(folder_dir, "ic_launcher.png"))
        # ic_launcher_round.png
        master_round.resize((px, px), Image.Resampling.LANCZOS).save(os.path.join(folder_dir, "ic_launcher_round.png"))

    for folder, px in foreground_sizes.items():
        folder_dir = os.path.join(res_path, folder)
        os.makedirs(folder_dir, exist_ok=True)
        # ic_launcher_foreground.png
        master_foreground.resize((px, px), Image.Resampling.LANCZOS).save(os.path.join(folder_dir, "ic_launcher_foreground.png"))

    print("Successfully generated all RoomBites icons across all Android densities!")

if __name__ == "__main__":
    main()
