from utils.file_storage import FileStorageService, sanitize_filename


def test_sanitize_filename_strips_invalid_chars():
    assert sanitize_filename("../..//weird name?.pdf") == "weird_name_.pdf"


def test_file_storage_saves_with_company_prefix(tmp_path):
    service = FileStorageService(namespace="production", base_dir=tmp_path)
    saved = service.save_bytes(5, "report.txt", b"hello-world")

    assert saved.read_bytes() == b"hello-world"
    assert saved.parent == tmp_path / "company_5" / "production"


def test_file_storage_read_delete_and_list(tmp_path):
    service = FileStorageService(namespace="documents", base_dir=tmp_path)
    service.save_bytes(3, "first.txt", b"one")
    service.save_bytes(3, "second.txt", b"two")

    assert service.exists(3, "first.txt")
    assert service.read_bytes(3, "second.txt") == b"two"

    files = service.list_files(3)
    assert {p.name for p in files} == {"first.txt", "second.txt"}

    service.delete_file(3, "first.txt")
    assert not service.exists(3, "first.txt")
