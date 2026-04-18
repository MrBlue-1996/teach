FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=America/Chicago
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash-completion \
    ca-certificates \
    curl \
    fd-find \
    gh \
    git-lfs \
    jq \
    less \
    man-db \
    openssh-client \
    postgresql-client \
    procps \
    redis-tools \
    ripgrep \
    shellcheck \
    time \
    tzdata \
    unzip \
    wget \
  && ln -sf /usr/bin/fdfind /usr/local/bin/fd \
  && git lfs install --system \
  && ln -snf /usr/share/zoneinfo/${TZ} /etc/localtime \
  && echo ${TZ} > /etc/timezone \
  && mkdir -p ${PNPM_HOME} \
  && chown -R node:node /home/node/.local \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@8.14.0 --activate
