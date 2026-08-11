"""
WSGI entry point for FeedBoard on PythonAnywhere.

Expected runtime layout under your HOME directory:
    ~/feedboard/       -> git repo (project code, including this wsgi.py)
    ~/feedboard-venv/  -> virtual environment
    ~/feedboard-data/  -> logs / data / settings / database generated at runtime

On PythonAnywhere, point the Web app's WSGI file to:
    /home/<yourusername>/feedboard/wsgi.py
and set the Virtualenv field to:
    /home/<yourusername>/feedboard-venv

NOTE: Do NOT use the default /var/www/... wsgi file path, because paths
derived from that location resolve under /var, which is not writable.
"""

import os
import sys

# --- Paths ----------------------------------------------------------------
# Anchor everything to the user's home directory so it works regardless of
# where the WSGI file actually lives (e.g. /var/www on PythonAnywhere).
HOME = os.environ.get("HOME") or os.path.expanduser("~")
REPO_DIR = os.path.join(HOME, "feedboard")           # ~/feedboard
VENV_DIR = os.path.join(HOME, "feedboard-venv")      # ~/feedboard-venv
DATA_DIR = os.path.join(HOME, "feedboard-data")      # ~/feedboard-data

# Create the data directory if possible (do not crash if not writable).
try:
    os.makedirs(DATA_DIR, exist_ok=True)
except OSError:
    pass

# --- Python path ----------------------------------------------------------
# Make the project code importable (so `from app import app` works).
if REPO_DIR not in sys.path:
    sys.path.insert(0, REPO_DIR)

# --- Environment ----------------------------------------------------------
# Keep generated artifacts out of the repo and inside ~/feedboard-data.
os.environ.setdefault("FEEDBOARD_DATA_DIR", DATA_DIR)

# --- Virtualenv (belt-and-suspenders; PythonAnywhere also uses the field) --
if os.path.isdir(VENV_DIR):
    site_packages = os.path.join(
        VENV_DIR, "lib",
        "python{}.{}".format(sys.version_info.major, sys.version_info.minor),
        "site-packages",
    )
    if os.path.isdir(site_packages) and site_packages not in sys.path:
        sys.path.insert(0, site_packages)

# --- App ------------------------------------------------------------------
from app import app as application  # PythonAnywhere expects `application`

# Optional: sanity check that paths resolve where you expect.
if __name__ == "__main__":
    print("REPO_DIR:", REPO_DIR)
    print("VENV_DIR:", VENV_DIR)
    print("DATA_DIR:", DATA_DIR)
    application.run()
