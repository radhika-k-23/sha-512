import hashlib


def compute_sha512(file_obj) -> str:
    """Return the hex-encoded SHA-512 digest of an open file object.

    Reads in 8 KB chunks to avoid loading large evidence files into memory.
    The caller must ensure the file cursor is at position 0 before calling.
    """
    h = hashlib.sha512()
    file_obj.seek(0)
    for chunk in iter(lambda: file_obj.read(8192), b""):
        h.update(chunk)
    file_obj.seek(0)  # reset so the caller can still read/save the file
    return h.hexdigest()


def verify_integrity(file_obj, stored_hash: str) -> bool:
    """Return True if the live hash of *file_obj* matches *stored_hash*.

    Used on every access to detect tampering after initial storage.
    """
    return compute_sha512(file_obj) == stored_hash


def hash_data(data: bytes) -> str:
    """Return the hex-encoded SHA-512 digest of raw bytes."""
    return hashlib.sha512(data).hexdigest()


def verify_hash_data(data: bytes, expected_hash: str) -> bool:
    """Return True if the hash of *data* matches *expected_hash*."""
    return hash_data(data) == expected_hash


def hash_file(filepath: str) -> str:
    """Return the hex-encoded SHA-512 digest of a file by its path.
    
    Reads in 8 KB chunks to avoid loading large files into memory.
    """
    h = hashlib.sha512()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_hash_file(filepath: str, expected_hash: str) -> bool:
    """Return True if the hash of *filepath* matches *expected_hash*."""
    return hash_file(filepath) == expected_hash
