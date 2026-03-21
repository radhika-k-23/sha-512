import hashlib
import io
import os
import tempfile
import unittest

from core.hashing import (
    compute_sha512, verify_integrity,
    hash_data, verify_hash_data,
    hash_file, verify_hash_file
)


class SHA512HashingTests(unittest.TestCase):
    """Unit tests for the core SHA-512 hashing utility."""

    KNOWN_HASH = hashlib.sha512(b"hello").hexdigest()

    def test_sha512_known_value(self):
        """SHA-512 of b'hello' must equal the known reference digest."""
        f = io.BytesIO(b"hello")
        result = compute_sha512(f)
        self.assertEqual(result, self.KNOWN_HASH)

    def test_sha512_returns_128_char_hex(self):
        """SHA-512 hex digest is always 128 characters long."""
        f = io.BytesIO(b"some evidence data")
        result = compute_sha512(f)
        self.assertEqual(len(result), 128)
        self.assertTrue(all(c in "0123456789abcdef" for c in result))

    def test_sha512_resets_cursor(self):
        """compute_sha512 must reset the file cursor to 0 after reading."""
        data = b"reset cursor test"
        f = io.BytesIO(data)
        compute_sha512(f)
        self.assertEqual(f.read(), data, "Cursor was not reset after hashing")

    def test_integrity_pass(self):
        """verify_integrity returns True when file is unmodified."""
        data = b"original evidence content"
        stored = hashlib.sha512(data).hexdigest()
        f = io.BytesIO(data)
        self.assertTrue(verify_integrity(f, stored))

    def test_integrity_fail_tampered(self):
        """verify_integrity returns False when file bytes have changed."""
        data = b"original evidence content"
        stored = hashlib.sha512(data).hexdigest()
        tampered = io.BytesIO(b"modified evidence content!")
        self.assertFalse(verify_integrity(tampered, stored))

    def test_integrity_fail_empty(self):
        """verify_integrity returns False for empty file if stored hash was non-empty."""
        data = b"some file"
        stored = hashlib.sha512(data).hexdigest()
        self.assertFalse(verify_integrity(io.BytesIO(b""), stored))

    def test_large_file_chunked_reading(self):
        """SHA-512 of a 1 MB payload must match the reference hash."""
        data = b"x" * (1024 * 1024)
        expected = hashlib.sha512(data).hexdigest()
        f = io.BytesIO(data)
        self.assertEqual(compute_sha512(f), expected)

    def test_hash_data_known_value(self):
        """hash_data matching known value"""
        result = hash_data(b"hello")
        self.assertEqual(result, self.KNOWN_HASH)

    def test_verify_hash_data_pass(self):
        self.assertTrue(verify_hash_data(b"hello", self.KNOWN_HASH))

    def test_verify_hash_data_fail(self):
        self.assertFalse(verify_hash_data(b"hello", "invalidhash123"))

    def test_hash_file_and_verify(self):
        """hash_file and verify_hash_file working properly on files."""
        with tempfile.NamedTemporaryFile(delete=False) as tf:
            tf.write(b"hello file data here")
            temp_path = tf.name
        
        try:
            expected_hash = hashlib.sha512(b"hello file data here").hexdigest()
            # test hash_file
            result = hash_file(temp_path)
            self.assertEqual(result, expected_hash)
            
            # test verify_hash_file
            self.assertTrue(verify_hash_file(temp_path, expected_hash))
            self.assertFalse(verify_hash_file(temp_path, "wronghash123"))
        finally:
            os.remove(temp_path)


if __name__ == "__main__":
    unittest.main()
