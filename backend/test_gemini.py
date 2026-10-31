from google import genai
from google.genai import types
from app.core.config import settings

def test_gemini():
    print("Testing Gemini...")
    print("Model:", settings.gemini_model)

    client = genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(timeout=120000),
    )

    try:
        response = client.models.generate_content(
    model="gemini-3.5-flash-lite",
    contents="Reply with exactly: Gemini connection OK",
    config=types.GenerateContentConfig(
        max_output_tokens=20,
    ),
        )
        

        print("SUCCESS:", response.text)

    except Exception as error:
        print(f"FAILED: {type(error).__name__}: {error}")


if __name__ == "__main__":
    test_gemini()