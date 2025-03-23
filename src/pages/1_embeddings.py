import streamlit as st

from ml.llm import EmbeddingLLMConfig
from utils import settings

st.write("# Test your Client Chat")

st.write(settings.get_embeddings_env_vars())

message_response = {"type": None, "message": None}


embeddings_llm = EmbeddingLLMConfig(
    model_name=settings.EMBEDDINGS_DEPLOYMENT_NAME,
    base_url=settings.EMBEDDINGS_BASE_URL,
    api_key=settings.EMBEDDINGS_API_KEY,
    api_version=settings.EMBEDDINGS_API_VERSION,
)


st.title(" Test your  Embeddings")

col1, col2 = st.columns([3, 1])
with col1:
    text_to_emb = st.text_input(key="embedding", label="Write a text to embed")

if text_to_emb:
    try:
        # res = requests.get(f"{backend_url}/prefix_example/form/", params=params).json()

        res = embeddings_llm.embed_text(text_to_emb)

        st.success(res)
    except Exception as e:
        res = f"Error: {e}"
        st.error(res)
