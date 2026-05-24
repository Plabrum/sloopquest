"""Pytest configuration.

Sets ENV=testing before any app imports, discovers all models so SQLAlchemy
metadata is fully populated, then imports all fixtures.
"""

import os

os.environ.setdefault("ENV", "testing")

from app.utils.discovery import discover_and_import  # noqa: E402

discover_and_import(["models.py", "models/**/*.py"])

from tests.fixtures import *  # noqa: E402, F401, F403
