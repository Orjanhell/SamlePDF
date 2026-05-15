from io import BytesIO
from flask import Flask, Response, render_template, request, send_from_directory
from PyPDF2 import PdfMerger

app = Flask(__name__, static_folder="static", template_folder="templates")

MAX_FILES = 20
MAX_TOTAL_UPLOAD_SIZE_MB = 100
app.config["MAX_CONTENT_LENGTH"] = MAX_TOTAL_UPLOAD_SIZE_MB * 1024 * 1024


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/historien-om-pdf-fletting")
def pdf_history():
    return render_template("historien-om-pdf-fletting.html")


@app.route("/kontakt-oss")
def contact():
    return render_template("kontakt-oss.html")


@app.route("/sitemap.xml")
def sitemap():
    return send_from_directory(app.template_folder, "sitemap.xml", mimetype="application/xml")


@app.route("/robots.txt")
def robots():
    return send_from_directory(app.static_folder, "robots.txt", mimetype="text/plain")


@app.route("/combine", methods=["POST"])
def combine_pdfs():
    files = request.files.getlist("pdfs")

    if not files:
        return "Ingen filer ble lastet opp.", 400

    if len(files) < 2:
        return "Velg minst to PDF-filer.", 400

    if len(files) > MAX_FILES:
        return f"Du kan maksimalt flette {MAX_FILES} PDF-filer om gangen.", 400

    merger = PdfMerger()
    output = BytesIO()

    try:
        for uploaded_file in files:
            filename = uploaded_file.filename or "uten-navn.pdf"

            if not filename.lower().endswith(".pdf"):
                return f"Filen {filename} er ikke en PDF.", 400

            header = uploaded_file.stream.read(5)
            uploaded_file.stream.seek(0)

            if not header:
                return f"Filen {filename} er tom.", 400

            if header != b"%PDF-":
                return f"Filen {filename} ser ikke ut som en gyldig PDF.", 400

            merger.append(uploaded_file.stream)

        merger.write(output)
        output.seek(0)
    except Exception:
        return "En eller flere PDF-filer kunne ikke flettes. Kontroller at filene ikke er passordbeskyttet eller skadet.", 500
    finally:
        merger.close()

    return Response(
        output.getvalue(),
        mimetype="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=samlet-pdf.pdf",
            "Cache-Control": "no-store",
        },
    )


@app.errorhandler(413)
def file_too_large(_error):
    return f"Filene er for store. Maks total opplastingsstørrelse er {MAX_TOTAL_UPLOAD_SIZE_MB} MB.", 413


if __name__ == "__main__":
    app.run(debug=True)
