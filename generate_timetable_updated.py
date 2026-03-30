from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io

W, H = letter

font_path = '/home/runner/workspace/node_modules/@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'
pdfmetrics.registerFont(TTFont('MontserratBold', font_path))

gold_color = Color(1.0, 0.8431, 0.0)
target_x = 137.1
target_y = 106.6

overlay_buffer = io.BytesIO()
c = canvas.Canvas(overlay_buffer, pagesize=letter)
c.setFillColor(gold_color)
c.setFont('MontserratBold', 5.25)
c.drawString(target_x, target_y, "COMMUNITY IFTAAR")
c.showPage()
c.save()
overlay_buffer.seek(0)

reader = PdfReader('ICKC_Ramadan_2026_Timetable.pdf')
overlay_reader = PdfReader(overlay_buffer)

writer = PdfWriter()

page1 = reader.pages[0]
overlay_page = overlay_reader.pages[0]
page1.merge_page(overlay_page)
writer.add_page(page1)

for i in range(1, len(reader.pages)):
    writer.add_page(reader.pages[i])

with open('ICKC_Ramadan_2026_Timetableupdated.pdf', 'wb') as f:
    writer.write(f)

print("PDF generated: ICKC_Ramadan_2026_Timetableupdated.pdf")
