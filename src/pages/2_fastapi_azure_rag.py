import requests
import streamlit as st

from utils import settings


st.write("# RAG using fastapi")

st.write(get_rag_env_variables())


backend_url = f"http://{settings.FASTAPI_HOST}:{settings.FASTAPI_PORT}/"


@st.fragment
def show_app_health():
    try:
        res = requests.get(backend_url).json()
        st.success(res)
    except Exception as e:
        st.exception(f"FastAPI server encountered a problem. " f"\n\n Error: {e}")
        exit()


@st.fragment
def create_form(questions: list, key: str, title: str = "Form"):
    st.header(title, divider="rainbow")

    if f"{key}_responses" in st.session_state:
        responses = st.session_state[f"{key}_responses"]
        successes = st.session_state[f"{key}_success"]
    else:
        responses = {}
        successes = {}
        st.session_state[f"{key}_responses"] = responses
        st.session_state[f"{key}_success"] = successes

    for i, question in enumerate(questions):
        col1, col2 = st.columns([3, 1])
        with col1:
            st.write(f"- {question[0]}")
        with col2:
            if st.button("Envoyer", key=f"button_{i}_{question[0][:10]}"):
                try:
                    params = {"question": question[1]}
                    res = requests.get(f"{backend_url}/prefix_example/form/", params=params).json()
                    successes[i] = True
                except Exception as e:
                    res = f"Error: {e}"
                    successes[i] = False
                responses[i] = f"{res}"

                st.session_state[f"{key}_responses"][i] = responses[i]
                st.session_state[f"{key}_success"][i] = successes[i]

        if i in responses:
            if successes[i]:
                st.success(f"Réponse automatique:  {responses[i]}")
            else:
                st.error(f"Erreur {responses[i]}")


@st.fragment()
def show_ask_question():
    st.header("Ask your question", divider="rainbow")
    col1, col2 = st.columns([3, 1])
    with col1:
        q = st.text_input(key="chat", label="Posez votre question")

    params = None
    with col2:
        if st.button("Envoyer", key="button_chat"):
            params = {"question": q}

    if params:
        try:
            res = requests.get(f"{backend_url}/prefix_example/form/", params=params).json()
            st.success(res)
        except Exception as e:
            res = f"Error: {e}"
            st.error(res)


# the first element is the question displayed in the UI, the second element is the question detailed to be sent to the LLM.
questions = [
    (
        "Quelle est la date de naissance de la personne ?",
        "Quelle est la date de naissance de la personne ?",
    ),
]

show_app_health()

create_form(questions, key="general")

show_ask_question()
