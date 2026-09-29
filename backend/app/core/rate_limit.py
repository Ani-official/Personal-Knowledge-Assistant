from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter registered on app.state in main.py.
limiter = Limiter(key_func=get_remote_address)
