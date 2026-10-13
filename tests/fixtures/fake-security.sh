#!/bin/sh

# SPDX-FileCopyrightText: 2026 Xquik Contributors
#
# SPDX-License-Identifier: MIT

# Stands in for macOS `security` in tests. It logs its arguments, fails when
# FAKE_SECURITY_MISSING is 1, and prints the token only when the caller passes -w.

printf '%s\n' "$*" >> "$FAKE_SECURITY_LOG"
if [ "$FAKE_SECURITY_MISSING" = "1" ]; then
  exit 44
fi
case " $* " in
  *" -w "*) printf '%s\n' "$FAKE_SECURITY_TOKEN" ;;
esac
