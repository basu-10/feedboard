from flask import Flask, render_template, request, jsonify, Response
import os
import re
import html
import urllib.request
import urllib.parse
import urllib.error
import xml.etree.ElementTree as ET

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static",
)


def _load_env_file(path):
    values = {}
    try:
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                values[key.strip()] = value.strip()
    except OSError:
        pass
    return values


def _resolve_data_dir():
    if os.environ.get("FEEDBOARD_DATA_DIR"):
        return os.environ["FEEDBOARD_DATA_DIR"]
    # Default to the repo's sibling `feedboard-data` (kept outside the repo),
    # so configs/.env is the single source of truth beside the code.
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sibling = os.path.join(repo_dir, "..", "feedboard-data")
    if os.path.isdir(sibling):
        return os.path.abspath(sibling)
    home = os.environ.get("HOME") or os.path.expanduser("~")
    return os.path.join(home, "feedboard-data")


def _load_config_env():
    data_dir = _resolve_data_dir()
    env_path = os.path.join(data_dir, "configs", ".env")
    return env_path, _load_env_file(env_path)


_CONFIG_ENV_PATH, _CONFIG_ENV = _load_config_env()

RSS2JSON_API_KEY = _CONFIG_ENV.get("RSS2JSON_API_KEY")

_V2_REFRESH_RAW = _CONFIG_ENV.get("V2_REFRESH_INTERVAL_SECONDS")
if _V2_REFRESH_RAW is None:
    raise RuntimeError(
        "V2_REFRESH_INTERVAL_SECONDS is required in the .env file "
        f"({_CONFIG_ENV_PATH}) but was not found."
    )
try:
    V2_REFRESH_INTERVAL_SECONDS = int(_V2_REFRESH_RAW)
except ValueError:
    raise RuntimeError(
        f"V2_REFRESH_INTERVAL_SECONDS must be an integer (seconds), got: {_V2_REFRESH_RAW!r}"
    )
if V2_REFRESH_INTERVAL_SECONDS <= 0:
    raise RuntimeError(
        f"V2_REFRESH_INTERVAL_SECONDS must be a positive integer, got: {V2_REFRESH_INTERVAL_SECONDS}"
    )


@app.route("/")
def landing():
    return render_template("landing.html", rss2json_api_key=RSS2JSON_API_KEY)


@app.route("/dashboard")
def index():
    return render_template("dashboard.html", rss2json_api_key=RSS2JSON_API_KEY)


@app.route("/dashboard/v2")
def dashboard_v2():
    return render_template(
        "dashboard_v2.html",
        rss2json_api_key=RSS2JSON_API_KEY,
        v2_refresh_interval_seconds=V2_REFRESH_INTERVAL_SECONDS,
    )


# ---------------------------------------------------------------------------
# RSS proxy
# ---------------------------------------------------------------------------
# The previous implementation relied on the third-party api.rss2json.com
# service, which has started returning HTTP 422 for these requests. This
# endpoint fetches the source RSS feed directly (server-side, so there is no
# CORS issue) and returns JSON in the same shape the front-end expects:
#   { "status": "ok", "items": [ { title, link, pubDate, description,
#                                 content, author, thumbnail, enclosure } ] }
# ---------------------------------------------------------------------------

_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def _decode_bytes(data):
    for enc in ("utf-8", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def _extract_text(element):
    if element is None or element.text is None:
        return ""
    return element.text.strip()


def _extract_attr(element, attr):
    return element.get(attr, "").strip() if element is not None else ""


def _first_match(item, local_names):
    for child in item.iter():
        tag = child.tag.split("}")[-1]
        if tag in local_names:
            return child
    return None


def _parse_rss(xml_text):
    root = ET.fromstring(xml_text)
    items_out = []
    for item in root.iter():
        if item.tag.split("}")[-1] != "item":
            continue
        title = _extract_text(_first_match(item, {"title"}))
        link = _extract_text(_first_match(item, {"link"}))
        pub_date = _extract_text(_first_match(item, {"pubDate", "date"}))
        author = _extract_text(
            _first_match(item, {"author", "creator", "dc:creator"})
        )
        description = _extract_text(
            _first_match(item, {"description", "summary"})
        )
        content = _extract_text(
            _first_match(item, {"content", "content:encoded", "encoded"})
        )
        description = html.unescape(description)

        thumbnail = ""
        enclosure = None
        for child in item:
            tag = child.tag.split("}")[-1]
            if tag == "enclosure":
                url = child.get("url", "")
                enclosure = {"link": url, "type": child.get("type", "")}
                if (child.get("type", "").startswith("image") or not thumbnail) and url:
                    thumbnail = url
            elif tag in ("media:thumbnail", "media:content"):
                url = child.get("url", "")
                if not thumbnail and url:
                    thumbnail = url
            elif tag == "thumbnail" and not thumbnail:
                thumbnail = child.get("url", "")

        if not thumbnail:
            match = re.search(r'<img[^>]+src="([^"]+)"', description, re.I)
            if match:
                thumbnail = match.group(1)

        items_out.append({
            "title": title,
            "link": link,
            "pubDate": pub_date,
            "description": description,
            "content": content or description,
            "author": author,
            "thumbnail": thumbnail,
            "enclosure": enclosure,
        })

    return items_out


@app.route("/api/rss")
def api_rss():
    feed_url = request.args.get("rss_url") or request.args.get("url")
    if not feed_url:
        return jsonify({"status": "error", "message": "Missing rss_url parameter"}), 400

    try:
        req = urllib.request.Request(feed_url, headers={"User-Agent": _USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
        items = _parse_rss(_decode_bytes(raw))
        return jsonify({"status": "ok", "items": items})
    except ET.ParseError as exc:
        return jsonify({"status": "error", "message": f"RSS parse error: {exc}"}), 502
    except urllib.error.HTTPError as exc:
        return jsonify({"status": "error", "message": f"Upstream HTTP {exc.code}"}), 502
    except Exception as exc:  # noqa: BLE001
        return jsonify({"status": "error", "message": str(exc)}), 502


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
