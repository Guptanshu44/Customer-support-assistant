"""
knowledge_base.py — FAISS-powered vector knowledge base.

Loads FAQs and policies from text files, embeds them using
sentence-transformers, and enables semantic search via FAISS.
"""

import os
import numpy as np

# Lazy imports — only load when needed
_faiss = None
_SentenceTransformer = None


def _load_faiss():
    global _faiss
    if _faiss is None:
        import faiss
        _faiss = faiss
    return _faiss


def _load_st():
    global _SentenceTransformer
    if _SentenceTransformer is None:
        from sentence_transformers import SentenceTransformer
        _SentenceTransformer = SentenceTransformer
    return _SentenceTransformer


class KnowledgeBase:
    """
    Semantic search over FAQs and policies using FAISS + sentence-transformers.

    Usage:
        kb = KnowledgeBase()
        kb.load()
        results = kb.search("customer wants refund", top_k=3)
    """

    def __init__(
        self,
        faqs_path: str = "knowledge/faqs.txt",
        policies_path: str = "knowledge/policies.txt",
        model_name: str = "all-MiniLM-L6-v2"
    ):
        self.faqs_path = faqs_path
        self.policies_path = policies_path
        self.model_name = model_name
        self.model = None
        self.index = None
        self.documents = []      # raw text chunks
        self.doc_types = []      # "faq" or "policy"
        self._loaded = False

    # ------------------------------------------------------------------ #
    # Loading                                                              #
    # ------------------------------------------------------------------ #

    def load(self):
        """Load documents and build the index."""
        if self._loaded:
            return

        self._load_file(self.faqs_path, doc_type="faq")
        self._load_file(self.policies_path, doc_type="policy")

        if not self.documents:
            self._loaded = True
            return

        try:
            SentenceTransformer = _load_st()
            faiss = _load_faiss()
            self.model = SentenceTransformer(self.model_name)
            embeddings = self.model.encode(
                self.documents,
                convert_to_numpy=True,
                show_progress_bar=False
            ).astype(np.float32)
            dim = embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dim)
            self.index.add(embeddings)
        except Exception as e:
            print(f"  ℹ️  Using fast keyword matcher for KB: {e}")
            self.model = None
            self.index = None

        self._loaded = True
        print(f"  ✅ Knowledge base loaded: {len(self.documents)} documents")

    def _load_file(self, path: str, doc_type: str):
        """Parse a text file into chunks separated by blank lines."""
        if not os.path.exists(path):
            print(f"  ⚠️  File not found: {path}")
            return

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        # Split on double newlines (each Q&A or POLICY block is one chunk)
        chunks = [c.strip() for c in content.split("\n\n") if c.strip()]
        self.documents.extend(chunks)
        self.doc_types.extend([doc_type] * len(chunks))

    # ------------------------------------------------------------------ #
    # Search                                                               #
    # ------------------------------------------------------------------ #

    def search(self, query: str, top_k: int = 3) -> list:
        """
        Semantic search over the knowledge base.

        Returns a list of dicts:
            [{"text": str, "type": "faq"|"policy", "score": float}]
        """
        if not self._loaded:
            self.load()

        if self.index is None or self.model is None or len(self.documents) == 0:
            # Fast keyword-overlap matching
            q_words = set(query.lower().split())
            scored = []
            for i, doc in enumerate(self.documents):
                doc_words = set(doc.lower().split())
                overlap = len(q_words.intersection(doc_words))
                if overlap > 0:
                    scored.append((overlap, i))
            scored.sort(key=lambda x: x[0], reverse=True)
            return [
                {"text": self.documents[i], "type": self.doc_types[i], "score": float(score)}
                for score, i in scored[:top_k]
            ]

        # Embed query with SentenceTransformer
        q_vec = self.model.encode(
            [query],
            convert_to_numpy=True,
            show_progress_bar=False
        ).astype(np.float32)

        # FAISS search
        distances, indices = self.index.search(q_vec, top_k)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < len(self.documents):
                results.append({
                    "text": self.documents[idx],
                    "type": self.doc_types[idx],
                    "score": float(dist)
                })

        return results

    def search_faqs(self, query: str, top_k: int = 2) -> list:
        """Search only FAQ documents."""
        all_results = self.search(query, top_k=top_k * 3)
        return [r for r in all_results if r["type"] == "faq"][:top_k]

    def search_policies(self, query: str, top_k: int = 2) -> list:
        """Search only policy documents."""
        all_results = self.search(query, top_k=top_k * 3)
        return [r for r in all_results if r["type"] == "policy"][:top_k]


# Singleton instance shared across the app
_kb_instance = None


def get_knowledge_base() -> KnowledgeBase:
    """Get or create the global KnowledgeBase singleton."""
    global _kb_instance
    if _kb_instance is None:
        _kb_instance = KnowledgeBase()
    return _kb_instance
