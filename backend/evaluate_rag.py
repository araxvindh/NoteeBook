import getpass
import requests

BASE_URL = "http://127.0.0.1:8000/api"
LOGIN_URL = f"{BASE_URL}/auth/login"
CHAT_URL = f"{BASE_URL}/chat"

QUESTIONS = [
    "What is Qdrant used for?",
    "List the main stages of the document ingestion pipeline.",
    "Why can chunk overlap be useful?",
    "What is the office address of the sample project?",
]


def login():
    email = input("Enter your Notebook email: ")
    password = getpass.getpass("Enter your Notebook password: ")

    response = requests.post(
        LOGIN_URL,
        json={"email": email, "password": password},
        timeout=30,
    )

    if not response.ok:
        print("Login failed:", response.status_code, response.text)
        return None

    data = response.json()
    token = data.get("access_token")

    if not token:
        print("Login succeeded, but no access_token was returned.")
        print("Response:", data)
        return None

    print("Login successful!")
    return token


def evaluate_question(question, token):
    print("\n" + "=" * 65)
    print("QUESTION:", question)

    try:
        response = requests.post(
            CHAT_URL,
            json={"question": question, "top_k": 5},
            headers={"Authorization": f"Bearer {token}"},
            timeout=180,
        )

        print("HTTP STATUS:", response.status_code)

        if not response.ok:
            print("API ERROR:", response.text)
            return

        data = response.json()

        print("\nANSWER:")
        print(data.get("answer", "No answer field returned."))

        print("\nSOURCES:")
        sources = data.get("sources", [])

        if not sources:
            print("No sources returned.")
        else:
            for source in sources:
                if isinstance(source, dict):
                    print(
                        f"- {source.get('filename', 'Unknown file')} "
                        f"(chunk {source.get('chunk_index', '?')})"
                    )
                else:
                    print(f"- {source}")

    except requests.RequestException as error:
        print("Request failed:", error)


if __name__ == "__main__":
    token = login()

    if token:
        for question in QUESTIONS:
            evaluate_question(question, token)