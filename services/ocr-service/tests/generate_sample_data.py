"""
Generate sample test documents for verification testing.

This script creates synthetic documents for testing purposes only.
DO NOT use these for actual verification.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

def create_sample_passport(output_path: str, name: str, passport_no: str, nationality: str = "NIGERIA"):
    """Create a sample passport image for testing"""
    # Create blank passport page
    img = Image.new('RGB', (800, 1200), color='#e8d5c4')
    draw = ImageDraw.Draw(img)
    
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    except:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Add passport header
    draw.text((300, 50), nationality, fill='#2c5f2d', font=font_large)
    draw.text((320, 100), "PASSPORT", fill='#2c5f2d', font=font_medium)
    
    # Add photo placeholder
    draw.rectangle([(50, 200), (250, 450)], fill='#cccccc', outline='#000000', width=2)
    draw.text((100, 300), "PHOTO", fill='#666666', font=font_medium)
    
    # Add personal details
    y_offset = 200
    fields = [
        ("Surname:", name.split()[-1].upper()),
        ("Given Names:", " ".join(name.split()[:-1]).upper()),
        ("Nationality:", nationality),
        ("Date of Birth:", "01 JAN 1990"),
        ("Sex:", "M"),
        ("Place of Birth:", "LAGOS"),
        ("Date of Issue:", "01 JAN 2020"),
        ("Date of Expiry:", "01 JAN 2030"),
        ("Passport No.:", passport_no)
    ]
    
    for label, value in fields:
        draw.text((300, y_offset), label, fill='#000000', font=font_small)
        draw.text((300, y_offset + 25), value, fill='#000000', font=font_medium)
        y_offset += 70
    
    # Add MRZ (Machine Readable Zone)
    mrz_line1 = f"P<{nationality[:3]}{name.replace(' ', '<'):<39}"
    mrz_line2 = f"{passport_no}0{nationality[:3]}900101M300101<<<<<<<<<<<<<0"
    
    draw.rectangle([(50, 1050), (750, 1150)], fill='#000000')
    draw.text((60, 1060), mrz_line1[:44], fill='#ffffff', font=font_small)
    draw.text((60, 1100), mrz_line2[:44], fill='#ffffff', font=font_small)
    
    img.save(output_path)
    print(f"✓ Created sample passport: {output_path}")

def create_sample_nin(output_path: str, name: str, nin: str):
    """Create a sample NIN card for testing"""
    img = Image.new('RGB', (600, 400), color='#ffffff')
    draw = ImageDraw.Draw(img)
    
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    except:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
    
    # Add header
    draw.rectangle([(0, 0), (600, 80)], fill='#006633')
    draw.text((150, 25), "NATIONAL IDENTITY CARD", fill='#ffffff', font=font_large)
    
    # Add photo placeholder
    draw.rectangle([(30, 100), (180, 300)], fill='#cccccc', outline='#000000', width=2)
    
    # Add details
    draw.text((220, 120), "Full Name:", fill='#000000', font=font_medium)
    draw.text((220, 150), name.upper(), fill='#000000', font=font_large)
    
    draw.text((220, 200), "NIN:", fill='#000000', font=font_medium)
    draw.text((220, 230), nin, fill='#000000', font=font_large)
    
    draw.text((220, 280), "Date of Birth: 01/01/1990", fill='#000000', font=font_medium)
    
    img.save(output_path)
    print(f"✓ Created sample NIN card: {output_path}")

def create_sample_selfie(output_path: str):
    """Create a sample selfie image for testing"""
    img = Image.new('RGB', (400, 500), color='#f0f0f0')
    draw = ImageDraw.Draw(img)
    
    # Draw simple face shape
    draw.ellipse([(100, 100), (300, 350)], fill='#ffdbac', outline='#000000', width=2)
    
    # Eyes
    draw.ellipse([(140, 180), (170, 210)], fill='#000000')
    draw.ellipse([(230, 180), (260, 210)], fill='#000000')
    
    # Nose
    draw.line([(200, 220), (200, 260)], fill='#000000', width=3)
    
    # Mouth
    draw.arc([(150, 260), (250, 320)], 0, 180, fill='#000000', width=3)
    
    img.save(output_path)
    print(f"✓ Created sample selfie: {output_path}")

if __name__ == "__main__":
    data_dir = Path("tests/data")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate Nigerian passports
    create_sample_passport(
        str(data_dir / "sample-passport-ng.jpg"),
        "ADEBAYO OLUWASEUN",
        "A12345678",
        "NIGERIA"
    )
    
    # Generate international passport
    create_sample_passport(
        str(data_dir / "sample-passport-intl.jpg"),
        "JOHN SMITH",
        "GB1234567",
        "UNITED KINGDOM"
    )
    
    # Generate NIN card
    create_sample_nin(
        str(data_dir / "sample-nin.jpg"),
        "ADEBAYO OLUWASEUN",
        "12345678901"
    )
    
    # Generate selfies
    create_sample_selfie(str(data_dir / "sample-selfie-match.jpg"))
    create_sample_selfie(str(data_dir / "sample-selfie-nomatch.jpg"))
    
    # Generate batch test data
    for i in range(5):
        create_sample_passport(
            str(data_dir / f"sample-passport-{i}.jpg"),
            f"TEST USER {i}",
            f"A{10000000 + i}",
            "NIGERIA"
        )
    
    print("\n✅ All sample test data generated successfully!")
    print(f"📁 Location: {data_dir.absolute()}")
