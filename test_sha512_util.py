import unittest
import os
import tempfile
import hashlib
from sha512_util import compute_sha512, verify_sha512, hash_file_sha512

class TestSHA512Util(unittest.TestCase):
    def test_compute_sha512_string(self):
        data = "evidence_data_123"
        expected_hash = hashlib.sha512(data.encode('utf-8')).hexdigest()
        self.assertEqual(compute_sha512(data), expected_hash)
        
    def test_compute_sha512_bytes(self):
        data = b"binary_evidence_data"
        expected_hash = hashlib.sha512(data).hexdigest()
        self.assertEqual(compute_sha512(data), expected_hash)
        
    def test_verify_sha512_success(self):
        data = "secure_string"
        expected_hash = hashlib.sha512(data.encode('utf-8')).hexdigest()
        self.assertTrue(verify_sha512(data, expected_hash))
        
    def test_verify_sha512_failure(self):
        data = "secure_string"
        wrong_hash = hashlib.sha512(b"tampered_string").hexdigest()
        self.assertFalse(verify_sha512(data, wrong_hash))
        
    def test_hash_file_sha512(self):
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(b"mock_file_evidence_content")
            tmp_path = tmp.name
            
        try:
            expected_hash = hashlib.sha512(b"mock_file_evidence_content").hexdigest()
            self.assertEqual(hash_file_sha512(tmp_path), expected_hash)
        finally:
            os.unlink(tmp_path)

if __name__ == '__main__':
    unittest.main()
