from flask import Flask, render_template
import os

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static",
)


def _load_rss2json_key():
    data_dir = os.environ.get("FEEDBOARD_DATA_DIR")
    if not data_dir:
        home = os.environ.get("HOME") or os.path.expanduser("~")
        data_dir = os.path.join(home, "feedboard-data")
    key_path = os.path.join(data_dir, "configs", "rss2json.key")
    try:
        with open(key_path, "r") as f:
            return f.read().strip()
    except OSError:
        return None


RSS2JSON_API_KEY = _load_rss2json_key()


@app.route("/")
def landing():
    return render_template("landing.html", rss2json_api_key=RSS2JSON_API_KEY)


@app.route("/dashboard")
def index():
    return render_template("dashboard.html", rss2json_api_key=RSS2JSON_API_KEY)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
