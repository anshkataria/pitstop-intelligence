from mlservice.config import Settings


def test_cors_origins_parses_multiple_values_and_ignores_blanks():
    settings = Settings(
        cors_allowed_origins="https://pitstop.example, https://admin.example, "
    )

    assert settings.cors_origins() == [
        "https://pitstop.example",
        "https://admin.example",
    ]
