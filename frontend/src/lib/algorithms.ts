import type { Comment } from "@/types";

export function sequentialSearch(comments: Comment[], keyword: string): Comment[] {
  if (!keyword.trim()) return comments;
  
  const lowerKeyword = keyword.toLowerCase();
  const results: Comment[] = [];
  
  for (let i = 0; i < comments.length; i++) {
    const text = comments[i].textDisplay?.toLowerCase() || "";
    if (text.includes(lowerKeyword)) {
      results.push(comments[i]);
    }
  }
  
  return results;
}

export function binarySearch(comments: Comment[], keyword: string): Comment[] {
  if (!keyword.trim()) return comments;
  const lowerKeyword = keyword.toLowerCase();

  const sortedComments = [...comments].sort((a, b) => {
    const textA = (a.textDisplay || "").toLowerCase();
    const textB = (b.textDisplay || "").toLowerCase();
    if (textA < textB) return -1;
    if (textA > textB) return 1;
    return 0;
  });

  const results: Comment[] = [];
  let left = 0;
  let right = sortedComments.length - 1;

  let foundIndex = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const text = (sortedComments[mid].textDisplay || "").toLowerCase();

    if (text.includes(lowerKeyword)) {
      foundIndex = mid;
      break;
    } else if (text < lowerKeyword) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  if (foundIndex !== -1) {
    results.push(sortedComments[foundIndex]);
    
    let i = foundIndex - 1;
    while (i >= 0 && (sortedComments[i].textDisplay || "").toLowerCase().includes(lowerKeyword)) {
      results.unshift(sortedComments[i]);
      i--;
    }
    
    let j = foundIndex + 1;
    while (j < sortedComments.length && (sortedComments[j].textDisplay || "").toLowerCase().includes(lowerKeyword)) {
      results.push(sortedComments[j]);
      j++;
    }
  }

  return results;
}

export function selectionSortByLength(comments: Comment[], mode: "asc" | "desc" = "desc"): Comment[] {
  const arr = [...comments];
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    let targetIdx = i;
    for (let j = i + 1; j < n; j++) {
      const lenA = (arr[j].textDisplay || "").length;
      const lenTarget = (arr[targetIdx].textDisplay || "").length;

      if (mode === "desc") {
        if (lenA > lenTarget) targetIdx = j;
      } else {
        if (lenA < lenTarget) targetIdx = j;
      }
    }
    if (targetIdx !== i) {
      const temp = arr[i];
      arr[i] = arr[targetIdx];
      arr[targetIdx] = temp;
    }
  }

  return arr;
}

export function insertionSortBySentiment(comments: Comment[], mode: "asc" | "desc" = "desc"): Comment[] {
  const arr = [...comments];
  const n = arr.length;

  const sentimentScore = (sentiment: string) => {
    if (sentiment === "positive") return 3;
    if (sentiment === "neutral") return 2;
    if (sentiment === "negative") return 1;
    return 0;
  };

  for (let i = 1; i < n; i++) {
    const currentItem = arr[i];
    const currentScore = sentimentScore(currentItem.sentiment);
    let j = i - 1;

    if (mode === "desc") {
      while (j >= 0 && sentimentScore(arr[j].sentiment) < currentScore) {
        arr[j + 1] = arr[j];
        j--;
      }
    } else {
      while (j >= 0 && sentimentScore(arr[j].sentiment) > currentScore) {
        arr[j + 1] = arr[j];
        j--;
      }
    }
    arr[j + 1] = currentItem;
  }

  return arr;
}
