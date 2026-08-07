"""Adapter registry + protocol.

An adapter parses a source's raw payload into a list of RawPosting. The source
'type' in sources.yaml selects the adapter. board_api and ats_endpoint both map
to platform-specific adapters chosen by a 'platform' hint in the source config.
"""
from __future__ import annotations

from typing import Callable, Protocol

from ..normalize import RawPosting


class Adapter(Protocol):
    name: str

    def parse(self, payload: str | bytes, *, company: str = "", source_url: str = "") -> list[RawPosting]:
        ...


_REGISTRY: dict[str, "Adapter"] = {}


def register(name: str) -> Callable[[type], type]:
    def deco(cls: type) -> type:
        _REGISTRY[name] = cls()
        return cls
    return deco


def get_adapter(name: str) -> "Adapter":
    try:
        return _REGISTRY[name]
    except KeyError:
        raise KeyError(f"no adapter registered for {name!r}; have {sorted(_REGISTRY)}")
