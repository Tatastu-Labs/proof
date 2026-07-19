"""
CrewAI and AutoGen tool wrappers for Tatastu Proof.

Both frameworks are Python-first, so this is a plain requests-based wrapper with two
thin adapters on top: one for CrewAI's BaseTool, one for AutoGen's function-calling
convention. Neither the CrewAI nor AutoGen package is a dependency of this repo; install
whichever one you're using (`pip install crewai` or `pip install pyautogen`).

Usage (CrewAI):
    from examples.crewai_autogen_tool import ProofStampTool
    agent = Agent(role="Writer", tools=[ProofStampTool()], ...)

Usage (AutoGen):
    from examples.crewai_autogen_tool import stamp_content, verify_content
    assistant.register_for_llm(name="stamp_content", description="...")(stamp_content)
    user_proxy.register_for_execution(name="stamp_content")(stamp_content)
"""

import hashlib
import os
from typing import Optional

import requests

API_BASE = "https://proof.tatastu.dev"


def _hash_text(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def stamp_content(content: str, title: Optional[str] = None, visibility: str = "public") -> dict:
    """Stamp content with a permanent, verifiable provenance record.

    Hashes the content locally (SHA-256, bytes never leave the machine) and records the
    fingerprint on a public ledger with a creator identity and timestamp. Returns a
    permanent verify URL. Use this whenever the agent produces a document, report, or
    piece of content that should be attributed.

    Args:
        content: The text content to stamp.
        title: Optional human-readable title (<=300 chars).
        visibility: "public" (shown on the verify page) or "private" (hash only).
    """
    content_hash = _hash_text(content)
    headers = {"content-type": "application/json"}
    api_key = os.environ.get("TATASTU_PROOF_KEY")
    if api_key:
        headers["authorization"] = f"Bearer {api_key}"

    res = requests.post(
        f"{API_BASE}/proof",
        json={"contentHash": content_hash, "title": title, "visibility": visibility},
        headers=headers,
        timeout=15,
    )
    if not res.ok:
        body = res.json() if res.content else {}
        raise RuntimeError(f"Stamp failed ({res.status_code}): {body.get('message') or body.get('error')}")

    receipt = res.json()
    return {
        "proofId": receipt["proofId"],
        "verifyUrl": receipt["verifyUrl"],
        "byline": receipt["byline"],
        "status": receipt["status"],
        "contentHash": content_hash,
    }


def verify_content(content: str) -> dict:
    """Check whether content already has a provenance stamp.

    Returns every stamp for the content hash, earliest anchored first. Use this before
    stamping to avoid duplicates, or to check whether someone else already claimed this
    exact content.

    Args:
        content: The text content to look up.
    """
    content_hash = _hash_text(content)
    res = requests.post(f"{API_BASE}/verify", json={"contentHash": content_hash}, timeout=15)
    res.raise_for_status()
    data = res.json()
    return {"contentHash": content_hash, "stamped": len(data["proofs"]) > 0, "proofs": data["proofs"]}


# --- CrewAI adapter -------------------------------------------------------
# Lazily imported so this module has no hard dependency on crewai.

def _crewai_base_tool():
    from crewai.tools import BaseTool  # type: ignore

    return BaseTool


try:
    _BaseTool = _crewai_base_tool()

    class ProofStampTool(_BaseTool):  # type: ignore[misc]
        name: str = "stamp_content"
        description: str = (
            "Stamp content with a permanent, verifiable provenance record. "
            "Hashes locally and records a public, checkable proof. Returns a verify URL."
        )

        def _run(self, content: str, title: Optional[str] = None, visibility: str = "public") -> str:
            return str(stamp_content(content, title, visibility))

    class ProofVerifyTool(_BaseTool):  # type: ignore[misc]
        name: str = "verify_content"
        description: str = "Check whether content already has an existing provenance stamp."

        def _run(self, content: str) -> str:
            return str(verify_content(content))

except ImportError:
    # crewai isn't installed; stamp_content/verify_content above still work standalone
    # and are what the AutoGen adapter below registers directly.
    pass
