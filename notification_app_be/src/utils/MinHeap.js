// MinHeap to track top K high priority notifications
class MinHeap {
  constructor(maxSize) {
    this.heap = [];
    this.maxSize = maxSize;
  }

  insert(item) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this.up(this.heap.length - 1);
    } else if (item.score > this.heap[0].score) {
      this.heap[0] = item;
      this.down(0);
    }
  }

  getSorted() {
    return [...this.heap].sort((a, b) => b.score - a.score);
  }

  up(index) {
    let i = index;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[i].score < this.heap[parent].score) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else {
        break;
      }
    }
  }

  down(index) {
    let i = index;
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
      } else {
        break;
      }
    }
  }
}

module.exports = MinHeap;
