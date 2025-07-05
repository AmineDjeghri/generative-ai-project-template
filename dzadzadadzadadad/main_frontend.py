import streamlit as st

st.write("# Home Page")

st.write(
    """This application template showcases the versatility of Streamlit & FastAPI, allowing you to choose between using Streamlit alone or integrating it with FastAPI for enhanced backend capabilities.
There are two pages showcasing the connection with azure :

- Not using FastAPI: for example, you can directly interact with Azure Blob Storage, manage files, and perform operations like uploading and deleting documents—all.

- Using FastAPI : leverage the power of FastAPI, this template provides a foundation for building interactive and scalable applications (For example : RAG). the FastAPI backend interacts with Azure Search, allowing you to search for documents and retrieve relevant information. Streamlit then interacts with the FastAPI backend to display the search results.

- Using only Azure Openai without ani RAG : just a chat.
"""
)
