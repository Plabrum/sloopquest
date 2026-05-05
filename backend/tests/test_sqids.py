"""Tests for Sqid encoding infrastructure."""

import pytest

from app.utils.sqids import Sqid, sqid_decode, sqid_encode


class TestSqidEncodeDecode:
    def test_roundtrip(self):
        for i in [0, 1, 42, 999, 123456]:
            encoded = sqid_encode(i)
            assert sqid_decode(encoded) == i

    def test_min_length(self):
        assert len(sqid_encode(1)) >= 8

    def test_lowercase_only(self):
        encoded = sqid_encode(12345)
        assert encoded.isalpha()
        assert encoded.islower()

    def test_invalid_decode_raises(self):
        with pytest.raises(ValueError):
            sqid_decode("!!!")

    def test_out_of_range_decode_raises(self):
        # `aaabcdef` decodes to 6_103_515_624, well past INTEGER max (~2.1B).
        with pytest.raises(ValueError, match="out-of-range"):
            sqid_decode("aaabcdef")

    def test_max_postgres_int_is_ok(self):
        assert sqid_decode(sqid_encode(2_147_483_647)) == 2_147_483_647


class TestSqidType:
    def test_sqid_is_int(self):
        s = Sqid(42)
        assert isinstance(s, int)
        assert int(s) == 42

    def test_sqid_str_returns_encoded(self):
        s = Sqid(1)
        assert str(s) == sqid_encode(1)

    def test_sqid_equality(self):
        assert Sqid(42) == 42
        assert Sqid(42) == Sqid(42)
