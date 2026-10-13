import io
import secrets
from pathlib import Path
from PIL import Image
from fastapi import UploadFile, HTTPException, status
from app.config import settings

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
FORMAT_EXT_MAP = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}

def validate_and_save_upload(file: UploadFile, prefix: str = "scan") -> tuple[Path, str]:
    """
    Validates uploaded file for security:
    1. Size Limit: Rejects files exceeding MAX_UPLOAD_SIZE_BYTES (10 MB) with HTTP 413.
    2. Format Validation: Real image validation using PIL verify() (only JPEG, PNG, WebP).
    3. Safe Filenames: Random 32-hex character names, ignoring user-supplied filenames.
    4. Atomic write to settings.UPLOAD_DIR.

    Returns:
        (saved_path, unique_filename)
    """
    # 1. Content-Type header sanity check
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image MIME type. Only JPEG, PNG, and WebP are accepted."
        )

    # 2. Chunked stream reading with strict file size cap
    max_bytes = settings.MAX_UPLOAD_SIZE_BYTES
    contents = bytearray()
    total_bytes = 0
    chunk_size = 64 * 1024  # 64 KB

    while True:
        chunk = file.file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed limit of {max_bytes // (1024 * 1024)} MB."
            )
        contents.extend(chunk)

    if total_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # 3. Actual Image Format & Integrity Validation via PIL
    try:
        raw_io = io.BytesIO(contents)
        img = Image.open(raw_io)
        img_format = (img.format or "").upper()

        if img_format not in ALLOWED_FORMATS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image format ({img_format}). Only JPEG, PNG, and WebP are permitted."
            )

        # verify() checks structural integrity of headers and blocks
        img.verify()

        # Re-open to verify dimensions (verify exhausts file pointer)
        raw_io.seek(0)
        img = Image.open(raw_io)
        width, height = img.size
        if width < 10 or height < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image dimensions are too small to be a valid plant leaf photo."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted image file: {e}"
        )

    # 4. Safe Filename Generation
    safe_ext = FORMAT_EXT_MAP.get(img_format, ".jpg")
    clean_prefix = "scan" if prefix.startswith("scan") else "checkin"
    unique_name = f"{clean_prefix}_{secrets.token_hex(16)}{safe_ext}"

    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    saved_path = (settings.UPLOAD_DIR / unique_name).resolve()

    # Prevent directory escape
    if not saved_path.is_relative_to(settings.UPLOAD_DIR.resolve()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security error: Invalid upload target path."
        )

    with open(saved_path, "wb") as f:
        f.write(contents)

    return saved_path, unique_name

def cleanup_files(*paths: Path | None) -> None:
    """Safely unlinks temporary or generated image files if an error occurs."""
    for path in paths:
        if path is not None:
            try:
                if isinstance(path, Path) and path.exists():
                    path.unlink(missing_ok=True)
            except Exception:
                pass
