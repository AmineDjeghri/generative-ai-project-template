# Run ``make docker-dev`` from the root of the project


# Define an argument for the Python version, defaulting to 3.11 if not provided.
ARG PYTHON_VERSION=3.11.4
FROM python:${PYTHON_VERSION}-slim
LABEL authors="amine"

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1
# output is written directly to stdout or stderr without delay, making logs appear immediately in the console or in log files.
ENV PYTHONUNBUFFERED=1

# keep this in case some commands use sudo (tesseract for example). This docker doesn't need a password
#RUN apt-get update &&  apt-get install -y sudo && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN apt update -y
RUN apt upgrade -y
RUN apt-get install build-essential -y
RUN apt-get install curl -y
RUN apt autoremove -y
RUN apt autoclean -y

# Set working directory
WORKDIR /app

# keep this in case some commands use sudo (tesseract for example). This docker doesn't need a password
#RUN apt-get update &&  apt-get install -y sudo && apt-get clean && rm -rf /var/lib/apt/lists/*

# Define default entrypoint if needed (Optional)
CMD ["/bin/bash"]
