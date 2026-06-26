import type { Comment } from "@/types";

const GO_API_URL = import.meta.env.VITE_FETCHER_URL || "http://localhost:8080/api";

export async function goSearchComments(comments: Comment[], keyword: string, method: "sequential" | "binary"): Promise<Comment[]> {
  const res = await fetch(`${GO_API_URL}/algorithms/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comments, keyword, method })
  });
  if (!res.ok) throw new Error("Failed to search using Go API");
  const data = await res.json();
  return data.comments;
}

export async function goSortComments(comments: Comment[], sortBy: "length" | "sentiment", mode: "asc" | "desc"): Promise<Comment[]> {
  const res = await fetch(`${GO_API_URL}/algorithms/sort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comments, sortBy, mode })
  });
  if (!res.ok) throw new Error("Failed to sort using Go API");
  const data = await res.json();
  return data.comments;
}

export async function goCRUDComment(comments: Comment[], action: "add" | "update" | "delete", params: { comment?: Comment; id?: string; text?: string }): Promise<Comment[]> {
  const res = await fetch(`${GO_API_URL}/algorithms/crud`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comments, action, ...params })
  });
  if (!res.ok) throw new Error(`Failed to ${action} using Go API`);
  const data = await res.json();
  return data.comments;
}
