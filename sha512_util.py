import hashlib
import os
from typing import Union

def compute_sha512(data: Union[bytes, str]) -> str:
    """Compute the SHA-512 hash of the given data.

    Args:
        data: Input data as bytes or string. If a string is provided, it will be encoded using UTF-8.

    Returns:
        Hexadecimal string representation of the SHA-512 hash.
    """
    if isinstance(data, str):
        data = data.encode('utf-8')
    sha512 = hashlib.sha512()
    sha512.update(data)
    return sha512.hexdigest()

def verify_sha512(data: Union[bytes, str], expected_hash: str) -> bool:
    """Verify that the SHA-512 hash of the data matches the expected hash.

    Args:
        data: Input data as bytes or string.
        expected_hash: Expected SHA-512 hash as a hexadecimal string.

    Returns:
        True if the computed hash matches the expected hash, False otherwise.
    """
    return compute_sha512(data) == expected_hash.lower()

def hash_file_sha512(file_path: str, chunk_size: int = 8192) -> str:
    """Compute the SHA-512 hash of a file's contents.

    Args:
        file_path: Path to the file to hash.
        chunk_size: Size of chunks to read the file in bytes. Default is 8KB.

    Returns:
        Hexadecimal string of the file's SHA-512 hash.
    """
    sha512 = hashlib.sha512()
    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            sha512.update(chunk)
    return sha512.hexdigest()

if __name__ == "__main__":
    # Simple CLI for quick testing
    import argparse
    parser = argparse.ArgumentParser(description="SHA-512 hashing utility")
    parser.add_argument("path", help="Path to file to hash")
    args = parser.parse_args()
    if os.path.isfile(args.path):
        print(f"SHA-512({args.path}) = {hash_file_sha512(args.path)}")
    else:
        print(f"Error: {args.path} is not a valid file.")
