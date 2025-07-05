import streamlit as st

from ml.llm import InferenceLLMConfig, EmbeddingLLMConfig
from utils import settings

st.write("# Test your Client Chat")

st.write(settings.get_inference_env_vars())

message_response = {"type": None, "message": None}

llm = InferenceLLMConfig(
    model_name=settings.INFERENCE_DEPLOYMENT_NAME,
    base_url=settings.INFERENCE_BASE_URL,
    api_key=settings.INFERENCE_API_KEY,
    api_version=settings.INFERENCE_API_VERSION,
)

embeddings_llm = EmbeddingLLMConfig(
    model_name=settings.EMBEDDINGS_DEPLOYMENT_NAME,
    base_url=settings.EMBEDDINGS_BASE_URL,
    api_key=settings.EMBEDDINGS_API_KEY,
    api_version=settings.EMBEDDINGS_API_VERSION,
)
st.header("Ask your question", divider="rainbow")
col1, col2 = st.columns([3, 1])
with col1:
    user_query = st.text_input(key="chat", label="Posez votre question")


if user_query:
    try:
        # res = requests.get(f"{backend_url}/prefix_example/form/", params=params).json()

        res = llm.generate_from_messages(
            messages=[
                {
                    "role": "system",
                    "content": "Tu est un chatbot qui répond aux questions.",
                },
                {"role": "user", "content": user_query},
            ],
        )

        st.success(res)
    except Exception as e:
        res = f"Error: {e}"
        st.error(res)
