import sys
from PIL import Image

def crop_transparent(img_path):
    img = Image.open(img_path)
    img = img.convert("RGBA")
    # Get bounding box of non-zero alpha
    bbox = img.getbbox()
    if bbox:
        # Crop the image to the bounding box
        img = img.crop(bbox)
        # Optional: Add a small padding (e.g., 5 pixels) so it doesn't touch the very edge
        padding = 10
        width, height = img.size
        new_width = width + padding * 2
        new_height = height + padding * 2
        new_img = Image.new("RGBA", (new_width, new_height), (0, 0, 0, 0))
        new_img.paste(img, (padding, padding))
        new_img.save(img_path, "PNG")
        print(f"Cropped {img_path}")
    else:
        print(f"No bounding box found for {img_path}")

if __name__ == "__main__":
    for path in sys.argv[1:]:
        crop_transparent(path)
