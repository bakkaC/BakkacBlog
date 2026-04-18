---
title: ACM输入输出模板教程：（JS版）
source: https://www.programmercarl.com/qita/acm1.html
saved_at: 2026-04-12T08:07:49.882Z
---

输入的套路大致是

首先初始化 readline，并让其能够逐行阅读数据

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;
```

一般readline先读一行，根据空格还是逗号使用split进行分割，如果想转为数字就直接map来转换，如果读的就是一个字符串类型的数组或对象直接用json.parse直接转为对象或数组

`let [a, b] = (await readline()).split(' ').map(Number);`

## 1. 多行输入，每行两个整数

练习题：A+B问题I

### JavaScript（Node）

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    const [a, b] = line.split(" ").map(Number);
    console.log(a + b);
  }
}()
```

## 2. 多组数据，每组第一行为n, 之后输入n行两个整数

练习题：A+B问题II

### JS

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
    let n = parseInt(await readline());

    for(let i = 1;i<=n;i++){
        line = await readline()
        let tokens = line.split(' ');
        let a = parseInt(tokens[0]);
        let b = parseInt(tokens[1]);
        console.log(a + b);
    }
}()
```

## 3. 若干行输入，每行输入两个整数，遇到特定条件终止

练习题：A+B问题III

### JavaScript

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    const [a, b] = line.split(" ").map(Number);
    if (a === 0 && b === 0) {
      break;
    }
    console.log(a + b);
  }
}()
```

## 4. 若干行输入，遇到0终止，每行第一个数为N，表示本行后面有N个数

练习题：4. A + B问题IV

### JavaScript(Node)

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    const arr = line.split(" ").map(Number);
    if (arr[0] === 0) {
      break;
    }
    let sum = 0;
    for (let i = 1; i < arr[0] + 1; i++) {
      sum += arr[i];
    }
    console.log(sum);
  }
}()
```

## 5. 第一行是一个整数n，表示一共有n组测试数据, 之后输入n行字符串

练习题 14. 句子缩写

### Js

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  const n = parseInt(await readline());
  for (let i = 0; i < n; i++) {
    let line = await readline();
    let words = line.split(/\s+/);
    words.forEach((item) => {
      process.stdout.write();
    });
    console.log();
  }
}()
```

## 6. 若干行输入，每行包括两个整数a和b，由空格分隔，每行输出后接一个空行。

练习题：A+B问题 VII

### Js

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    const [a, b] = line.split(" ").map(Number);
    console.log(a + b + "\n");
  }
}()
```

## 7. 多组n行数据，每行先输入一个整数N，然后在同一行内输入M个整数,每组输出之间输出一个空行。

练习题：A+B问题 VIII

### JavaScript

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  let n;
  while (line = await readline()) {
    const arr = line.split(" ").map(Number);
    if (arr.length === 1) {
      n = arr[0];
      continue;
    }
    let sum = 0;
    for (let i = 1; i < arr[0] + 1; i++) {
      sum += arr[i];
    }
    if (n > 1) {
      console.log(sum + "\n");
      n--;
    } else {
      console.log(sum);
    }
  }
}()
```

## 8. 多组测试样例，每组输入数据为字符串，字符用空格分隔,输出为小数点后两位

练习题：7. 平均绩点

### JavaScript(Node)

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    let arr = line.split(" ");
    for (let i = 0; i < arr.length; i++) {
    }
  }
}()
```

## 9. 多组测试用例，第一行为正整数n, 第二行为n个正整数，n=0时，结束输入，每组输出结果的下面都输出一个空行

练习题 8. 摆平积木

### Js

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    let size = parseInt(line);
    if (size === 0) break;
    line = await readline();
    let arr = line.split(" ").map(Number);
    for (let i = 0; i < size; i++) {
      // arr[i]
    }
    console.log(res);
    console.log();
  }
}()
```

## 10. 多组测试数据，每组数据只有一个整数，对于每组输入数据，输出一行，每组数据下方有一个空行。

练习题：9. 奇怪的信

### JS

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    const arr = line.split("").map((item) => Number(item));
    for (let i = 0; i < arr.length; i++) {
    }
    console.log(sum, "\n");
  }
}()
```

## 11. 多组测试数据，每个测试实例包括2个整数M，K（2<=k<=M<=1000)。M=0，K=0代表输入结束。

练习题 10. 运营商活动

### JS

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    const [m, k] = line.split("").map((item) => Number(item));
    if (m === 0 && k === 0) {
      break;
    }
    let sum = 0;
    console.log(sum, "\n");
  }
}()
```

## 12. 多组测试数据，首先输入一个整数N，接下来N行每行输入两个整数a和b, 读取输入数据到Map

练习题 11. 共同祖先

### Js

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  let myMap = new Array(21).fill(0);
  let n;
  while (line = await readline()) {
    const arr = line.split(" ").map(Number);
    if (arr.length === 1) {
      n = arr[0];
    } else {
      const [a, b] = arr;
      myMap[a] = b;
      n--;
    }
  }
}()
```

## 13. 多组测试数据。每组输入一个整数n，输出特定的数字图形

练习题 12. 打印数字图形

### JS

```js
function printTopPart(n) {
    for (let i = 1; i <= n; i++) {
        // 打印空格
        for (let j = 1; j <= n - i; ++j) {
            process.stdout.write(" ");
        }

        // 打印递增数字
        for (let j = 1; j <= i; j++) {
            process.stdout.write(String(j));
        }

        // 打印递减数字
        for (let j = i - 1; j >= 1; j--) {
            process.stdout.write(String(j));
        }
        console.log();
    }
}

const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    let n = parseInt(line);
    if (n < 1 || n > 9) {
      console.log("输入的整数n超出范围");
    }
    printTopPart(n);
  }
}()
```

## 14. 多行输入，每行输入为一个字符和一个整数，遇到特殊字符结束

练习题 13. 镂空三角形

### Js

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    let [c, n] = line.split(" ");
    if (c === "@") {
      break;
    }
    myprint(c, parseInt(n));
  }
}()
```

## 15. 第一行是一个整数n，然后是n组数据，每组数据2行，每行为一个字符串，为每组数据输出一个字符串，每组输出占一行

练习题 15.神秘字符

### JS

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  const n = parseInt(await readline());
  for (let i = 0; i < n; i++) {
    let str1 = await readline();
    let str2 = await readline();
    console.log();
  }
}()
```

## 16. 多组测试数据，第一行是一个整数n，接下来是n组字符串，输出字符串

练习题：16. 位置互换

### Js

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  let n = parseInt(await readline());
  for (let i = 0; i < n; i++) {
    let str = await readline();
    console.log();
  }
}()
```

## 17. 多组测试数据，每组测试数据的第一行为整数N（1<=N<=100），当N=0时，输入结束，第二行为N个正整数，以空格隔开，输出结果为字符串

练习题：17. 出栈合法性

### JS

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  let n = -1;
  while (line = await readline()) {
    let arr = line.split(" ").map(Number);
    if (arr.length === 1 && n === -1) {
      n = arr[0];
      if (n === 0) break;
      continue;
    }
    if (islegal(arr, n)) {
      console.log("Yes");
    } else {
      console.log("No");
    }
    n = -1;
  }
}()
```

## 18. 一组输入数据，第一行为n+1个整数，逆序插入n个整数，第二行为一个整数m, 接下来有m行字符串，并根据字符串内容输入不同个数的数据

练习题：18. 链表的基本操作

### Javascript

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;
const out=process.stdout;

void async function () {
  const nums = (await readline()).split(" ").map(Number);
  let root = new Node(-1);
  for (let i = 1; i <= nums[0]; i++) {
    root.insert(1, nums[i]);
  }
  const n = parseInt(await readline());
  let index;
  for (let i = 0; i < n; i++) {
    let line = (await readline()).split(" ");
    let op = line[0];
    let flag = false;
    switch (op) {
      case "show":
        root.show();
        break;
      case "get":
        index=parseInt(line[1]);
        let node=root.getNode(index);
        if(node) out.write(node.data.toString());
        else out.write("get fail");
        break;
      case "delete":
        index=parseInt(line[1]);
        flag=root.deleteNode(index);
        if(flag) out.write("delete OK");
        else out.write("delete fail");
        break;
      case "insert":
        index=parseInt(line[1]);
        flag=root.insert(index,parseInt(line[2]));
        if(flag) out.write("insert OK");
        else out.write("insert fail");
        break;
    }
    console.log();
  }
}()
```

## 19. 多组测试数据，每行为n+1个数字， 输出链表或对应的字符串

练习题：19. 单链表反转

### Js

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    const arr = line.split(" ").filter((item) => item !== "").map(Number);
    const n = arr[0];
    if (n === 0) {
      console.log("list is empty");
      continue;
    }
    let head = createLinkedList(arr.slice(1));
    printLinkedList(head);
  }
}()


// 给定一个number数组，创建出链表，返回链表的头节点
function createLinkedList(arr) {
    // 创建头节点
    const head = new Node(arr[0])
    // 初始化尾指针，方便添加新的节点
    let tail = head
    arr.slice(1).forEach(item => {
        // 每次将细节点插在尾节点后面
        tail.next = new Node(item)
        // 更新尾节点为新创建的节点
        tail = tail.next
    })
    // 返回头节点
    return head
}

// 输出链表
function printLinkedList(head) {
    let output = ''
    // 将每个节点的val拼接成一个字符串
    while(head) {
        output += `${head.val} `
        head = head.next
    }
    // 最后输出
    console.log(output)
}
```

## 20. 多组输入，每组输入包含两个字符串，输出字符串

练习题：21. 构造二叉树

### JS

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

const out=process.stdout;

class Node{
  constructor(data){
    this.data=data;
    this.left=null;
    this.right=null;
  }
  postOrder(){
    if(this.left!=null) this.left.postOrder();
    if(this.right!=null) this.right.postOrder();
    out.write(this.data);
  }
}

void async function () {
  while (line = await readline()) {
    [preOrder, inOrder] = line.split(" ");
    const root = createBTree(preOrder, inOrder, 0, preOrder.length - 1, 0, inOrder.length - 1);
    root.postOrder();
    console.log();
  }
}()
```

## 21. 一组多行数据，第一行为数字n, 表示后面有n行，后面每行为1个字符加2个整数，输出树节点的后序遍历字符串

练习题：22. 二叉树的遍历

### JS

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

const out=process.stdout;

class Node{
  nodes=new Array();
  constructor(data,left,right){
    this.data=data;
    this.left=left;
    this.right=right;
  }
  preOrder(){
    out.write(this.data);
    if(this.left!==0) Node.nodes[this.left].preOrder();
    if(this.right!==0) Node.nodes[this.right].preOrder();
  }
  inOrder(){
    if(this.left!==0) Node.nodes[this.left].inOrder();
    out.write(this.data);
    if(this.right!==0) Node.nodes[this.right].inOrder();
  }
  postOrder(){
    if(this.left!==0) Node.nodes[this.left].postOrder();
    if(this.right!==0) Node.nodes[this.right].postOrder();
    out.write(this.data);
  }
}

void async function () {
  const n = parseInt(await readline());
  Node.nodes = new Array(n + 1);
  for (let i = 1; i <= n; i++) {
    let line = (await readline()).split(" ");
    let left = parseInt(line[1]);
    let right = parseInt(line[2]);
    Node.nodes[i] = new Node(line[0], left, right);
  }
  Node.nodes[1].preOrder();
  console.log();
  Node.nodes[1].inOrder();
  console.log();
  Node.nodes[1].postOrder();
}()
```

## 22. 多组测试数据，首先给出正整数N，接着输入两行字符串，字符串长度为N

练习题：23. 二叉树的高度

### JS

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

const out=process.stdout;

class Node{
  constructor(data){
    this.data=data;
    this.left=null;
    this.right=null;
  }
  getHeight(){
    let leftHeight=0,rightHeight=0;
    if(this.left!=null) leftHeight=this.left.getHeight();
    if(this.right!=null) rightHeight=this.right.getHeight();
    return Math.max(leftHeight,rightHeight)+1;
  }
}

void async function () {
  while (line = await readline()) {
    n = parseInt(line);
    let preOrder = await readline();
    let inOrder = await readline();
    let root = Node.createTree(preOrder, inOrder, 0, n - 1, 0, n - 1);
    console.log(root.getHeight());
  }
}()
```

## 23. 多组测试数据。每组输入占一行，为两个字符串，由若干个空格分隔

练习题：24.最长公共子序列

### Js

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  while (line = await readline()) {
    const arr = line.split(" ");
    const str1 = arr[0], str2 = arr[1];
    const len1 = str1.length, len2 = str2.length;
    const dp = new Array(len1 + 1).fill(0).map(() => new Array(len2 + 1).fill(0));
    console.log(dp[len1][len2]);
  }
}()
```

## 24. 多组测试数据，每组第一行为两个正整数n和m，接下来m行，每行3个整数, 最后一行两个整数

练习题：25. 最爱的城市

### JS

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;

void async function () {
  let lines = [];
  while (line = await readline()) {
    lines.push(line);
  }

  let index = 0;
  while (index < lines.length) {
    const [n, m] = lines[index++].split(" ").map(Number);
    const edges = [];
    for (let i = 0; i < m; i++) {
      const [a, b, l] = lines[index++].split(" ").map(Number);
      edges.push([a, b, l]);
    }
    const [x, y] = lines[index++].split(" ").map(Number);
    const result = floydWarshall(n, m, edges, x, y);
    if (result === INF) {
      console.log("No path");
    } else {
      console.log(result);
    }
  }
}()
```
