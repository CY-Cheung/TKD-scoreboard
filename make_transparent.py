import sys
from PIL import Image

def make_white_transparent(img_path, output_path):
    img = Image.open(img_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    # threshold for white
    threshold = 240
    for item in datas:
        if item[0] >= threshold and item[1] >= threshold and item[2] >= threshold:
            # Change white to transparent
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    make_white_transparent(sys.argv[1], sys.argv[2])
