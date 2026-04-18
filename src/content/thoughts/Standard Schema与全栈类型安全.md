---
date: 2026-03-31T14:20:00
---
## 关于校验

**1. 为什么要校验？（Runtime vs Compile-time）**

- **TS 类型（编译时）**：只在写代码时有效。一旦代码编译成 JS 运行在浏览器或服务器上，类型就消失了。
- **校验库（运行时）**：当用户通过表单输入一个字符串，或者从 API 传来一个 JSON 时，JS 引擎并不知道这个数据对不对。**校验库就是在程序运行的时候，测试一下这个数据的格式正确性。**

运行时校验的价值：

- **类型安全**：在 TS 中，从外部获取的数据初始类型通常是 `any` 或 `unknown`。运行时校验工具能起到 **Type Guard（类型守卫）** 的作用：**只要校验通过，TS 编译器就能 100% 确定这个变量的类型。**
- **错误数据拦截**：如果数据有问题，在“大门口”就报错。这避免了错误的数据进入系统深处，引发难以排查的隐蔽 Bug（比如把错误格式的数据存入了数据库）。
- **数据清洗**：运行时校验通常还带有“清洗”功能。
  - **转换：** 把字符串 `"18"` 自动转成数字 `18`。
  - **默认值：** 如果用户没传某个字段，自动补上默认值。
  - **去除冗余：** 过滤掉前端传来的多余、危险的字段。
- **错误信息自动生成**：运行时校验不仅知道数据错了，还知道**哪里错了**（比如：`path: ["users", 0, "email"]`, `message: "无效的邮箱格式"`）。这些信息可以直接展示给最终用户。

**2. 校验工作的三个步骤**

假设我们要校验一个“用户注册信息”：

第一步：定义 Schema  
你告诉校验库，一个合法的数据应该长什么样。

```typescript
// 就像在画一张图纸
const UserSchema = z.object({
  username: z.string().min(3), // 必须是字符串，最少3个字符
  age: z.number().int().positive(), // 必须是正整数
  email: z.string().email(), // 必须符合邮箱格式
});
```

第二步：执行校验（安检过程）

当你拿到一份来源不明的数据（比如前端传来的 `req.body`）时，校验库会开始逐一对比：

1. **结构检查**：这个对象里有 `username`、`age`、`email` 这三个键吗？有没有多余的脏数据？
2. **类型检查**：`age` 传的是不是数字？万一对方传了个 `"18"`（字符串）怎么办？
3. **约束检查**：`username` 够不够长？`email` 里面有没有 `@` 符号？

第三步：输出结果（放行或抓捕）

校验库通常会返回两种结果：

- **成功**：返回一份“干净”的数据（甚至可以帮你把 `"18"` 转换成数字 `18`）。
- **失败**：返回一份详细的“错误报告”（哪一行错了，错的原因是什么）。

**3. 校验库在内部具体做了什么？**

如果你自己写原生 JS 来实现校验，代码可能长这样（非常繁琐）：

```typescript
function validate(data) {
  if (typeof data !== 'object') throw '不是对象';
  if (typeof data.username !== 'string' || data.username.length < 3) {
    throw '用户名不合法';
  }
  if (typeof data.age !== 'number' || data.age <= 0) {
    throw '年龄必须是正数';
  }
  // ...以此类推
  return data;
}
```

**校验库（如 Zod）的本质，就是把上面这种枯燥、易错的 `if-else` 判断给封装成了一套优雅的“声明式”语法。**

## 为什么需要 Standard Schema？

回到你最初的问题。每个库（Zod、Valibot、Yup）内部实现校验的逻辑是不一样的：

- **Zod** 内部逻辑是：“我有一个 `parse` 方法，出错就直接 `throw` 异常。”
- **Valibot** 内部逻辑是：“我有一个 `safeParse`，我返回一个包含 `success` 属性的对象。”

**Standard Schema 的作用是：**

它不管你内部是怎么用 `if-else` 校验的，它强制要求所有库都在对象上贴一个**标准标签 `~standard`**。

这个标签里统一规定了：

1. 怎么接收输入数据。
2. 校验失败时，错误信息的格式必须长什么样（比如必须包含 `path` 和 `message`）。

**这样，像 Hono 这样的框架就不再需要写：**

- `if (isZod) { zod.parse() }`
- `if (isValibot) { valibot.parse() }`

**而是统一写：**

- `schema['~standard'].validate(data)`

这就实现了工具间的校验定义对象共享，而这能带来跨工具共享的校验规则能力。

让我们串联一个**真实的全栈场景**：

1. **数据库：** 你用 Drizzle 定义了一个 `User` 表。
2. **自动生成：** 你用 `drizzle-zod` 自动生成了一个 `InsertUserSchema`。
3. **后端校验：** 你把这个 Schema 传给 **Hono** 路由，用来校验注册请求。
4. **前端校验：** 你又把这个 Schema 传给前端 **React Hook Form**，用来做实时表单提示。

一系列工具可能有不同的校验工具依赖，甚至自己的校验语法。

**如果没有 Standard Schema：**

如果某天你发现 Zod 太大，想换成 Valibot。你需要：

- 更换 Drizzle 的生成插件。
- 更换 Hono 的校验中间件。
- 更换前端的 `resolver` 适配包。
- 重写所有的自定义校验逻辑。

**有了 Standard Schema：**

- 你只需要把定义 Schema 的那一两行代码改了（甚至如果你用的生成工具支持切换，连代码都不用改）。
- **Hono、tRPC、React Hook Form 所有的下游工具全部自动适配。**

**库与库的关系**：

1. **顶层：消费方 (Consumers / 上层库)**
   - **代表：** tRPC、Hono、React Hook Form、TanStack Form、Vercel AI SDK、LangChain。
   - **职责：** 它们负责“编排逻辑”。比如 Hono 负责处理 HTTP 请求，React Hook Form 负责管理表单状态。它们**需要**校验数据，但不关心里面的校验逻辑是怎么写的。
2. **中间层：协议方 (The Protocol / Standard Schema)**
   - **代表：** `~standard` 属性规范。
   - **职责：** 它是**翻译官**。它规定了顶层库如何向底层库发指令（“请帮我校验这个数据”），以及底层库如何回话（“这是校验结果”）。
3. **底层：供应方 (Producers / 校验库)**
   - **代表：** Zod、Valibot、ArkType。
   - **职责：** 它们是**苦力**。负责写具体的 `if-else` 判断，并把结果按照“协议方”要求的格式打包。

官方文档的描述：

本规范主要满足以下几个核心设计目标：

- **支持运行时校验：** 对于任何兼容 Standard Schema 的校验器，你都应该能够直接使用它来校验数据（这是显而易见的）。同时，所有的校验错误都必须以标准化的格式呈现。
- **支持静态类型推导：** 针对需要进行类型推导的 TypeScript 库，本规范提供了一种标准方式，方便它们“宣告”自己推导出的类型，从而让外部工具能够提取并使用这些类型。
- **保持极简：** 校验库实现该规范应该是轻而易举的，只需编写几行代码来调用其现有的函数或方法即可完成。
- **避免 API 冲突：** 整个规范都被收纳在一个名为 `~standard` 的单一对象属性中，这有效避免了与现有库已有 API 接口产生潜在的命名冲突。
- **不损害开发者体验 (DX)：** `~standard` 属性使用了波浪号（`~`）前缀，目的是在 IDE 的自动补全列表中降低其优先级。相比之下，如果使用下划线（`_`）前缀，该属性会排在所有字母数字命名的属性和方法之前，从而干扰正常开发。

## 全栈类型安全

在传统的开发模式中，前端和后端是通过 HTTP 协议连接的。HTTP 只传输字符串/字节流，它本身不带类型。

- **没有类型安全时：** 后端改了一个字段名（比如 `user_id` 改成 `userId`），前端并不知道。直到用户打开网页，程序报错崩溃，你才发现接口对不上。
- **全栈类型安全：** 当后端修改字段时，**前端代码会立即飘红报错**。你甚至不需要运行程序，编译器就会告诉你：“嘿，前端引用 `user_id` 的地方现在都失效了，快去改！”

改动数据库结构或公共接口时：

- **价值：** 它是你的安全网。如果你在数据库层重命名了一个字段，全栈类型安全会像推倒多米诺骨牌一样，自动追踪到后端 API、数据校验逻辑（Standard Schema 的用武之地）、再到前端的接口请求、最后到 UI 组件。
- **结果：** 只要你的 IDE 里没有红线，你就敢确信这次重构没有破坏现有的逻辑。

**全栈类型安全** 的本质是**将“错误发现的时间点”尽可能地提前**。

- 原本要在**生产环境**由用户发现的错，提前到了**测试环境**。
- 原本要在**测试环境**发现的错，提前到了**开发运行**时。
- 原本要在**运行**时发现的错，提前到了**写代码（编译）**的那一秒钟。

全栈类型安全带来了极致的自动补全体验。

- **场景：** 当你在前端调用一个 API 函数时，你敲下 `data.`，IDE 会自动弹出后端返回的所有字段。
- **价值：** 你不再需要反复翻阅 Swagger 文档，不再需要打开 Postman 测试接口返回了什么。**代码本身就是最新的文档**。这能节省大约 30%-50% 的联调时间。

## AI Era

AI 时代里，Zod 它不仅是一个校验库，更是连接 **大模型（LLM）的模糊推理** 与 **程序代码的精确执行** 之间的关键组件。

Zod 解决的核心问题：

1. **精确的参数定义与约束：** 通过 Zod 丰富的类型系统和 `.describe()`，为 Agent 提供更明确、更细致的工具参数规格和语义。
2. **结构化的错误信息与可恢复性：** Zod（配合自定义错误处理）使工具在失败时能提供包含错误代码和修正建议的结构化输出，让 Agent 能主动修复，而不是盲目重试。
3. **定义与实现的绑定，以及编译时安全性：** Zod 的 `betaZodTool` 或类似封装将工具的定义、描述、校验逻辑和实现代码紧密结合，并通过 TypeScript 类型推导，在编码阶段就捕捉大量潜在错误。

---

### 1. 参数模糊 vs 参数约束 (Input Schema Clarity)

- **差的做法（无 Zod）：**
  - `input_schema` 只是一个粗略的 JSON Schema 描述。
  - `post_id: { type: "string" }`，Agent 只知道它是个字符串，但不知道是“纯数字字符串，如 '12345678'”。
  - `content: { type: "string" }`，Agent 只知道是字符串，但不知道是 Markdown 格式。
  - **问题：** Agent 可能会传错格式的 ID（如 `"abc"`），或者传了不符合预期的内容，导致工具调用失败。
- **好的做法（使用 Zod）：**
  - `inputSchema: z.object({...})`
  - `post_id: z.string().describe("语雀文章 ID，纯数字字符串，如 '12345678'")`
    Zod 的 `describe` 方法和 `z.string()` 本身，为 Agent 提供了两层约束：
    1. **编译时约束**：如果 TypeScript 代码直接使用这个 schema，IDE 会知道 `post_id` 必须是字符串。
    2. **运行时约束（通过 Zod 校验）**：在 Agent 调用时，Zod 会根据 `z.string()` 强制要求是字符串。更进一步，`.describe()` 提供的自然语言描述，虽然主要给人看，但结合 Agent 的提示工程，也能辅助 Agent 理解。
  - `content_markdown: z.string().describe("Markdown 格式正文")`
  - **Zod 解决的问题：**
    - **精确的参数定义：** Zod 的类型系统（如 `z.string()`、`z.number()`、`.min()`、`.email()`、`.uuid()` 等）和 `.describe()` 提供了比普通 JSON Schema 更丰富的约束能力。
    - **结构化验证：** Agent 传递的数据会被 Zod 严格校验，而不是仅仅被“看一眼”。

---

### 2. 错误不可修正 vs 错误结构化建议 (Error Handling & Recoverability)

- **差的做法（无 Zod）：**
  - `return "Error: update failed";` 这是一个**模糊的字符串错误**。
  - **问题：** Agent 收到这个错误，只知道“失败了”，但完全不知道**为什么失败**，也不知道**怎么修复**。它只能盲目地重试，或者猜测可能的原因，导致 Agent 在循环中绕圈。
- **好的做法（Zod + `ToolError`）：**
  - `throw new ToolError("文章 ID 不存在", { error_code: "POST_NOT_FOUND", suggestion: "请先调用 list_yuque_posts 获取有效的 post_id" });`
  - **Zod 的 `run` 函数内的校验逻辑**：Zod 库本身在 `run` 方法里内置了对 `input` 的类型检查。如果 `input.post_id` 不是数字字符串，Zod 的内部校验会先抛出格式错误。
  - **自定义 `ToolError`**：文章示例中还引入了自定义的 `ToolError`，它携带了：
    1. **清晰的错误信息**（`"文章 ID 不存在"`）
    2. **结构化的错误代码**（`error_code: "POST_NOT_FOUND"`）
    3. **可执行的修正建议**（`suggestion: "请先调用 list_yuque_posts 获取有效的 post_id"`）
  - **Zod 解决的问题：**
    - **结构化错误：** Zod（配合自定义的 `ToolError`）将错误信息从简单的字符串变成了一个包含代码和建议的结构化对象。
    - **可恢复性：** Agent 收到这种结构化的错误后，能够**精确理解问题根源**，并根据 `suggestion` 来**主动执行修复动作**（比如先调用 `list_yuque_posts`）。这大大提升了 Agent 的自主性和成功率。

---

### 3. 定义实现分离 vs 定义实现绑定 (Definition & Implementation Binding)

- **差的做法（无 Zod）：**
  - `tool` 对象只定义了 `name` 和 `input_schema`。`run` 函数（工具的实现）是另外一个独立的 JS 函数，可能在别处被调用。
  - **问题：** 定义和实现是割裂的。`input_schema` 只是一个描述，它与实际的 `run` 函数内部的校验逻辑（如果有的话）是脱节的。Agent 只能根据 `input_schema` 选择工具，而无法知道 `run` 函数内部的细微约束或潜在失败场景。
- **好的做法（使用 `betaZodTool`）：**
  - `betaZodTool({ ... })` 将 `name`、`description`、`inputSchema`、`run` **打包在一起**。
  - **Zod 解决的问题：**
    - **定义即实现：** `inputSchema` 是 Zod 定义的对象，它**直接被 `run` 函数内部使用**（类型自动推导，并且可以在 `run` 内部主动调用 Zod 的校验方法，如示例中的 `throw new ToolError(...)`）。
    - **编译时安全性：** `run` 函数的 `input` 参数的类型，是根据 `inputSchema` **自动推导**出来的。这意味着任何对 `input` 属性的错误访问，都可以在编译阶段就被 TypeScript 发现。
    - **文档与代码统一：** Zod 的 schema 定义同时承担了**数据校验规则**、**TypeScript 类型推导**、**JSON Schema 生成**（用于 Agent 理解）和**工具描述**（通过 `.describe()`）的作用。

```typescript
// 定义和实现被“揉”在了一起
const updateTool = betaZodTool({
  // 定义
  name: "update_yuque_post",
  description: "更新语雀文章内容，不适合创建新文章",
  inputSchema: z.object({
    post_id: z
      .string()
      .describe("语雀文章 ID，纯数字字符串，如 '12345678'"),
    title: z.string().optional().describe("文章标题，不改时可省略"),
    content_markdown: z.string().describe("Markdown 格式正文"),
  }),

  // 实现
  run: async (input) => {
    // input 类型自动推导，问题尽量在编译期暴露
    const post = await getPost(input.post_id);
    if (!post)
      throw new ToolError("文章 ID 不存在", {
        error_code: "POST_NOT_FOUND",
        suggestion: "请先调用 list_yuque_posts 获取有效的 post_id",
      });
    return await updatePost(input.post_id, input.title, input.content_markdown);
  },
});
```
