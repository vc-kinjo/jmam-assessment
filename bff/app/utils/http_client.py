import httpx
from typing import Dict, Any, Optional
from app.config import settings

class BackendClient:
    """Backend API クライアント"""
    
    def __init__(self):
        self.base_url = settings.backend_url
        self.timeout = 30.0

    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> httpx.Response:
        """Backend API リクエスト実行"""
        url = f"{self.base_url}{endpoint}"
        
        default_headers = {
            "Content-Type": "application/json",
            "User-Agent": "Gunchart-BFF/1.0"
        }
        
        if headers:
            default_headers.update(headers)
            
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            if method.upper() == "GET":
                response = await client.get(url, headers=default_headers, params=data)
            elif method.upper() == "POST":
                response = await client.post(url, headers=default_headers, json=data)
            elif method.upper() == "PUT":
                response = await client.put(url, headers=default_headers, json=data)
            elif method.upper() == "DELETE":
                response = await client.delete(url, headers=default_headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            return response

    async def post(self, endpoint: str, data: Dict[str, Any], headers: Optional[Dict[str, str]] = None):
        """POST リクエスト"""
        return await self._make_request("POST", endpoint, data, headers)

    async def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None):
        """GET リクエスト"""
        return await self._make_request("GET", endpoint, params, headers)

    async def put(self, endpoint: str, data: Dict[str, Any], headers: Optional[Dict[str, str]] = None):
        """PUT リクエスト"""
        return await self._make_request("PUT", endpoint, data, headers)

    async def delete(self, endpoint: str, headers: Optional[Dict[str, str]] = None):
        """DELETE リクエスト"""
        return await self._make_request("DELETE", endpoint, None, headers)

# シングルトンインスタンス
backend_client = BackendClient()
http_client = backend_client  # 既存のコードとの互換性のため