from flask import Flask, render_template

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static",
)


@app.route("/")
def landing():
    return render_template("landing.html")


@app.route("/dashboard")
def index():
    return render_template("dashboard.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
