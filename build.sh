#!/bin/bash

docker build . \
  --platform=linux/amd64 \
  --tag=ghcr.io/silencesys/dh--entropy:latest