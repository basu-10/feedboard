"""
WSGI entry point for FeedBoard on PythonAnywhere.

Expected runtime layout (all siblings, NOT inside the repo's inner folders):
    /feedboard/       -> git repo (project code, including this wsgi.py)
    /feedboard-venv/  -> virtual environment
    /feedboard-data/  -> logs / data / settings / database generated at runtime

On PythonAnywhere, point the WSGI file path to:
    /feedboard/wsgi.py
and set the Virtualenv field to:
    /feedboard-venv
"""

import os
import sys

# --- Paths ----------------------------------------------------------------
# This file lives in the repo (/feedboard/wsgi.py).
REPO_DIR = os.path.dirname(os.path.abspath(__file__))      # /feedboard
BASE_DIR = os.path.dirname(REPO_DIR)                        # parent of /feedboard
VENV_DIR = os.path.join(BASE_DIR, "feedboard-venv")         # /feedboard-venv
DATA_DIR = os.path.join(BASE_DIR, "feedboard-data")         # /feedboard-data

# Create the data directory if it does not exist yet.
os.makedirs(DATA_DIR, exist_ok=True)

# --- Python path ----------------------------------------------------------
# Make the project code importable (so `from app import app` works).
if REPO_DIR not in sys.path:
    sys.path.insert(0, REPO_DIR)

# --- Environment ----------------------------------------------------------
# Keep generated artifacts out of the repo and inside /feedboard-data.
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
