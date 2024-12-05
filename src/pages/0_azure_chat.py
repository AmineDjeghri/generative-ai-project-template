import streamlit as st

from ml.ai import get_completions
from utils import settings, llmaaj_chat_client, llmaaj_embedding_client

st.write("# Test your Client Chat")

st.write(settings.get_active_env_vars())

message_response = {"type": None, "message": None}

st.header("Ask your question", divider="rainbow")
col1, col2 = st.columns([3, 1])
with col1:
    user_query = st.text_input(key="chat", label="Posez votre question")


if user_query:
    try:
        # res = requests.get(f"{backend_url}/prefix_example/form/", params=params).json()

        res = get_completions(
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

st.title(" Test your LLMAAJ chat client : llm as a judge")
if not settings.ENABLE_EVALUATION:
    st.error("ENABLE_EVALUATION env var is not set to True")
else:
    st.write(settings.get_eval_env_vars())
    col1, col2 = st.columns([3, 1])
    with col1:
        user_query = st.text_input(key="chat_llmaaj", label="Posez votre question")

    if user_query:
        try:
            messages = [
                (
                    "system",
                    "You are a helpful assistant",
                ),
                ("human", user_query),
            ]
            res = llmaaj_chat_client.invoke(messages)

            st.success(res.content)
        except Exception as e:
            res = f"Error: {e}"
            st.error(res)

    st.title(" Test your LLMAAJ Embeddings")
    if st.button("Check LLMAAJ Embeddings"):
        try:
            from langchain_core.vectorstores import InMemoryVectorStore

            text = "LangChain is the framework for building context-aware reasoning applications"

            vectorstore = InMemoryVectorStore.from_texts(
                [text],
                embedding=llmaaj_embedding_client,
            )
            retriever = vectorstore.as_retriever()
            retrieved_documents = retriever.invoke("What is LangChain?")
            st.success(retrieved_documents[0].page_content)
        except Exception as e:
            res = f"Error: {e}"
            st.error(res)
