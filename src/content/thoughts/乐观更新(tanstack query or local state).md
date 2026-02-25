---
date: 2026-02-25T14:12:00
---
### 乐观更新

乐观更新的本质是预测了服务端的行为，然后在客户端实现，从而规避网络请求带来阻塞的技术

Tanstack Query 中，将乐观更新的策略分为两种

1. 通过 UI
2. 修改 cache

使用哪种方法取决于屏幕上是否同时渲染了多个依赖这个状态的组件
由于 UI 方式没改数据源，回导致只有触发更新的组件提前更新，进行渲染不一致的问题

### UI 方式

```
mutation → 临时渲染 → 等服务器 → 重新 fetch
```

没有改数据源，只是临时画出来。

这个方法 _不操作缓存_，而是通过 `useMutation` 返回的数据状态来控制 UI。

流程：

1. 用户触发 `mutate(text)`
2. 通过 `mutation.variables` 拿到当前 mutation 的参数（比如新 todo 文本）
3. UI 在 mutation 处于 “pending（进行中）” 时暂时渲染这条数据
4. mutation 成功后触发重新获取数据（invalidateQueries），真正刷新列表
5. 若失败，可以通过 `isError` 显示错误项、重试按钮等

```js
const { isPending, variables } = useMutation({...})  
  
<ul>  
  {todos.map(todo => <li>{todo.text}</li>)}  
  {isPending && <li style={{ opacity: 0.5 }}>{variables}</li>}  
</ul>
```


优点：

- 代码简单、逻辑直观
- 不需要手动维护缓存或回滚策略

缺点：

- 只能在本组件显示这个临时数据
- 如果多个地方需要显示这个变更（跨组件），这个方法不够通用

---

### 缓存方式

```
mutation → 直接改 query cache → 所有订阅者更新
```

改的是“单一事实来源”。

这个方案会在 mutation 开始前：

1. 先 **暂停当前查询**
2. 用 `setQueryData` 手动把新数据合并到缓存来更新 UI
3. 在 `onMutate` 返回之前的快照（用于回退）
4. 如果 mutation 失败，在 `onError` 里把缓存恢复成旧值（回滚）
5. 不论成功或失败，最后通过 `invalidateQueries` 让后台重新拉真实数据

核心代码结构：

```js
useMutation({  
  onMutate: async (newTodo) => {  
    await queryClient.cancelQueries(['todos'])  
    const previous = queryClient.getQueryData(['todos'])  
    queryClient.setQueryData(['todos'], old => [...old, newTodo])  
    return { previous }  
  },  
  onError: (err, newTodo, context) => {  
    queryClient.setQueryData(['todos'], context.previous)  
  },  
  onSettled: () => {  
    queryClient.invalidateQueries(['todos'])  
  },  
})
```

优点：

- 适合多个组件共享同一列表时立即同步 UI
- 改变的是缓存，全局状态能被所有使用该查询的组件感知

缺点：

- 需要处理 “回滚逻辑”（失败恢复）
- 代码比第一种方式稍复杂些

### 并发乐观更新

为什么会出现“并发乐观更新不一致”

主要原因

- 乐观更新本质是手动修改 cache
- 但后台的 query 或其他 mutation 也会写入 cache
- 如果这些操作没有正确序列化，会覆盖彼此的结果

解决思路

1. 取消可能干扰的正在进行的 query（避免旧数据覆盖）
2. 控制 invalidate 的触发，使它不会覆盖仍在进行的 mutation 的乐观更改

整体原则是：

> **减少无意义的异步覆盖，让乐观更新尽可能在真实状态确定之前保持一致。**

当一个 mutation 正在 optimistically 更新缓存时，如果另外一个 mutation 也开始了，就可能在一些**时间窗口内造成 UI 状态被覆盖**：

情况一：后台有请求在跑时发起 mutation

例子流程：

1. 某个 query 正在后台自动刷新（比如 focus or refetch）
2. 你触发一个乐观更新
3. 未完成的后台 refresh 在 mutation 之后完成
4. 刷新结果把你的乐观修改覆盖掉（UI 回退到旧状态）

这种“突兀闪回 UI”就叫 **window of inconsistency（不一致窗口）**。

为避免“过时的请求”把乐观更新覆盖，最佳做法是在 `onMutate` 里做：
`await queryClient.cancelQueries(...)`
这样 mutation 开始后会 **终止所有可能干扰该缓存的后台请求** → 不会有旧响应回来破坏 UI。

即便取消了 query，再有两个 mutation 合并的时候也可能出现问题：

- mutation A 开始并做乐观更新
- mutation B 很快开始
- mutation A 结束后触发 invalidate → refetch
- 如果 invalidate 的结果比 B 的 mutation 还快，它可能把 B 的乐观更新覆盖掉

这会导致 UI “回退后再更新”，表现为状态闪烁。

解决这个问题的核心优化技巧：

默认我们在 `onSettled` 调用：

`queryClient.invalidateQueries(...)`

每个 mutation 都会触发一次，这在 mutation 很密集时容易引发 UI 反复刷新，反而破坏乐观更新的连贯性。

解决这个问题的核心优化技巧：
```
if (queryClient.isMutating() === 1) {  
  queryClient.invalidateQueries(...)  
}
```

也就是说：  
**只有在没有其他 mutation 正在跑时才 invalidate。**  
这样：

- mutation A 结束但 B 仍在跑 → 不触发 invalidate（避免覆盖 B 的修改）
- 总体上减少了重复无意义的刷新
- UI 更稳定、不会闪烁

这个逻辑可以根据 mutationKey 进一步缩小范围，只对相关的 mutation 计数，而不是所有 mutation。

### 类型安全

在常见写法里：

```js
queryClient.setQueryData(['todos'], (old) => [...old, newTodo])
```

问题：

- `old` 的类型通常是 `unknown` 或宽泛类型
- 你返回什么结构，TypeScript 不一定能检查出来
- 一旦写错结构 → UI 运行时崩溃（例如组件期望字段不存在）

也就是说：

 **Tanstack Query 不知道你的 query key 对应的数据结构**

所以它没法自动保证类型。

在 TanStack Query v5 里，官方强化了一个模式：**把 queryKey 和数据类型绑定在一起**

核心工具就是：`queryOptions()`

它的作用不是“新功能”，而是：

> 给 queryKey 附带类型信息，让整个链路可推断。

示例：

```js
const todosQuery = queryOptions({  
  queryKey: ['todos'],  
  queryFn: fetchTodos,  
})
```

关键在于：

> `queryOptions` 会把 `queryFn` 的返回类型记录到这个配置对象里。

然后这个类型会一路传到 `useQuery`、`setQueryData` 等 API。

之后：

```js
useQuery(todosQuery)  
  
queryClient.setQueryData(todosQuery.queryKey, (old) => {  
  // old 的类型现在是 Todo[]  
})
```


这里的关键变化：
- `old` 自动推断为 `Todo[] 
- 返回值必须匹配 `Todo[]`
- 类型错误会直接在编译期报错

所以：**类型安全来自“共享的 query 配置对象”，不是 setQueryData 本身**

在 v4 也能手动写泛型：

`queryClient.setQueryData<Todo[]>(['todos'], ...)`

但问题是：
- 泛型容易写错或忘写  
- queryKey 和类型没有绑定关系

v5 的设计目标就是：把“类型来源”集中在 query 定义处

① 定义（只做一次）
```js
const todosQuery = queryOptions({  
  queryKey: ['todos'],  
  queryFn: fetchTodos,   // ← 类型从这里来  
})
```

关键不是“调用了 queryOptions”，而是：

- 以后所有地方都引用 `todosQuery`  
- 不再手写 `['todos']`

② 读取数据: 

`useQuery(todosQuery)`
自动获得 data 类型。

③ 乐观更新 / 手动改缓存

```js
queryClient.setQueryData(  
  todosQuery.queryKey,  
  (old) => {  
    // old 已经是正确类型  
  }  
)
```

类型安全就来自这里的“复用”。

### 朴素的乐观更新和双层结构

没有任何数据管理库时，乐观更新其实就是：

> **先改本地状态 → 再发请求 → 失败就回滚**

1. 保存旧数据（用于回滚）  
2. 立即更新本地状态  
3. 发送请求  
4. 失败 → 恢复旧数据

在使用 Tanstack Query 的情况下，再使用本地状态复制数据，作为数据源，似乎既避开了并发乐观更新带来的冲突风险，也对类型安全有更好的保障

首先关于类型安全，queryoption 是一个新特性，而 setQueryData 的泛型或者类型约束是一个没有形成共识的事情，但是为状态设置类型是一个符合直觉的事情，也是有共识的操作，所以会降低类型安全的风险


其次关于并发更新的问题，前面的并发问题本质是：

```txt
多个异步操作 → 竞争写入 query cache
```

而本地 state：

```txt
组件私有 → 不参与 cache 写入竞争
```

所以自然不会被：

- refetch 覆盖
- invalidate 覆盖
- 其他 mutation 覆盖

从并发模型看，这是：**通过作用域隔离避免共享资源竞争**

方案 A：共享状态 + 冲突管理（TanStack 模型）

```txt
单一数据源
+ 取消请求
+ 控制 invalidate
+ 合并更新
```

优点：全局一致  
缺点：实现复杂

方案 B：状态隔离 + 最终同步（本地 state 模型）

```txt
每个组件局部状态
+ 最终提交服务器
+ 定期同步
```

优点：不会冲突  
缺点：一致性弱

### 双层结构的弊端

但代价是：你绕开了数据源

当你这样做：

```txt
query cache = 真实数据
local state = 乐观版本
```

系统变成：

```txt
两个真相来源（dual source of truth）
```

问题不是“会不会冲突”，而是：你必须定义它们的关系规则

例如谁覆盖谁？

- refetch 回来要不要覆盖 local？
- mutation 成功后怎么合并？
- 失败后怎么回退？

这些规则原本由 TanStack 负责，现在自己负责。

什么时候这种策略是合理的？当你要表达“用户意图”而不是“数据事实”

例如：

① 高交互 UI（临时意图比真实数据重要）

- 拖拽排序中间态
- 输入联想
- 批量编辑预览
- 本地过滤 / 排序

这些状态：
- 本质是 UI 逻辑  
- 不需要立即同步  
- 服务器只是最终确认者

这里用本地 state 隔离非常合理。

② 高频 mutation 且允许最终一致

比如点赞狂点场景：

```txt
用户快速 toggle
↓
本地 state 表示当前意图
↓
后台慢慢同步
```

这里目标是：UI 平滑 > 强一致
用本地 state 作为“缓冲层”是合理设计。

当你想表达“共享事实”，如果这个变化代表：

- 数据真的已经改变（预测成功）
- 其他组件应该看到
- cache 是真实来源

那用本地 state 只是“规避冲突”，不是解决问题。

因为：真实问题是并发写入策略，而不是存储位置。