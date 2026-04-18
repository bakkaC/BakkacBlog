---
title: React 哲学-渲染-总结 new
description: ""
date: 2026-04-01
toc_max_heading_level: 4
---


## 哲学

React 是一个 UI 库：你描述 UI，库自动帮你操作 DOM。它带来了编程思维的转变，使得前端开发不用再直接维护 DOM。

React 的语法是 JSX，它把 JS 逻辑和 HTML、CSS 放在一起，提出“组件才是逻辑边界”。

React 提出的模型是声明式编程。你的 UI 不应该是手动拼出来的，而是由数据自动生成的。

- 命令式编程关注“怎么做”，你需要一步步告诉计算机如何执行任务
- 声明式编程关注“做什么”，你只描述想要的结果，而不关心具体执行步骤

React 的核心哲学是：UI 是状态的纯函数。

这是一种 React 专属的声明式模型。声明式编程的效果加上函数式编程的实现，就是 `UI = f(state)`。函数式实现意味着 render 是纯函数，state 决定 UI，相同的 state 只能得到相同的输出，就像数学函数一样。

### React 的性能优化

一次渲染，就是一次函数调用。UI 更新，就是一次新的函数调用，也就是 rerender。

rerender 显然会带来严重的性能问题，React 的做法是引入 React Element 对象，也就是 React 世界里的 virtual DOM。

1. 不直接操作 DOM，而是操作代表 DOM、且可还原为 DOM 的 JS 对象，让浏览器环境的负担被转移和优化。
2. 这个对象可以用于对比前后差异，做最小化更新，使 rerender 不用重复做大量计算。

### React 的 state 和不可变性

UI 是快照，state 是常量，UI 更新是通过创建新的 state 作为新的输入再次执行函数。

这使得 React 的比较可以直接比较引用，不用递归，从而减少性能开销。因为更新意味着要重新创建值，引用天然会变化。

### React 的 Effect

这套模型带来了一种“无运动、无生命周期、只有常量”的 UI 抽象。但事实上，state 更新与数据变化往往不是纯声明式就能完整解决的。

状态之间会相互影响，一些非 DOM 渲染逻辑 React 无法管理，异步操作和命令式 API 也天然和声明式哲学相悖。

React 对这个现实问题给出的方案是 Effect 抽象，可以理解为：

`UI = f(state) + effect(state)`

一个声明式快照确定后，再执行这个快照对应的命令式副作用，去同步那些不属于 React 声明式管理范围内的部分，从而达到真实世界里需要的效果。

这通过引入一个额外阶段，避免直接回到生命周期和命令式模型，但也带来了一些别扭感。某种意义上，Effect 的存在本身就说明前端 UI 世界很难被一个纯函数抽象彻底覆盖。

## Render Implementation

React 的渲染实现也和上面的思路高度契合。回到 `UI = f(state) + effect(state)`，这天然地把逻辑分成两个阶段，而 React 的渲染也正是两个阶段。

![](assets/React%20哲学-渲染-总结%20new/file-20260413145628573.png)

### Why Fiber

diff 的目的是最小化更新，而 diff 的前提是构造中的 element 必须有可比较的对象。

这个可比较的树应该能代表已经确定的 DOM 结构。element 对象在遍历结束、没有引用后就会被垃圾回收。

如果直接拿带 DOM 引用的 element 做比较，实际上会走向旧的 Stack Reconciler 模型。这个模型的问题在于：

- element 和实例树之间没有一个中间层保存临时状态
- 遍历时必须边走边改 DOM
- 一旦中间出错，就会污染 DOM，而且无法回滚

所以 React 希望把更新分成两个阶段：

1. 先收集所有修改并打上标记
2. 再统一提交，避免中途失败污染真实 DOM

但 diff 本身又是一个会互相影响的过程，前一个更新会影响后一个更新，插入和删除也会改变树结构，所以不能只靠一个简单的“变更表”。

答案就是 fiber 的双缓冲结构，引入一个 work-in-progress 的草稿层，在内存里边遍历边修改，但不立刻修改 DOM。

这使得 React 从“旧实例树 + element + DOM”的三层结构，演化成“旧 fiber + element + WIP fiber + DOM”的四层结构。

fiber 从对象树变成链表树，遍历过程中通过修改指针来更新内存结构，标记 flag，收集 effect list，最终在整棵树构建完成之后统一提交，形成了今天的 render phase 和 commit phase。

fiber 的结构示意：

![](assets/React%20哲学-渲染-总结%20new/file-20260413145719656.png)

### Render Phase

渲染流程可以概括为：

从 root 出发，深度优先遍历。每创建一个新的 React Element，就创建一个对应的 WIP fiber，再将“新生成的 React Element”和“当前的 Fiber（Current Fiber）”进行 diff，也就是 reconciliation，根据结果给 WIP fiber 打标记。

- `React.createElement()` 的调用本身就是嵌套递归的
- 父组件里有子组件时，遍历顺序天然就是 DFS
- 子组件 element 的创建过程，本来就属于父组件 element 的创建过程

![](assets/React%20哲学-渲染-总结%20new/file-20260413145758457.png)

每创建一个 fiber，还要确定其真实父节点，以便后续 DOM 操作。因为 functional component 的存在，fiber tree 和 DOM tree 并不是一一对应的。

![](assets/React%20哲学-渲染-总结%20new/file-20260413145830729.png)
### Diff 算法

React 在 diff 时首先检查两个核心字段：

- `type`：节点种类，例如 `div`、`span` 或自定义组件
- `key`：节点唯一身份，告诉 React“虽然位置变了，但我还是原来的我”

#### 场景一：完全匹配

当 `type` 和 `key` 都相同，React 认为节点可以复用。

- 基于旧 fiber 创建 WIP fiber
- 继承旧 fiber 上的 DOM 实例 `stateNode`
- 如果 `props` 有变化，就打上 `Update` 标记

#### 场景二：不匹配

当 `type` 不同，或者 `key` 不同，节点不可复用。

1. 将旧 fiber 标记为 `Deletion`
2. 根据新的 React Element 创建新的 WIP fiber，并标记为 `Placement`

这意味着对应 DOM 节点会被彻底卸载并重新创建。

#### 场景三：只有 Element

遍历新的 element 树时，如果某个位置有 element，但旧 fiber 里没有对应节点：

1. 根据 element 创建新的 WIP fiber
2. 标记为 `Placement`
3. 在 commit 阶段将对应 DOM 实例挂载到父节点下

#### 场景四：只有 Fiber

旧 fiber 树里还剩节点，但新的 element 树已经没有对应描述：

1. 将这些旧 fiber 标记为 `Deletion`
2. 在 commit 阶段统一从真实 DOM 树中移除

对于 DOM 操作，不能停在 functional component 上，必须找到最近的 DOM fiber。

- `Placement` 要把当前节点链接到真正的 DOM fiber，而不是 functional component 的 fiber
- `Deletion` 要把子 DOM fiber 从最近的父 DOM fiber 里移除

### Commit Phase

diff，也就是 reconcile 阶段，用的是 current fiber 和 new element 的对比。

mutation，也就是 commit 阶段，用的是 current fiber 和 work-in-progress fiber 的对比。

commit phase 可以分成几个子阶段：

- Before Mutation
  - 清理旧副作用
  - 读取旧的 DOM 状态
  - 运行旧的 `useEffect` cleanup
  - 处理 `getSnapshotBeforeUpdate`
- Mutation
  - `Update`：移除旧 props 和事件，再挂上新的 props 和事件
  - `Deletion`：执行 `removeChild`
  - `Placement`：执行 `appendChild`
- Layout
  - 执行 `useLayoutEffect`

## 常见 Hooks

### useState

```ts
function useState(initialState) {
  if (hooks.length === hookIndex) {
    const hook = {
      value: initialState,
      queue: [],
    };
    hooks.push(hook);
  }

  const currentHook = hooks[hookIndex];

  if (currentHook.queue.length > 0) {
    let baseValue = currentHook.value;
    currentHook.queue.forEach((action) => {
      baseValue =
        typeof action === "function" ? action(baseValue) : action;
    });
    currentHook.value = baseValue;
    currentHook.queue = [];
  }

  const thisHookIndex = hookIndex;
  const setState = (action) => {
    hooks[thisHookIndex].queue.push(action);
    render(MyComponent);
  };

  hookIndex++;

  return [currentHook.value, setState];
}
```

### useEffect 的坑

- 无限循环渲染：在 effect 内部更新了某个状态，而这个状态又是它自己的依赖
- 闭包陷阱与陈旧值：依赖数组漏写依赖时，effect 永远锁定在旧渲染周期的值
- 不必要的派生状态同步：props 变化后再通过 effect `setState` 同步一份本地状态，会多一次渲染
- 忘记清理外部订阅：全局监听和定时器没有清理时，容易造成内存泄漏
- 依赖陷阱：依赖数组里放组件内定义的函数，会导致 effect 高频重跑

### 其他 hooks

- `useLayoutEffect`：只有当你需要在浏览器重绘前同步读写 DOM，以避免视觉抖动时才使用
- `useRef`：提供一个跨渲染周期保持不变的容器，内部值变化不会触发重渲染
- `useMemo` / `useCallback`：缓存值和函数，避免在 rerender 时重复创建
- `useContext`：可以理解为 props drilling 的语法糖，但也会带来更大范围 rerender 的风险
- `useReducer`：适合复杂状态逻辑
- `useSyncExternalStore`：用于读取并订阅外部数据源，确保并发渲染模式下的数据一致性

## 状态管理工具

Zustand 和 TanStack Query 是现在很常见的两个库。前者偏客户端状态管理，后者偏服务端状态管理。

| 特性       | Zustand / Redux         | TanStack Query         |
| -------- | ----------------------- | ---------------------- |
| 管理内容     | 本地同步状态（UI 交互）           | 服务端异步状态（接口数据）          |
| 底层模式     | 发布订阅 / 观察者              | 发布订阅 / 观察者             |
| 数据更新源    | 用户手动 `set` 或 `dispatch` | 网络请求、缓存失效、窗口聚焦等自动触发    |
| React 桥梁 | `useSyncExternalStore`  | `useSyncExternalStore` |
| 核心挑战     | 状态一致性                   | 缓存失效策略、竞态处理、数据新鲜度      |

共同原理都是发布订阅加 `useSyncExternalStore()`。

### 1. Zustand 的核心实现

Zustand 的核心就是“一个外部对象 + 发布订阅”。

```js
import { useSyncExternalStore } from 'react';

const createStore = (createState) => {
  let state;
  const listeners = new Set();

  const getState = () => state;

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const setState = (partial) => {
    const nextState =
      typeof partial === 'function' ? partial(state) : partial;

    if (nextState !== state) {
      state = Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener());
    }
  };

  state = createState(setState, getState);
  return { getState, setState, subscribe };
};

export const create = (createState) => {
  const api = createStore(createState);

  const useStore = (selector) => {
    return useSyncExternalStore(
      api.subscribe,
      () => selector(api.getState())
    );
  };

  return useStore;
};
```

关键点：

- `createStore` 通过闭包持有唯一的 `state` 和 `listeners`
- `subscribe` 注册订阅者
- `setState` 更新状态并通知所有订阅者
- `useSyncExternalStore` 把这个外部 store 接进 React 渲染系统

### 2. TanStack Query 的核心实现

TanStack Query 的核心是“全局缓存 Map + 异步任务调度 + 观察者”。

```js
import { useSyncExternalStore, useCallback } from 'react';

const queryCache = new Map();
const listeners = new Map();

const notify = (key) => {
  if (listeners.has(key)) {
    listeners.get(key).forEach((cb) => cb());
  }
};

const fetchData = async (key, queryFn) => {
  try {
    const data = await queryFn();
    queryCache.set(key, { data, status: 'success' });
  } catch (error) {
    queryCache.set(key, { error, status: 'error' });
  }

  notify(key);
};

export const useQuery = (key, queryFn) => {
  const subscribe = useCallback((onStoreChange) => {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(onStoreChange);

    if (!queryCache.has(key)) {
      fetchData(key, queryFn);
    }

    return () => {
      listeners.get(key).delete(onStoreChange);
    };
  }, [key]);

  const getSnapshot = () => {
    return queryCache.get(key) || {
      status: 'loading',
      data: undefined,
    };
  };

  return useSyncExternalStore(subscribe, getSnapshot);
};
```

### 3. 两者的核心区别

1. 数据结构不同
   Zustand 是单一对象；TanStack Query 是按 key 划分的缓存 Map。
2. 更新驱动源不同
   Zustand 更偏手动触发；TanStack Query 更偏副作用驱动和异步状态机。
3. 订阅粒度不同
   Zustand 通过 selector 做局部过滤；TanStack Query 直接按 key 订阅。
4. `useSyncExternalStore` 的角色相同
   它们都把外部数据源安全地接到 React 并发渲染模型里。

### Map / Store 设计差异为什么合理

- TanStack Query 面对的是服务端数据，这些数据通常天然就是碎片化、按 key 独立存在的，所以适合 Map
- Zustand 面对的是本地 UI 状态，往往高度关联，适合用单对象做原子化更新
- Query 是缓存，没人使用时就应该清理
- Zustand 是仓库，通常不希望因为某个组件卸载就自动销毁
- Zustand 的 selector 让你可以灵活订阅任意派生结果，比预定义 key 更适合 UI 逻辑

## React 18 & 19 更新

React 18 的主线是并发模式，React 19 的主线包括 React Compiler，另一条长期主线则是 SSR 和 RSC 生态。

常见的新能力包括：

- `useTransition`：支持可打断的低优先级渲染
- `useEventEffect`：解决 effect 里既想拿最新值、又不想因为依赖变化重跑订阅的问题
- `<Activity>`
- `<Suspense>` 的增强
- 与 RSC、SSR 相关的一系列能力
