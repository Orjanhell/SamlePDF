from flask import Flask, request, send_file, render_template
from PyPDF2 import PdfMerger
import os
import tempfile
import shutil

app = Flask(__name__, static_folder='static', template_folder='templates')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/combine', methods=['POST'])
def combine_pdfs():
    if not request.files:
        return "Ingen filer ble lastet opp.", 400

    # Midlertidig lagring for PDF-fletting
    temp_dir = tempfile.mkdtemp()
    output_path = os.path.join(temp_dir, 'kombinert.pdf')

    try:
        merger = PdfMerger()
        for key in sorted(request.files.keys(), key=lambda x: int(x.split('[')[1][:-1])):
            file = request.files[key]

            # Valider filtype
            if not file.filename.lower().endswith('.pdf'):
                return f"Filen {file.filename} er ikke en PDF.", 400

            # Kontroller at filen ikke er tom
            if file.stream.read(1) == b"":  # Leser én byte for å bekrefte innhold
                return f"Filen {file.filename} er tom.", 400
            file.stream.seek(0)  # Tilbakestill stream-posisjonen

            merger.append(file.stream)

        merger.write(output_path)
        merger.close()

        return send_file(output_path, as_attachment=True, download_name='kombinert.pdf')
    except Exception as e:
        return f"En feil oppstod under sammenslåingen: {str(e)}", 500
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == '__main__':
    app.run(debug=True)
