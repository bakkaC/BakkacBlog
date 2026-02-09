---
description: ""
date: 2025-12-08T16:11
toc_max_heading_level: 4
---
来源：

* https://paperclover.net/blog/webdev/one-year-next-app-router#real-world-pitfalls

* https://www.developerway.com/posts/react-server-components-performance#measuring-next-js-app-router-after-lift-and-shift-migration

* https://www.youtube.com/watch?v=C84YEp-8-hI

## Performance

### CSR



测量的项目：

https://github.com/developerway/react-server-components

![](assets/rsc-nextjs/file-20251208161755692-1.png)

***



CSR渲染过程:

1. 下载HTML，JS

2. 编译JS

3. 执行JS

在这之后，UI 才会变得可见，LCP 指标才会被记录，并且 fetch 请求等副作用才会被触发。

![](assets/rsc-nextjs/file-20251208161755692.png)

初始加载（无 JavaScript 缓存）的数值如下：

4.1 秒才能在屏幕上看到任何东西！谁会认为在客户端渲染任何内容是个好主意？？

除了与开发体验和学习曲线相关的一切（这些本身就非常重要），与传统网站相比，主要有两个优势。



1. 页面之间的切换可以非常快。在这个项目中，从收件箱页面导航到设置页面只需 80 毫秒。这已经非常接近即时响应了。

2. 其次，它非常便宜。



此外，那些超过 4 秒的加载时间并不像看起来那么糟糕。这只会发生用户第一次访问您的应用程序时。诚然，对于类似着陆页的东西，这是不可接受的。但对于 SaaS，您期望用户经常访问网站，4 秒只会发生一次（每次部署）。



***

### SSR

#### Fetching data in client side



我们不得不盯着空白页面很长时间，这开始让人感到烦恼。即使只是第一次。



为了解决这个问题：

能不能让 React 在服务器上执行组件，直接产出一段完整的 HTML 字符串？



我们知道，最终整个 React 应用看起来是这样的：

```javascript
const HTMLString = renderToString(<App />);
```



renderToString 是 React 的内置 API（来自 react-dom/server），

它不会创建真实 DOM，而是返回一段 HTML 字符串。



于是我们把这段字符串「塞进」模板 HTML：

```javascript
export const serveStatic = async (c) => {
  const html = fs.readFileSync('index.html').toString();
  const HTMLString = renderToString(<App />);
  const htmlWithSSR = html.replace('<div id="root"></div>', HTMLString);
  return c.body(htmlWithSSR, 200);
};
```

这样浏览器收到的 HTML 就已经包含了完整的 UI，即使 JavaScript 还没下载、还没执行，用户也能马上看到页面。



这就是 服务端渲染（Server-Side Rendering, SSR）。

欢迎来到 React 的服务器端渲染（SSR）和静态网站生成（SSG）时代。因为 renderToString 实际上是一个 React 支持的真实 API。这确实是某些 React SSG/SSR 框架背后的核心实现。



如果我这样修改我的客户端渲染项目，它就会变成服务器端渲染项目。性能指标会略有变化。LCP 指标会向左移动，在 HTML 和 CSS 下载之后立即出现，因为整个 HTML 都在初始服务器响应中发送，并且所有内容都能立即显示。

![](assets/rsc-nextjs/file-20251208161755691-1.png)

首先，如您所见，LCP 数值（当页面显示"Skeleton"时）应该会有显著提升（我们稍后会进行测量）。

然而，我们仍然需要以完全相同的方式下载、编译和执行相同的 JavaScript。因为页面应该是交互式的，也就是说，我们实现的所有下拉菜单、过滤器和排序算法都应该能正常工作。而在此期间，整个页面已经可见了！



`useEffect` 只在**浏览器端挂载后**执行。
`renderToString` 在服务器端运行时，会直接跳过这些副作用。
&#x20;所以：

* 数据请求不会在服务器跑；

* 组件显示的依然是空的 sidebar 或 loading；

* 直到客户端 JS 执行完、React “水合（hydrate）” 之后，`useEffect` 才开始请求数据。



HTML 已经显示出来，但 JS 还没加载完，因此：

* 按钮、下拉框都无法点击；

* 看起来“卡住了”。

| 渲染方式                  | LCP       | Sidebar 出现 | Toggle 可用 | 无交互期      |
| --------------------- | --------- | ---------- | --------- | --------- |
| Client-Side Rendering | 4.1s      | 4.7s       | 4.1s      | —         |
| Server-Side Rendering | **1.61s** | 4.7s       | 4.0s      | **2.39s** |



这种“无交互”的间隙，加上运行服务器的成本，是你从客户端渲染过渡到服务器端渲染时为 LCP 改进所必须付出的代价。没有办法消除它。我们只能通过减少用户在首次运行时需要下载的 JavaScript 量来将其最小化。

***

#### Fetching data in server side



我们已经处于服务器领域了，为什么不能在这里提取这些数据呢？这肯定会更快。至少，延迟和带宽可能会好得多。



添加数据fetch的逻辑，并将结果，作为Props传递给APP

```javascript
// Add data fetching to the SSR server
export const serveStatic = async (c) => {
  const html = fs.readFileSync('index.html').toString(); // Data fetching logic
  const sidebarPromise = fetch(`/api/sidebar`).then((res) =>
    res.json(),
  );
  const messagesPromise = fetch(`/api/messages`).then(
    (res) => res.json(),
  );

  const [sidebar, messages] = await Promise.all([
    sidebarPromise,
    messagesPromise,
  ]);

  // Pass fetched data as props
  const HTMLString = renderToString(
    <App messages={messages} sidebar={sidebar} />,
  );
};
```

然后我们的 `App` 组件需要修改以接受属性，并使用常规的 props drilling技术传递它们：

```javascript
// That's the entry point to the beautiful app
export default function App({ sidebar, messages }) {
  return (
    <SomeLayout>
      <Sidebar data={sidebar} />
      <MainContent data={messages} />
    </SomeLayout>
  );
}
```

理论上，这应该可以工作。实际上，我们需要处理一些额外的事情。

首先，“hydration”。

* 在 SSR（服务器端渲染）领域，“hydration”指的是 React 重新使用从服务器发送的现有 HTML 以附加事件监听器。

* 为了使 hydration 正常工作，从服务器发送的 HTML 应该与客户端完全相同。

* 但这是不可能的，因为客户端还没有获取到这些数据。只有服务器才有。

* 这意味着我们需要在发送 HTML 的同时，以某种方式将数据从服务器传递给客户端，以便在 React 初始化期间可用。



怎么把服务端得到的数据，给到客户端呢？

最简单的方法是将它嵌入到 HTML 中作为 script 标签，并将其作为对象附加到 `window`，这样，客户端可以通过Window这样全局对象，拿到数据



服务器端：

```javascript
const htmlWithData = `
  <script>
    window.__SSR_DATA__ = ${JSON.stringify({ sidebar, messages })}
  </script>${HTMLString}
`;
```

* `JSON.stringify({ sidebar, messages })`：把服务器拿到的真实数据（JS对象）转成字符串。

* 然后直接插到 `<script>` 里。

* 浏览器解析时，会执行这段 JS，创建一个全局变量 `window.__SSR_DATA__`。

这样浏览器端的 React 就能访问同样的数据了。

客户端（React 组件）：

```javascript
export default function App({ messages, sidebar }) {const sidebarData =typeof window === 'undefined'
      ? sidebar
      : window.SSR_DATA?.sidebar;
const messagesData =typeof window === 'undefined'
      ? messages
      : window.SSR_DATA?.messages;
```

* `typeof window === 'undefined'`
  &#x20;→ 这行是用来区分“当前运行环境”是 **服务器** 还是 **浏览器**。

* 在服务器上：`window` 不存在，所以用传进来的 `sidebar`、`messages` props。

* 在客户端：`window` 存在，所以改用 `window.__SSR_DATA__` 里的数据。

> 换句话说：
>
> * SSR 阶段：React 组件用服务器传的 props。
>
> * Hydration 阶段：React 组件从全局变量 `window.__SSR_DATA__` 拿到同样的数据。



实际上，这确实有效！性能结构将再次改变：

![](assets/rsc-nextjs/file-20251208161755691.png)



现在整个页面，包括之前动态的内容，将在 CSS 完成下载后立即可见。然后我们仍然需要等待与之前完全相同的 JavaScript，只有到那时页面才会变得可交互。





| 渲染方式                            | 特点                             | 优点         | 缺点                   |
| ------------------------------- | ------------------------------ | ---------- | -------------------- |
| **Client-Side Rendering (CSR)** | 浏览器下载一个空HTML，等JS加载后再请求数据、生成DOM | 架构简单       | 用户看到内容晚（要等JS执行完）     |
| **SSR + Client Data Fetching**  | 服务器只渲染空壳HTML，数据在客户端加载          | 首屏比CSR快一点  | 内容仍然是异步加载（数据慢）       |
| **SSR + Server Data Fetching**  | 服务器连数据都提前拿好，直接生成完整HTML返回       | 页面内容几乎立刻可见 | LCP可能略高（因为要等待服务器取数据） |



| 指标              | Client-Side Rendering | SSR (Client Fetch) | SSR (Server Fetch) |
| --------------- | --------------------- | ------------------ | ------------------ |
| **LCP**（内容出现时间） | 4.1s / 800ms          | 1.61s / 800ms      | **2.16s / 1.24s**  |
| **Sidebar出现**   | 4.7s / 1.5s           | 4.7s / 1.5s        | **2.16s / 1.24s**  |
| **Messages出现**  | 5.1s / 2s             | 5.1s / 2s          | **2.16s / 1.24s**  |
| **可交互时间**       | 4.1s / 800ms          | 4s / 900ms         | 4.6s / 1.4s        |
| **交互延迟差**       | —                     | 2.39s / 100ms      | 2.44s / 150ms      |

* **SSR + Server Fetching** 页面内容几乎立刻可见（因为服务器渲染时就把数据放进去了）。

* 但 **LCP（主要内容加载时间）变慢了**，因为服务器要先请求数据再渲染。

* 换句话说，**渲染开始变慢，但渲染结果更完整**。

* “Sidebar 和 Messages” 提前显示出来，就是因为服务端提前取好了数据。



```javascript
export const serveStatic = async (c) => {
  // 向 API 请求两个数据
  const sidebarPromise = fetch(`/api/sidebar`).then((res) => res.json());
  const statisticsPromise = fetch(`/api/statistics`).then((res) => res.json());

  // 等待两个请求都完成
  const [sidebar, statistics] = await Promise.all([
    sidebarPromise,
    statisticsPromise,
  ]);

  ... // 接下来用这些数据进行SSR渲染
};

```



我们确实需要等待它们，因为我们需要这些数据才能开始渲染任何内容。



* 如果你在意“用户能尽快看到完整页面”，那这是改进；

* 如果你更在意“最快看到首屏内容（LCP）”，那可能会稍微变差；

* 所以要根据产品需求权衡：

  * 比如，只让服务器预取 Sidebar，而让 Messages 仍由客户端请求。



***



### Nextjs Page Router



要将我的自定义 SSR 实现迁移到 Next.js Pages Router，我只需要将获取逻辑移动到 getServerSideProps 中。这是旧版 Next.js 用于在服务器上获取页面数据的 API。其他所有内容，包括属性穿透，都保持不变！Next.js 只是抽象掉了 `renderToString` 调用和我们为手动实现所做的查找和替换逻辑。



```javascript
export const getServerSideProps = async () => {
  const sidebarPromise = fetch(`/api/sidebar`).then((res) =>
    res.json(),
  );
  const messagesPromise = fetch(`/api/messages`).then(
    (res) => res.json(),
  );

  const [sidebar, messages] = await Promise.all([
    sidebarPromise,
    messagesPromise,
  ]);

  // Pass data to the page via props
  return { props: { messages, sidebar } };
};
```

| 模式                                     | LCP（无缓存 / JS缓存） | Sidebar（无缓存 / JS缓存） | Messages（无缓存 / JS缓存） | 可交互时间（无缓存 / JS缓存） | 无交互间隙         |
| -------------------------------------- | --------------- | ------------------- | -------------------- | ----------------- | ------------- |
| **Client-Side Rendering**              | 4.1s / 800ms    | 4.7s / 1.5s         | 5.1s / 2s            | 4.1s / 800ms      | —             |
| **Server-Side Rendering（客户端fetching）** | 1.61s / 800ms   | 4.7s / 1.5s         | 5.1s / 2s            | 4s / 900ms        | 2.39s / 100ms |
| **Server-Side Rendering（服务端fetching）** | 2.16s / 1.24s   | 2.16s / 1.24s       | 2.16s / 1.24s        | 4.6s / 1.4s       | 2.44s / 150ms |
| **Next.js Pages（客户端fetching）**         | 1.76s / 800ms   | 3.7s / 1.5s         | 4.2s / 2s            | 3.1s / 900ms      | 1.34s / 100ms |
| **Next.js Pages（服务端fetching）**         | 2.15s / 1.15s   | 2.15s / 1.15s       | 2.15s / 1.15s        | 3.5s / 1.25s      | 1.35s / 100ms |



Next.js 的 **LCP 值**（页面主要内容出现时间）比作者自己写的定制实现还要稍微差一点。
但另一方面，在 Next.js 的这个用例中，**Sidebar 和 Messages 的出现时间** 比作者的实现 **提前了整整 1 秒**。



在“Server Data Fetching”的情况下，**LCP / Sidebar / Messages** 这三项的时间在两种实现之间几乎完全一致；


不过，**“无交互间隙（no interactivity gap）”** ——也就是“页面可见但尚未可操作”的时间差——在 Next.js 中要 **短整整 1 秒**。



这正是一个非常典型的例子，说明了当 **代码分割（code splitting）策略不同** 时会发生什么。

Next.js 会把 JavaScript 分割成 **更多的小块（chunks）**。


结果是：

* 在初次加载时，更多的 JS 文件同时并行下载；

* 它们会 **稍微“抢占”一点带宽**，让 **CSS 下载时间更长**，因此 **LCP 值稍微变差**；

* 但同时，**这些更小的 JS 文件整体下载完成得更快**，
  &#x20;→ 导致 **页面更早变得可交互**，
  &#x20;→ 于是 **“无交互间隙”显著缩短**。



### RSC的目标



在CSR和SSR中

* 发送HTML到Client

* 加载js

* Fetch Data



这三件事是相互阻塞的，我们事实上在改变事情发生的顺序，我们无法并行的做这几件事，这是最大的问题

其次是无法解决，快速的首屏伴随很长的无交互时间的问题，以及fetch Data的长耗时带来的阻塞问题

![](assets/rsc-nextjs/file-20251208161755689-1.png)

相互阻塞，这是因为服务器渲染目前是一个同步过程。我们先等待所有数据，然后将这些数据传递给 `renderToString` ，最后将结果发送给客户端。



但如果我们的服务器可以更智能呢？那些 fetch 请求是 Promise，异步函数。从技术上讲，我们不需要等待它们开始做其他事情。如果我们能够：



1. **触发所有 fetch**（开始获取数据）

2. 开始渲染不需要那些数据的 React 组件，如果准备好了，立即发送给客户端。

3. 当 Sidebar 或 Messages 的数据加载好时，再渲染它们的 HTML，并**流式注入**到客户端



要做到这一点，React 必须：

* 放弃同步的 `renderToString`

* 支持分块渲染（chunked rendering）

* 能把这些块按顺序发送到客户端并动态注入



这正是 **React Server Components（RSC）+ Streaming（流式渲染）** 的核心设计目标。
它让 React 既能在服务器上异步获取数据、流式输出 HTML，
又能保持组件化结构，让用户更早看到内容。



### RSC



传统的React组件，

在当前的 SSR 实现中，无论是 Next.js 页面还是我自己的 DIY 解决方案，从 React 组件中提取这棵element树的过程都会发生两次。第一次是在服务器上进行预渲染时。第二次是完全从头开始，在初始化客户端 React 时。



如果我们在服务器上首次生成那棵树时将其保留并发送给客户端呢？

如果 React 能够从那个对象中重新创建虚拟 DOM 树，我们就能一石二鸟

* 我们不需要将这个组件发送到 JavaScript 打包文件中，从而减少了 JavaScript 的大小

* 我们不需要迭代调用所有这些函数并将它们的返回值转换为树，从而减少了编译和执行 JavaScript 所需的时间。



如何将数据发送到客户端？我们已经知道怎么做，我们之前已经为 SSR 获取的数据这样做了！通过将其嵌入到 `<script>` 标签中并将其附加到 `window` 上。

```javascript
// return this in the server response
const htmlWithData = `
        <script>window.__REACT_ELEMENTS__ = ${JSON.stringify({
          "type": "div",
          "props": { "children": [...] }
        })}</script>
        ${HTMLString}`;
```

我们刚刚作为一个理论可能性所发明的是 React Server Components

如果我将项目迁移到 Next.js App Router（服务器组件），我会在服务器提供的 HTML 中看到这一点：

```sql
<script>self.__next_f.push([1,"6:[\"$\",\"div\",null,{\"className\":\"w-full h-full flex flex-col lg:flex-row\",\"children\":[\"$\",\"div\",null,{\"className\":\"flex flex-1 h-full overflow-y-auto flex..."
</script>
```

可以查看 Chrome 底部的 Elements 标签页。你会在其中一个 `<script>` 标签中看到完全相同的内容。



理论上，这就是关于服务器组件的所有你需要知道的内容。

这些组件在“服务器”端预先运行，它们的代码以及它们使用的所有库都保留在服务器端。只有生成的 RSC 有效载荷，即上面那个奇怪的结构，才会发送到客户端。



### Async Components



在传统 React 中，**组件必须是同步函数**，不能直接 `await fetch()`。
&#x20;如果想请求数据，你要么用 `useEffect`，要么手动在外层加载完数据再渲染组件。

但在 **React Server Components (RSC)** 体系里，
&#x20;React 允许你写：

```javascript
async function MyComponent() {
  const data = await fetch('/api/data')
  return <div>{data.title}</div>
}
```

这是因为：

* 该组件在服务器上执行；

* React 会自动识别它是异步的；

* 等 `fetch()` 结束后再继续生成 HTML 或 RSC payload；

* 这些结果会被流式发送（或缓存）到客户端。

因此：

&#x20;✅ 不需要在客户端再发请求。

&#x20;✅ 不会阻塞整个渲染，只会等待该组件的部分。



### &#x20;Streaming

传统 SSR（`renderToString`）流程是：

1. React 把整个组件树渲染成完整 HTML；

2. 等全部完成后；

3. 一次性把 HTML 发给浏览器。

问题：如果有一个组件在等数据，全局都卡住了。

而 **Streaming SSR**（流式渲染）则是：

1. React 不等所有数据都准备好；

2. 哪个部分先准备好了，就**立即发送对应 HTML 块**；

3. 浏览器收到这部分后就能立刻显示；

4. 其他块（例如异步组件）准备好后，再陆续发送。

> 这样用户几乎立刻能看到页面内容（哪怕部分是占位符）。

***

⚠️ 关键点：Chunk 边界是由 `<Suspense>` 决定的

> The chunk boundaries... are components wrapped in Suspense.
> &#x20;Remember that, it’s crucial.

也就是说：

* React 会以 **Suspense 边界** 作为分块单位；

* 每个 `<Suspense>` 就像一个“可独立加载的区域”；

* 数据没准备好时，它先显示 fallback（例如 Skeleton）；

* 数据准备好时，就把这块更新发送到客户端。

所以 `<Suspense>` 是流式渲染的“切片边界点”。

***

🧱 为什么要用框架（Next.js）


&#x20;自己试着用原生 React API 去实现 Streaming SSR，
&#x20;结果非常麻烦（`renderToPipeableStream` 要处理超多细节、边界情况）。

> 所以用框架更现实。
> &#x20;Next.js App Router basically = React Server Components + Streaming.

也就是说：

* **Next.js 的 App Router 模式** 天然集成了
  &#x20;✅ 服务器组件（RSC）
  &#x20;✅ 异步组件（Async Component）
  &#x20;✅ 流式渲染（Streaming SSR）

* 而其他框架（如 React Router）才刚刚开始尝试支持。

目前：

> “Next.js = React Server Components + Streaming 的代名词”



### Next App Router without Streaming

迁移到

> Next.js 做了太多优化、缓存、打包处理、预取策略等「隐性工作」，
> &#x20;直接迁移整个项目，根本无法判断性能变化到底来自哪里。

所以他决定：

> 先只迁移到 App Router（不使用 Server Components），
> &#x20;让它**完全模拟旧版行为**，以便隔离框架本身的性能变化。



* 旧项目是用 **Next.js Pages Router**

* 新项目是 **Next.js App Router**

* 迁移方式：

  1. 调整路由结构；

  2. 在每个入口文件加上 `"use client"`；
     &#x20;→ 强制所有组件都是 Client Components；
     &#x20;→ 暂时**不启用 Server Components 或 Streaming**。

这样迁移后：

> 渲染逻辑几乎没变，数据仍在客户端获取。
> &#x20;因此性能差异只来自框架本身，而不是新特性。



| 模式                                      | LCP (无缓存)    | Sidebar     | Messages    | 交互可用时间      | 无交互间隙 |
| --------------------------------------- | ------------ | ----------- | ----------- | ----------- | ----- |
| **Client-Side Rendering**               | 4.1s         | 4.7s        | 5.1s        | 4.1s        | —     |
| **SSR (客户端取数据)**                        | 1.61s        | 4.7s        | 5.1s        | 4s          | 2.39s |
| **SSR (服务器取数据)**                        | 2.16s        | 2.16s       | 2.16s       | 4.6s        | 2.44s |
| **Next.js Pages (Client Fetch)**        | 1.76s        | 3.7s        | 4.2s        | 3.1s        | 1.34s |
| **Next.js Pages (Server Fetch)**        | 2.15s        | 2.15s       | 2.15s       | 3.5s        | 1.35s |
| **Next.js App Router (Lift-and-Shift)** | 🟢 **1.28s** | 🔴 **4.4s** | 🔴 **4.9s** | 🔴 **3.8s** | 2.52s |



🟢 好消息：

* **LCP（Largest Contentful Paint）** = 1.28 秒
  &#x20;→ 比 Pages 版本快约 500ms，说明首屏渲染更快。

🔴 坏消息：

* 其他关键阶段（Sidebar、Messages、交互）**都慢了约 700ms**
  &#x20;→ 整体响应速度反而下降。


![](assets/rsc-nextjs/file-20251208161755689.png)

主要原因在于CSS加载的方式不同，这事实上不重要

Pages 版本：

* CSS 与 JS **并行加载**；

* JS 占用带宽，导致 CSS 稍慢；

* 因此 LCP 较慢。

App Router：

* 优先加载 CSS；

* JS 在 CSS 完成后再下载；

* 页面样式更早稳定（LCP 提升），
  &#x20;但 JS 执行更晚（交互延迟）。

→ 这解释了：

* LCP 提升约 500ms；

* 其他交互阶段变慢约 700ms。



### Next App Router with Streaming



改为在服务器端取数据（Server Fetching），利用 React Server Components（RSC）。

| 模式                                       | LCP       | Sidebar   | Messages  | Toggle interactive | 无交互间隙 |
| ---------------------------------------- | --------- | --------- | --------- | ------------------ | ----- |
| Next.js App router (Lift-and-shift)      | 1.28s     | 4.4s      | 4.9s      | 3.8s               | 2.52s |
| **Next.js App router (Server Fetching)** | **1.78s** | **1.78s** | **1.78s** | 4.2s               | 2.42s |



**而且奇怪的是：**
&#x20;LCP、Sidebar、Messages 全变成相同的数值 (1.78s)。
&#x20;这说明：

> React 在等待所有 async 组件都完成后，才一次性发送整个 HTML。

这就和 **传统 SSR** 一样：

* 没有任何「流式分块（Streaming）」；

* 没有「边加载边显示」；

* 没有 Suspense → 没有流。



React Streaming 的关键点是：

> React **只会**以 Suspense 边界为「chunk 边界」。

如果你不加 `<Suspense>`：

* React 会等待每个异步组件全部完成；

* 没有一个“可以先发出去”的节点；

* 整个页面变成一坨“大块 HTML”，一次性发送；

* RSC 的 Streaming 效果被完全关闭。



✅ 正确的写法：加入 `<Suspense>`

```javascript
<Suspense fallback={<div>Loading inbox...</div>}>
    <InboxWithFixedBundlePage messages={messages} />
</Suspense>
```

**效果：**

* React 先渲染「关键路径」(上层内容)，生成首个 HTML Chunk；

* 同时等待 Suspended 的 Sidebar / Messages；

* 数据一到，就把相应部分「填补」回页面；

* 浏览器侧用户体验：先看到主要框架，再逐步出现内容。



| 模式                                                     | LCP       | Sidebar   | Messages  | Toggle interactive | 无交互间隙 |
| ------------------------------------------------------ | --------- | --------- | --------- | ------------------ | ----- |
| **Next.js App router (Server Fetching with Suspense)** | **1.28s** | **1.28s** | **1.28s** | 3.8s               | 2.52s |



🎉 LCP 又回到最快值 1.28s！

* Sidebar 和 Messages 同步返回；

* 说明 React 将它们打包进了同一批流式块中；

* 所有内容「一起流到客户端」，快且高效。



性能分析图变得很有趣

![](https://ai.feishu.cn/space/api/box/stream/download/asynccode/?code=MDM5YzNkZGU4MDM3ZmUzY2EzNjk5YTU2ZWQyZDFiYmZfbzRnNmpWQWZjM3JsdzZpeThVczFiY1NoZ3F1Rmgzb0NfVG9rZW46U1I1MGJZYWxUb3hhZ0p4TzZNemN0SmRKbjhvXzE3NjUxODE1MTM6MTc2NTE4NTExM19WNA)

看到网络部分那个长长的 HTML 条了吗？那是服务器保持连接以等待数据。

![](https://ai.feishu.cn/space/api/box/stream/download/asynccode/?code=ZjRkOGNkMmE0YzdiYjAzMDVkNTNkNTg5OTk4MTdmMjFfblJTUHQzMlNFUEVYcHBiNGdDQXU3TU9ZaW1PekRGU0dfVG9rZW46TUZ6R2JQeUhzb3V5ZVp4VFNjWmNRMTZWbnRkXzE3NjUxODE1MTM6MTc2NTE4NTExM19WNA)

HTML 一旦完成就立即完成，无需等待。



## 性能总结

React Server Components + Streaming（即 Next.js App Router）确实能更快，但前提是你必须正确使用 Suspense 和服务端数据获取，否则反而会更慢。



| 模式                                               | 特点                                     | 优点                  | 缺点                                   |
| ------------------------------------------------ | -------------------------------------- | ------------------- | ------------------------------------ |
| **Client-Side Rendering (CSR)**                  | 数据在客户端用 `useEffect` 拉取                 | 页面交互最早可用；切页最快       | 首次加载最慢（LCP 最差）                       |
| **Server-Side Rendering (Client Data Fetching)** | HTML 在服务端生成，但数据仍在客户端请求                 | 首屏加载比 CSR 快         | JS 启动前页面“不可交互”（no interactivity gap） |
| **SSR (Server Data Fetching)**                   | HTML 和数据都在服务端生成                        | 页面完整显示更早            | 生成 HTML 时间变长；仍有交互延迟                  |
| **Next.js Pages（传统版）**                           | 等价于 SSR + 各页面预取                        | 稳定成熟，开发简单           | 性能中规中矩                               |
| **Next.js App Router（Server Components）**        | 支持 React Server Components + Streaming | 正确使用 Suspense 后首屏最快 | 错误配置（忘加 Suspense）会比以前更慢；开发复杂度高       |

### 🧠 主要结论详解

1. **CSR 是最慢的，但交互最流畅。**
   &#x20;页面完全由客户端生成，加载时间最长，但一旦出现内容，用户马上能点、能滑，交互无延迟。

2. **SSR 极大提升了首屏速度，但引入“交互空白期”。**
   &#x20;页面虽然很快出现，但 JS 还没加载完，此时按钮点击、输入框等全都“假死”，这是 SSR 常见的“no interactivity gap”。

3. **服务端拉数据（Server Data Fetching）让“完整页面”更早出现。**
   服务端直接拿到数据再渲染 HTML，可以让用户更早看到完整内容（不用等前端拉取），但总体渲染时间略长。

4. **迁移到 App Router 如果没加 `<Suspense>`，性能会退步。**
   &#x20;因为 Streaming 渲染的分块点是由 `<Suspense>` 决定的。
   &#x20;👉 没加 Suspense，就会让整个页面变成一个大块，必须等所有异步数据都返回才能一次性发送，退化成传统 SSR。

5. **加上 `<Suspense>` 后，性能才真正提升。**
   &#x20;React 会先渲染“关键内容”，然后等待 Suspense 内的异步组件加载完成，再流式发给客户端。
   &#x20;这样用户能更早看到主要内容（LCP 改善）。

6. **Server Components 本身不会显著加速。**
   &#x20;它的“快”来自 **Streaming + Suspense + 服务端数据获取**，
   &#x20;而不是“组件在服务端渲染”这个事实本身。

7. **Next.js App Router 的 JavaScript 下载延迟，可能反而让交互更慢。**
   &#x20;因为它拆分得更多，JS 加载逻辑复杂，有时导致“no interactivity gap”更大。

***

| 渲染方式                                                         | LCP *(no cache / JS cache)* | Sidebar *(no cache / JS cache)* | Messages *(no cache / JS cache)* | Toggle interactive *(no cache / JS cache)* | No interactivity gap | 说明                                         |
| ------------------------------------------------------------ | --------------------------- | ------------------------------- | -------------------------------- | ------------------------------------------ | -------------------- | ------------------------------------------ |
| **Client-Side Rendering (CSR)**                              | 4.1s / 0.8s                 | 4.7s / 1.5s                     | 5.1s / 2.0s                      | 4.1s / 0.8s                                | —                    | 完全由客户端渲染，加载最慢但立即可交互                        |
| **Server-Side Rendering (Client Data Fetching)**             | 1.61s / 0.8s                | 4.7s / 1.5s                     | 5.1s / 2.0s                      | 4.0s / 0.9s                                | **2.39s / 0.1s**     | HTML 来自服务端，但数据仍在客户端请求；加载快但有“交互空白期”         |
| **Server-Side Rendering (Server Data Fetching)**             | 2.16s / 1.24s               | 2.16s / 1.24s                   | 2.16s / 1.24s                    | 4.6s / 1.4s                                | **2.44s / 0.15s**    | 服务端先取数据再渲染，首屏完整但生成耗时稍高                     |
| **Next.js Pages (Client Data Fetching)**                     | 1.76s / 0.8s                | 3.7s / 1.5s                     | 4.2s / 2.0s                      | 3.1s / 0.9s                                | **1.34s / 0.1s**     | 旧版 Next.js，客户端取数据；表现稳定                     |
| **Next.js Pages (Server Data Fetching)**                     | 2.15s / 1.15s               | 2.15s / 1.15s                   | 2.15s / 1.15s                    | 3.5s / 1.25s                               | **1.35s / 0.1s**     | 旧版 Next.js，使用 getServerSideProps 获取数据；体验良好 |
| **Next.js App Router (Lift-and-shift)**                      | 1.28s / 0.65s               | 4.4s / 1.5s                     | 4.9s / 2.0s                      | 3.8s / 0.9s                                | **2.52s / 0.25s**    | 直接迁移到 App Router，但未优化；性能不理想                |
| **Next.js App Router (Server Fetching, Forgotten Suspense)** | 1.78s / 1.2s                | 1.78s / 1.2s                    | 1.78s / 1.2s                     | 4.2s / 1.3s                                | **2.42s / 0.1s**     | 使用服务端拉数据，但忘了 Suspense；退化为普通 SSR            |
| **Next.js App Router (Server Fetching with Suspense)**       | **1.28s / 0.75s**           | **1.28s / 0.75s**               | **1.28s / 1.1s**                 | 3.8s / 0.8s                                | **2.52s / 0.05s**    | 正确使用 Suspense 和流式渲染；LCP 最快、整体最优            |

***

## Next js的问题



1. **乐观更新变得困难或不可能 (Optimistic Updates are Impossible)**

   * **问题**: 由于服务器组件 (RSC) 渲染后无法修改，任何需要交互和状态（如乐观更新）的部分都必须是客户端组件 (`"use client"`)。

   * **后果**: 这迫使开发者将本应一体的组件强行拆分成多个文件：一个极小的服务器组件仅用于初始数据获取，再嵌套一个包含所有逻辑和 UI 的客户端组件。这种结构非常笨拙，难以维护。

2. **每次导航都会重新获取数据 (Every Navigation is Another Fetch)**

   * **问题**: App Router 的模型规定，每次页面导航都会向服务器发起请求以获取 RSC 载荷，**即使客户端已经拥有所需的数据**。

   * **后果**: 这导致了不必要的网络请求和加载状态。例如，从首页跳转到其他页再返回首页，会重新显示加载动画，而不是像单页应用 (SPA) 那样瞬间渲染。作者认为这对于动态应用是“令人恼火的”，因为客户端明明有能力立即渲染页面。

   * **延伸问题**: 这种模式也无法实现精细的加载体验（比如先展示部分已有数据，再加载剩余数据），因为 `loading.tsx` 会将整个页面替换为骨架屏。

3. **双重数据载荷，浪费带宽 (You Still Download All the Content Twice)**

   * **问题**: 在页面首次加载时，服务器会发送一份用于快速显示的 HTML，但紧接着又会在 `<script>` 标签里嵌入一份几乎相同内容的 RSC 载荷 (一种特殊的 JSON 格式)。

   * **后果**: 这使得初始页面的下载体积几乎翻倍。作者指出，RSC 载荷的格式效率低于 HTML，并且这种重复是 RSC 架构的固有问题，无法避免。他以 Next.js 官网为例，指出页面内容被下载了两次，并质问这种设计是否在浪费带宽。

4. **Layout (布局) 被人为地限制 (Layouts are Artificially Restricted)**

   * **问题**: Layout 组件无法访问请求的详细信息，这使得在不同层级的组件间共享数据（如共享 `QueryClient` 实例）变得不可能。

   * **后果**: 开发者必须在每个 Layout 中重复获取数据，或者只能依赖 Next.js 内置的 `fetch` 缓存机制。作者认为这些规则过于复杂，难以理解和向团队成员解释。



### 乐观更新问题详解：



它讨论的是：

> 在使用 Next.js App Router（基于 React Server Components）时，
> &#x20;当页面需要 **可变交互（mutations）或实时数据（WebSocket）** 时，
> &#x20;RSC 架构会让代码拆分得非常零碎，维护困难。

换句话说：
**RSC 理论上很优雅，实践中一旦需要交互，就非常麻烦。**

***

作者指出 Next.js 官方文档几乎**没有提到“乐观更新 (optimistic update)”**&#x7684;做法。

&#x20;而在现代交互式应用中，乐观更新非常常见，比如：

> 你点击“修改昵称”，UI 立即更新为新名字（不等服务器返回），
> &#x20;然后异步发请求去保存；如果失败再回滚。

但在 **React Server Components 模型**中：

* **Server Components** 是 **纯静态**的，不能在渲染后再被修改。

* 所以 **所有可能变化的内容**（即交互）必须放到 **Client Component** 中。

* 可是 Client Component 又 **不能直接进行数据获取**（fetch、数据库操作）。

于是就出现了一个矛盾：

> 🔄 数据要在 Server Component 里取，
> 💬 但交互逻辑要在 Client Component 里做。
> ⚙️ 因此你被迫拆成多个文件。

***

#### 1️⃣ 服务器端页面：`page.tsx`

```typescript
export default async function Page() {
    const user = await fetchUserInfo(username);
    return (
      <ProfileLayout>
        <UserProfile user={user} />
      </ProfileLayout>
    );
}
```

* 这是一个 **Server Component**。

* 它 **在服务器上请求数据**（`fetchUserInfo`），然后把结果传给 `<UserProfile />`。

* 但 `UserProfile` 必须是 `"use client"` 的，因为它有交互。

***

#### 2️⃣ 客户端组件：`UserProfile.tsx`

```typescript
"use client";

export function UserProfile({ user: initialUser }) {
  const [user, optimisticUpdateUser] = useState(initialUser);

  async function onEdit(newUser) {
    optimisticUpdateUser(newUser);  // 乐观更新
    const resp = await fetch("...", { method: 'POST', body: JSON.stringify(newUser) });
    if (!resp.ok) /* 错误处理 */
  }

  return <main>{/* 编辑 UI */}</main>;
}
```

* 这是一个 **Client Component**。

* 只能运行在浏览器中。

* 它：

  * 拿到从服务器传来的初始数据。

  * 在本地维护副本（`useState`）。

  * 提交修改时先本地更新 → 再发请求 → 再处理错误。

📍 问题是：

> 这导致 **页面的静态部分**（比如布局、导航栏）和 **动态部分** 被强行拆开。

***



作者提到他们公司的真实项目：

> 几乎所有页面的 UI 都会显示动态数据（在线状态、消息数、任务状态……）。
> &#x20;并且通过 WebSocket 实时同步。

这就意味着：

* 几乎所有组件都有状态变化；

* 所以几乎所有组件都得 `"use client"`；

* 因此整个页面都变成 **Client-Side 渲染**；

* 这就丢失了 RSC 的性能优势。

> 🔄 最终他们的“App Router 项目”，几乎等价于传统的 CSR。

***

### 他们在公司内部的做法（TanStack Query 示例）

接下来作者展示了一个他们在工作中实际用的更复杂的结构：

#### 1️⃣ 定义数据查询函数（可以前后端通用）

```typescript
// src/queries/users.ts
export const queryUserInfo = (username) => ({
  queryKey: ['user', username],
  queryFn: async () => /* fetch data */
});
```

***

#### 2️⃣ 服务器端页面获取数据

```typescript
// src/app/user/[username]/page.tsx
export default async function Page({ params }) {
  const { username } = await params;
  const queryClient = new QueryClient();
  await queryClient.ensureQueryData(queryUserInfo(username));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientPage />
    </HydrationBoundary>
  );
}
```

* Server Component 执行数据预取。

* 使用 TanStack Query 的 `dehydrate()` 把数据转为 JSON。

* 用 `HydrationBoundary` 传递给客户端（即**状态注水**，Hydration）。

* 然后再渲染 `<ClientPage />`。

***

#### 3️⃣ 客户端页面：`ClientPage.tsx`

```typescript
"use client";

export function ClientPage() {
  const { username } = useParams();
  const { data: user } = useSuspenseQuery(queryUserInfo(username));
  return <main>{/* 交互式页面 */}</main>;
}
```

* 客户端通过 `useSuspenseQuery` 获取同一个数据。

* 由于有 `HydrationBoundary`，首次渲染时不会重新请求。

* 后续交互可以在客户端直接更新状态。

***

作者指出：

> 这一切的结构非常复杂，必须拆成 3 个文件：
>
> * `page.tsx`：Server Component，负责数据预取；
>
> * `ClientPage.tsx`：Client Component，负责交互；
>
> * `queries/users.ts`：共享数据逻辑；
>
> 在旧的 Pages Router 时代，这些都能写在一个文件里，因为 `getServerSideProps` 会自动处理预取和传递数据。

