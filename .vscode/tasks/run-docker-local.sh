#!/bin/bash
# This file was automatically generated by jinjaroot. Do not edit directly. See the .jinjaroot dir.


docker run -e KACHERY_DAEMON_RUN_OPTS="--label labbox-ephys-1" -e KACHERY_STORAGE_DIR="/kachery-storage" --net host -it magland/labbox-ephys:0.7.1