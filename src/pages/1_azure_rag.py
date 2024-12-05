import streamlit as st

from ml.ai import run_azure_ai_search_indexer
from utils import settings, logger

st.write("# Streamlit Azure RAG without fastapi")

st.write(settings.get_azure_search_env_vars())

if not settings.ENABLE_AZURE_SEARCH:
    st.error("ENABLE_AZURE_SEARCH env var is not set to True")
    st.stop()

from azure.storage.blob import BlobServiceClient

message_response = {"type": None, "message": None}


@st.fragment()
def show_upload_documents():
    global message_response

    st.write(f"### Documents disponibles dans le storage {settings.AZURE_CONTAINER_NAME}")
    blob_service_client = BlobServiceClient.from_connection_string(
        f"DefaultEndpointsProtocol=https;AccountName={settings.AZURE_STORAGE_ACCOUNT_NAME};AccountKey={settings.AZURE_STORAGE_ACCOUNT_KEY}"
    )
    container_client = blob_service_client.get_container_client(
        container=settings.AZURE_CONTAINER_NAME
    )

    blob_list = container_client.list_blobs()
    for i, blob in enumerate(blob_list):
        print(f"Name: {blob.name}")

        col1, col2 = st.columns([3, 1])
        with col1:
            st.write(f"- {blob.name}")
        with col2:
            if st.button("Supprimer", key=f"button_{i}"):
                container_client.delete_blob(blob.name)
                run_azure_ai_search_indexer()
                message_response = {"type": "success", "message": "Document supprimé avec succès"}
                st.rerun(scope="fragment")

    uploaded_file = st.file_uploader("Transférer vos documents")
    if uploaded_file:
        blob_service_client = BlobServiceClient.from_connection_string(
            f"DefaultEndpointsProtocol=https;AccountName={settings.AZURE_STORAGE_ACCOUNT_NAME};AccountKey={settings.AZURE_STORAGE_ACCOUNT_KEY}"
        )
        blob_client = blob_service_client.get_blob_client(
            container=settings.AZURE_CONTAINER_NAME, blob=uploaded_file.name
        )

        try:
            res = blob_client.upload_blob(uploaded_file)
        except Exception as e:
            logger.error(f"Error uploading document: {e}")
            message_response = {"type": "error", "message": f"Error uploading document: {e}"}
            # st.rerun(scope="fragment")

        logger.trace(f"Document {uploaded_file.name} uploaded successfully")
        logger.debug(f"Document {uploaded_file.name} uploaded successfully")
        res = run_azure_ai_search_indexer()

        if res.status_code != 202:
            message_response = {"type": "error", "message": res.text}
        else:
            message_response = {"type": "success", "message": "Document téléchargé avec succès"}
        st.rerun(scope="fragment")


show_upload_documents()

if message_response["message"]:
    if message_response["type"] == "success":
        st.success(message_response["message"])
    if message_response["type"] == "error":
        st.error(message_response["message"])
