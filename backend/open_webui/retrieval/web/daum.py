import logging
import os
from pprint import pprint
from typing import Optional
import requests
from open_webui.retrieval.web.main import SearchResult, get_filtered_results
from open_webui.env import SRC_LOG_LEVELS
import argparse

log = logging.getLogger(__name__)
log.setLevel(SRC_LOG_LEVELS["RAG"])
"""
Documentation: https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide
"""

def search_daum(
    api_key: str,
    query: str,
    size: int = 10,
    page: int = 1,
    sort: str = "accuracy",  # or 'recency'
    filter_list: Optional[list[str]] = None,
) -> list[SearchResult]:
    url = "https://dapi.kakao.com/v2/search/web"
    headers = {"Authorization": f"KakaoAK {api_key}"}
    params = {
        "query": query,
        "size": size,
        "page": page,
        "sort": sort,
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        json_response = response.json()
        results = json_response.get("documents", [])

        # 필터 적용 (선택)
        if filter_list:
            results = get_filtered_results(results, filter_list)

        return [
            SearchResult(
                link=result.get("url"),
                title=result.get("title"),
                snippet=result.get("contents"),
            )
            for result in results
        ]
    except Exception as ex:
        log.error(f"Daum Search Error: {ex}")
        raise ex
    


def main():
    parser = argparse.ArgumentParser(description="Search Daum Web API from CLI.")
    parser.add_argument(
        "query",
        type=str,
        help="The search query.",
    )
    parser.add_argument("--size", type=int, default=10, help="Number of results per page.")
    parser.add_argument("--page", type=int, default=1, help="Page number.")
    parser.add_argument("--sort", type=str, choices=["accuracy", "recency"], default="accuracy")
    parser.add_argument("--filter", nargs="*", help="Optional filters.")
    parser.add_argument("--api_key", type=str, required=True, help="Your Kakao REST API Key")

    args = parser.parse_args()

    results = search_daum(
        api_key=args.api_key,
        query=args.query,
        size=args.size,
        page=args.page,
        sort=args.sort,
        filter_list=args.filter,
    )
    pprint(results)

if __name__ == "__main__":
    main()