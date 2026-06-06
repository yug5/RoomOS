const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Generating icons using Python PIL...');
const pythonCode = `
from PIL import Image, ImageDraw, ImageFont
import os

def generate_icon(size):
    img = Image.new('RGB', (size, size), color='#0d0d14')
    draw = ImageDraw.Draw(img)
    r = size * 0.4
    center = size / 2
    draw.ellipse([center - r, center - r, center + r, center + r], fill='#9b7fe8')
    try:
        font = ImageFont.truetype("arial.ttf", int(size * 0.4))
    except IOError:
        try:
            font = ImageFont.truetype("DejaVuSans-Bold.ttf", int(size * 0.4))
        except IOError:
            font = ImageFont.load_default()
    
    # Draw centered
    draw.text((center, center), "R", fill="white", font=font, anchor="mm")
    os.makedirs('public/icons', exist_ok=True)
    img.save(f'public/icons/icon-{size}.png', 'PNG')

generate_icon(192)
generate_icon(512)
`;

fs.writeFileSync(path.join(__dirname, 'generate_temp.py'), pythonCode);
try {
  execSync('python public/icons/generate_temp.py');
  console.log('Icons generated successfully!');
} catch (err) {
  console.error('Error running python icon generator:', err);
} finally {
  try {
    fs.unlinkSync(path.join(__dirname, 'generate_temp.py'));
  } catch (e) {}
}
