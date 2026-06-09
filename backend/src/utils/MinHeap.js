/**
 * MinHeap - keeps track of top K items efficiently.
 *
 * Why a Min Heap for "top" items?
 * - We maintain a heap of size K.
 * - The root is always the SMALLEST item in our top-K set.
 * - When a new item comes in that is bigger than the root,
 *   we swap it in and fix the heap.
 * - At the end, whatever is in the heap = top K items.
 *
 * Time:  O(N log K)  — much better than sorting all N items.
 * Space: O(K)
 */
class MinHeap {
  constructor(maxSize) {
    this.heap = [];
    this.maxSize = maxSize;
  }

  // Add an item (object with .score property)
  insert(item) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this._bubbleUp(this.heap.length - 1);
    } else if (item.score > this.heap[0].score) {
      // new item is better than our current worst — replace it
      this.heap[0] = item;
      this._sinkDown(0);
    }
  }

  // Return items sorted highest score first
  getSorted() {
    return [...this.heap].sort((a, b) => b.score - a.score);
  }

  // --- internal helpers ---

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[i].score < this.heap[parent].score) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else break;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < n && this.heap[left].score < this.heap[smallest].score) {
        smallest = left;
      }
      if (right < n && this.heap[right].score < this.heap[smallest].score) {
        smallest = right;
      }
      if (smallest !== i) {
        [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
        i = smallest;
      } else break;
    }
  }
}

module.exports = MinHeap;
